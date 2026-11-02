"""
database.py — Person 3 Domain
MongoDB Atlas client, connection pool, TTL index setup, and in-memory
fallback cache for offline / local development (no credentials needed).
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("privacylens.database")

# ─────────────────────────────────────────────
# 1.  In-memory fallback (used when MONGODB_URI is absent)
# ─────────────────────────────────────────────
_memory_cache: dict[str, dict] = {}

# ─────────────────────────────────────────────
# 2.  MongoDB client (lazy initialisation)
# ─────────────────────────────────────────────
_client = None
_db = None


def _get_db():
    """
    Returns the MongoDB database object.
    If MONGODB_URI is not set, returns None so the caller falls back
    to the in-memory cache — teammates are never blocked during local dev.
    """
    global _client, _db

    if _db is not None:
        return _db

    mongo_uri = os.getenv("MONGODB_URI", "")
    db_name = os.getenv("DB_NAME", "privacylens")

    if not mongo_uri:
        logger.warning(
            "MONGODB_URI is not set — using in-memory cache (offline mode)."
        )
        return None

    try:
        from pymongo import MongoClient, ASCENDING, DESCENDING

        _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        _client.admin.command("ping")           # validate connection
        _db = _client[db_name]

        _ensure_indexes(_db)
        logger.info("MongoDB connected → database: %s", db_name)
        return _db

    except Exception as exc:
        logger.error("MongoDB connection failed: %s — falling back to in-memory cache.", exc)
        return None


def _ensure_indexes(db):
    """
    Creates the required indexes on first connect (idempotent — safe to call repeatedly).

      • TTL index on `analyzed_at`  → documents auto-expire after 30 days
      • Unique index on `domain`    → prevents duplicate entries
      • Descending index on `final_trust_score` → fast leaderboard sort
    """
    from pymongo import ASCENDING, DESCENDING

    col = db["policies"]

    col.create_index(
        [("analyzed_at", ASCENDING)],
        expireAfterSeconds=2_592_000,   # 30 days
        name="ttl_analyzed_at",
        background=True,
    )
    col.create_index(
        [("domain", ASCENDING)],
        unique=True,
        name="unique_domain",
        background=True,
    )
    col.create_index(
        [("final_trust_score", DESCENDING)],
        name="idx_trust_score_desc",
        background=True,
    )
    logger.info("MongoDB indexes verified / created.")


# ─────────────────────────────────────────────
# 3.  Public cache helpers
# ─────────────────────────────────────────────

def get_cached_policy(domain: str) -> Optional[dict]:
    """
    Returns the cached analysis for `domain`, or None if not found / expired.
    Works with both MongoDB Atlas and the in-memory fallback.
    """
    db = _get_db()
    clean_domain = _normalize_domain(domain)

    if db is not None:
        doc = db["policies"].find_one({"domain": clean_domain})
        if doc:
            doc.pop("_id", None)        # strip BSON ObjectId
            logger.info("Cache HIT (MongoDB): %s", clean_domain)
            return doc
        logger.info("Cache MISS (MongoDB): %s", clean_domain)
        return None

    # ── in-memory fallback ──
    if clean_domain in _memory_cache:
        logger.info("Cache HIT (memory): %s", clean_domain)
        return _memory_cache[clean_domain]
    logger.info("Cache MISS (memory): %s", clean_domain)
    return None


def save_policy(domain: str, analysis_result: dict) -> dict:
    """
    Persists `analysis_result` to MongoDB (or in-memory cache).
    Adds `domain`, `analyzed_at`, and `cached=True` fields.
    Returns the saved document.
    """
    db = _get_db()
    clean_domain = _normalize_domain(domain)

    doc = {
        **analysis_result,
        "domain": clean_domain,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "cached": True,
    }

    if db is not None:
        db["policies"].update_one(
            {"domain": clean_domain},
            {"$set": doc},
            upsert=True,
        )
        logger.info("Saved to MongoDB: %s", clean_domain)
    else:
        _memory_cache[clean_domain] = doc
        logger.info("Saved to memory cache: %s", clean_domain)

    return doc


def get_leaderboard(
    sort_by: str = "highest",
    filter_sold: str = "all",
    search: str = "",
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    """
    Returns a sorted, filtered list of domains for the leaderboard.

    Args:
        sort_by:      "highest" | "lowest" | "recent"
        filter_sold:  "all" | "yes" | "no"
        search:       prefix substring to match on domain name
        limit:        max rows to return
        skip:         offset for pagination
    """
    db = _get_db()

    # ── Build query ──
    query: dict = {}
    if search:
        # case-insensitive prefix match
        query["domain"] = {"$regex": f"^{search.lower()}", "$options": "i"}
    if filter_sold == "yes":
        query["ai_structured_insights.data_sold"] = "YES"
    elif filter_sold == "no":
        query["ai_structured_insights.data_sold"] = {"$ne": "YES"}

    # ── Sort ──
    from pymongo import ASCENDING, DESCENDING

    sort_field = "final_trust_score"
    sort_dir = DESCENDING
    if sort_by == "lowest":
        sort_dir = ASCENDING
    elif sort_by == "recent":
        sort_field = "analyzed_at"
        sort_dir = DESCENDING

    if db is not None:
        cursor = (
            db["policies"]
            .find(query, {"_id": 0})
            .sort(sort_field, sort_dir)
            .skip(skip)
            .limit(limit)
        )
        return list(cursor)

    # ── in-memory fallback ──
    items = list(_memory_cache.values())
    if search:
        items = [i for i in items if search.lower() in i.get("domain", "")]
    if filter_sold == "yes":
        items = [i for i in items if i.get("ai_structured_insights", {}).get("data_sold") == "YES"]
    elif filter_sold == "no":
        items = [i for i in items if i.get("ai_structured_insights", {}).get("data_sold") != "YES"]

    reverse = sort_by != "lowest"
    if sort_by == "recent":
        items.sort(key=lambda x: x.get("analyzed_at", ""), reverse=True)
    else:
        items.sort(key=lambda x: x.get("final_trust_score", 0), reverse=reverse)

    return items[skip: skip + limit]


def get_platform_stats() -> dict:
    """
    Returns aggregate statistics for the hero section of the web app.
    """
    db = _get_db()

    if db is not None:
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "avg_score": {"$avg": "$final_trust_score"},
                    "sells_data": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$ai_structured_insights.data_sold", "YES"]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            }
        ]
        result = list(db["policies"].aggregate(pipeline))
        if result:
            r = result[0]
            total = r.get("total", 0)
            sells = r.get("sells_data", 0)
            return {
                "total_analyzed": total,
                "average_trust_score": round(r.get("avg_score", 0), 1),
                "percent_selling_data": round((sells / total * 100) if total else 0, 1),
            }
        return {"total_analyzed": 0, "average_trust_score": 0, "percent_selling_data": 0}

    # ── in-memory fallback ──
    items = list(_memory_cache.values())
    if not items:
        return {"total_analyzed": 0, "average_trust_score": 0, "percent_selling_data": 0}
    total = len(items)
    avg = sum(i.get("final_trust_score", 0) for i in items) / total
    sells = sum(
        1 for i in items
        if i.get("ai_structured_insights", {}).get("data_sold") == "YES"
    )
    return {
        "total_analyzed": total,
        "average_trust_score": round(avg, 1),
        "percent_selling_data": round(sells / total * 100, 1),
    }


def close_connection():
    """Gracefully closes the MongoDB client (call on app shutdown)."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed.")


# ─────────────────────────────────────────────
# 4.  Utility
# ─────────────────────────────────────────────

def _normalize_domain(domain: str) -> str:
    """
    Strips protocol & www prefix, lowercases.
    e.g. 'https://www.Notion.so/' → 'notion.so'
    """
    domain = domain.lower().strip()
    for prefix in ("https://", "http://", "www."):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    domain = domain.rstrip("/").split("/")[0]
    return domain
