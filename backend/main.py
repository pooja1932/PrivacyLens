"""
main.py — PrivacyLens FastAPI Backend
Integrates Person 2's NLP/AI pipeline with Person 3's MongoDB caching layer
and exposes leaderboard endpoints for the public web app.

Routes:
  GET  /                          — health check
  POST /analyze                   — legacy alias (backward compat with Extension)
  POST /api/v1/analyze            — cache-first analysis endpoint
  GET  /api/v1/leaderboard        — sorted, filtered domain list
  GET  /api/v1/domains/{domain}   — full report for a single domain
  GET  /api/v1/stats              — platform aggregate statistics
"""

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import spacy
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

# ── Person 2 modules ──────────────────────────────────────────────────────
from vague_terms import calculate_transparency_score
from segmenter import segment_policy
from ai_analyzer import analyze_section_with_ai

# ── Person 3 modules ──────────────────────────────────────────────────────
from database import (
    get_cached_policy,
    save_policy,
    get_leaderboard,
    get_platform_stats,
    close_connection,
    _normalize_domain,
)
from models import (
    PolicyRequest,
    AnalysisResponse,
    DeterministicMetrics,
    LeaderboardQuery,
    PlatformStats,
    _score_to_grade,
)

# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("privacylens.main")

nlp = spacy.load("en_core_web_sm")

app = FastAPI(
    title="PrivacyLens AI Backend",
    version="2.0.0",
    description=(
        "Hybrid Rule-Based NLP + Structured LLM pipeline for privacy policy analysis. "
        "All results are MongoDB-cached with a 30-day TTL to minimise token costs."
    ),
)

# ─────────────────────────────────────────────
# CORS — Allow Chrome Extension + Local Web App + Vercel deployment
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",         # Chrome Extension (any extension ID)
        "http://localhost:3000",         # React dev server (Create React App)
        "http://localhost:5173",         # Vite dev server
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        os.getenv("VERCEL_URL", ""),     # Production Vercel URL
        os.getenv("FRONTEND_URL", ""),   # Any custom deployed URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Startup / Shutdown lifecycle
# ─────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    logger.info("PrivacyLens backend starting up…")


@app.on_event("shutdown")
def on_shutdown():
    close_connection()
    logger.info("PrivacyLens backend shut down cleanly.")


# ─────────────────────────────────────────────
# INTERNAL: Core analysis logic (shared by both /analyze routes)
# ─────────────────────────────────────────────
def _run_analysis_pipeline(
    text: str,
    domain: str,
    api_key: Optional[str] = None,
    force_refresh: bool = False,
) -> dict:
    """
    1. Check MongoDB cache — return immediately if hit (and not force_refresh).
    2. Run Person 2's deterministic NLP layer.
    3. Run Person 2's AI structured extraction.
    4. Compute final trust score with deductions.
    5. Assign letter grade.
    6. Persist to MongoDB cache.
    7. Return full result.
    """
    clean_domain = _normalize_domain(domain)

    # ── Step 1: Cache lookup ─────────────────────────────────────────────
    if not force_refresh:
        cached = get_cached_policy(clean_domain)
        if cached:
            cached["cached"] = True
            return cached

    # ── Step 2: Deterministic NLP (Person 2) ────────────────────────────
    transparency_score, vague_count = calculate_transparency_score(text)
    segmented_data = segment_policy(text)

    # ── Step 3: AI Structured Extraction (Person 2) ─────────────────────
    ai_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    ai_insights = analyze_section_with_ai(segmented_data, api_key=ai_key)

    # ── Step 4: Trust score computation ─────────────────────────────────
    final_trust_score = float(transparency_score)
    deductions = []

    # Penalty: data sold to third parties
    if isinstance(ai_insights, dict) and ai_insights.get("data_sold") == "YES":
        final_trust_score = max(0.0, final_trust_score - 25.0)
        deductions.append("−25 pts: Data explicitly sold to third parties")

    # Penalty: no user rights described
    if isinstance(ai_insights, dict) and not ai_insights.get("user_rights"):
        final_trust_score = max(0.0, final_trust_score - 10.0)
        deductions.append("−10 pts: No user rights described")

    # Penalty: retention period unknown
    if isinstance(ai_insights, dict) and ai_insights.get("retention_period") in (
        "Not Specified", None, ""
    ):
        final_trust_score = max(0.0, final_trust_score - 5.0)
        deductions.append("−5 pts: Data retention period not specified")

    final_trust_score = round(final_trust_score, 1)

    # ── Step 5: Grade ────────────────────────────────────────────────────
    grade = _score_to_grade(final_trust_score)

    # ── Step 6: Build result document ────────────────────────────────────
    result = {
        "domain": clean_domain,
        "final_trust_score": final_trust_score,
        "grade": grade,
        "deterministic_metrics": {
            "transparency_score": transparency_score,
            "vague_phrases_count": vague_count,
            "word_count": len(text.split()),
        },
        "sections_found": list(segmented_data.keys()),
        "ai_structured_insights": ai_insights if isinstance(ai_insights, dict) else {},
        "score_deductions": deductions,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "cached": False,
    }

    # ── Step 7: Persist ──────────────────────────────────────────────────
    try:
        save_policy(clean_domain, result)
    except Exception as exc:
        logger.warning("Failed to persist analysis result: %s", exc)

    return result


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.get("/", tags=["Health"])
def read_root():
    return {
        "service": "PrivacyLens Backend Engine",
        "version": "2.0.0",
        "status": "online",
        "architecture": "Hybrid (Rule-Based NLP + Structured LLM) + MongoDB Cache",
        "docs": "/docs",
    }


# ── Legacy alias kept for Person 1's Extension (backward compat) ──────────

class _LegacyRequest(BaseModel):
    domain: Optional[str] = "unknown"
    policy_text: str

@app.post("/analyze", tags=["Legacy"], include_in_schema=True)
def analyze_legacy(
    request: _LegacyRequest,
    x_api_key: Optional[str] = Header(None),
):
    """
    Backward-compatible endpoint.  Person 1's extension can keep using this
    URL; it internally calls the full caching pipeline.
    """
    return _run_analysis_pipeline(
        text=request.policy_text,
        domain=request.domain or "unknown",
        api_key=x_api_key,
        force_refresh=False,
    )


# ── Versioned main analysis endpoint ─────────────────────────────────────

@app.post("/api/v1/analyze", tags=["Analysis"])
def analyze_policy_v1(
    request: PolicyRequest,
    x_api_key: Optional[str] = Header(None),
):
    """
    Cache-first privacy policy analysis endpoint.

    - Returns cached result (sub-50 ms) if domain was analysed in the last 30 days.
    - Set `force_refresh: true` in the request body to bypass the cache.
    - Pass your Gemini / OpenAI key via `X-Api-Key` header or set `GEMINI_API_KEY` env var.
    """
    return _run_analysis_pipeline(
        text=request.policy_text,
        domain=request.domain or "unknown",
        api_key=x_api_key,
        force_refresh=request.force_refresh,
    )


# ── Leaderboard endpoint ──────────────────────────────────────────────────

@app.get("/api/v1/leaderboard", tags=["Leaderboard"])
def leaderboard(
    sort_by: str = Query(default="highest", description="'highest' | 'lowest' | 'recent'"),
    filter_sold: str = Query(default="all", description="'all' | 'yes' | 'no'"),
    search: str = Query(default="", description="Domain substring filter"),
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
):
    """
    Returns a sorted, filtered list of analysed domains for the public leaderboard.
    Backed by MongoDB with fast index scans — no LLM calls triggered here.
    """
    try:
        results = get_leaderboard(
            sort_by=sort_by,
            filter_sold=filter_sold,
            search=search,
            limit=limit,
            skip=skip,
        )
        return {"count": len(results), "results": results}
    except Exception as exc:
        logger.error("Leaderboard query failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ── Single domain report ──────────────────────────────────────────────────

@app.get("/api/v1/domains/{domain}", tags=["Leaderboard"])
def get_domain_report(domain: str):
    """
    Returns the full cached analysis report for a specific domain.
    Used by the leaderboard detail modal and Chrome Extension deep-link.
    """
    clean_domain = _normalize_domain(domain)
    cached = get_cached_policy(clean_domain)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail=f"No cached analysis found for '{clean_domain}'. "
                   "Submit a POST /api/v1/analyze request first.",
        )
    cached["cached"] = True
    return cached


# ── Platform statistics ───────────────────────────────────────────────────

@app.get("/api/v1/stats", tags=["Leaderboard"])
def platform_stats():
    """
    Returns aggregate platform statistics for the leaderboard hero section:
    total domains analysed, average trust score, % of sites selling data.
    """
    try:
        return get_platform_stats()
    except Exception as exc:
        logger.error("Stats query failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
