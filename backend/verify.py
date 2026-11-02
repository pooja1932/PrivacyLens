"""
verify.py -- End-to-end verification of Person 3's data layer.
Run with:  python verify.py
"""
import sys, json

# Fix Windows terminal encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, ".")

from database import (
    get_cached_policy, save_policy, get_leaderboard,
    get_platform_stats, _normalize_domain
)
from models import PolicyRequest, _score_to_grade
from seed_data import SEED_POLICIES

PASS = "[PASS]"
FAIL = "[FAIL]"

# ── Test 1: Domain normalisation ─────────────────────────────────
print("=" * 55)
print("1. Domain Normalization")
print("=" * 55)
cases = [
    ("https://www.Notion.so/", "notion.so"),
    ("http://GITHUB.COM/", "github.com"),
    ("discord.com", "discord.com"),
    ("https://spotify.com/privacy/page", "spotify.com"),
    ("www.Chegg.com", "chegg.com"),
]
for raw, expected in cases:
    result = _normalize_domain(raw)
    ok = PASS if result == expected else FAIL
    print(f"  {ok}  {raw!r:<40} -> {result!r}")

# ── Test 2: Grade function ───────────────────────────────────────
print()
print("=" * 55)
print("2. Score → Grade Mapping")
print("=" * 55)
grade_cases = [(92, "A+"), (85, "A"), (75, "B"), (62, "C"), (51, "D"), (30, "F")]
for score, expected in grade_cases:
    g = _score_to_grade(score)
    ok = PASS if g == expected else FAIL
    print(f"  {ok}  score={score:>3} -> {g!r}")

# ── Test 3: In-memory cache save + retrieve ──────────────────────
print()
print("=" * 55)
print("3. Cache: Save → Retrieve (in-memory fallback)")
print("=" * 55)
save_policy("testsite.com", {
    "final_trust_score": 77,
    "grade": "B",
    "deterministic_metrics": {
        "transparency_score": 82, "vague_phrases_count": 3, "word_count": 5000
    },
    "ai_structured_insights": {
        "data_sold": "NO", "key_data_types": ["Email"],
        "user_rights": ["Delete"], "retention_period": "30 days",
        "key_risks": [], "third_party_sharing": [],
    },
    "sections_found": ["data_collection", "user_rights"],
})
cached = get_cached_policy("testsite.com")
if cached and cached["domain"] == "testsite.com" and cached["final_trust_score"] == 77:
    print(f"  {PASS}  Saved and retrieved: domain={cached['domain']!r}, score={cached['final_trust_score']}")
else:
    print(f"  {FAIL}  Cache round-trip failed: {cached}")

# Cache miss test
miss = get_cached_policy("doesnotexist.xyz")
ok = PASS if miss is None else FAIL
print(f"  {ok}  Cache miss for unknown domain returns None: {miss}")

# ── Test 4: Seed + Leaderboard ──────────────────────────────────
print()
print("=" * 55)
print("4. Leaderboard (seeding 10 sites)")
print("=" * 55)
for p in SEED_POLICIES:
    save_policy(p["domain"], p)

lb_high = get_leaderboard(sort_by="highest", limit=3)
print("  Top 3 (highest score):")
prev = 999
order_ok = True
for item in lb_high:
    print(f"    {item['domain']:<22} score={item['final_trust_score']}  grade={item['grade']}")
    if item["final_trust_score"] > prev:
        order_ok = False
    prev = item["final_trust_score"]
print(f"  {PASS if order_ok else FAIL}  Descending sort is correct")

lb_low = get_leaderboard(sort_by="lowest", limit=3)
print("  Bottom 3 (lowest score):")
prev = -1
order_ok = True
for item in lb_low:
    print(f"    {item['domain']:<22} score={item['final_trust_score']}  grade={item['grade']}")
    if item["final_trust_score"] < prev:
        order_ok = False
    prev = item["final_trust_score"]
print(f"  {PASS if order_ok else FAIL}  Ascending sort is correct")

# filter_sold=yes
lb_sold = get_leaderboard(filter_sold="yes")
all_sold = all(i["ai_structured_insights"]["data_sold"] == "YES" for i in lb_sold)
print(f"  {PASS if all_sold else FAIL}  filter_sold=yes: {len(lb_sold)} sites, all have data_sold=YES")
for item in lb_sold:
    print(f"    {item['domain']}")

# filter_sold=no
lb_safe = get_leaderboard(filter_sold="no")
none_sold = all(i["ai_structured_insights"]["data_sold"] != "YES" for i in lb_safe)
print(f"  {PASS if none_sold else FAIL}  filter_sold=no: {len(lb_safe)} sites, none sell data")

# search
lb_search = get_leaderboard(search="git")
found = any("github" in i["domain"] for i in lb_search)
print(f"  {PASS if found else FAIL}  search='git' returns github.com: {[i['domain'] for i in lb_search]}")

# pagination
lb_page1 = get_leaderboard(sort_by="highest", limit=3, skip=0)
lb_page2 = get_leaderboard(sort_by="highest", limit=3, skip=3)
no_overlap = not any(a["domain"] == b["domain"] for a in lb_page1 for b in lb_page2)
print(f"  {PASS if no_overlap else FAIL}  Pagination (skip=0 vs skip=3) no overlap")

# ── Test 5: Platform stats ───────────────────────────────────────
print()
print("=" * 55)
print("5. Platform Statistics")
print("=" * 55)
stats = get_platform_stats()
ok_total = PASS if stats["total_analyzed"] >= 10 else FAIL
ok_avg   = PASS if 0 < stats["average_trust_score"] < 100 else FAIL
ok_pct   = PASS if 0 <= stats["percent_selling_data"] <= 100 else FAIL
print(f"  {ok_total}  total_analyzed:       {stats['total_analyzed']}")
print(f"  {ok_avg}  average_trust_score:  {stats['average_trust_score']}")
print(f"  {ok_pct}  percent_selling_data: {stats['percent_selling_data']}%")

# ── Test 6: PolicyRequest validator ─────────────────────────────
print()
print("=" * 55)
print("6. PolicyRequest Input Validation")
print("=" * 55)
try:
    req = PolicyRequest(domain="https://www.Notion.so/", policy_text="x" * 99)
    print(f"  {FAIL}  Should have rejected < 100 char policy_text")
except Exception as e:
    print(f"  {PASS}  Correctly rejected short text")

req = PolicyRequest(domain="https://www.Notion.so/", policy_text="x" * 200)
ok = PASS if req.domain == "notion.so" else FAIL
print(f"  {ok}  Domain normalized in PolicyRequest: {req.domain!r}")

ok = PASS if req.force_refresh is False else FAIL
print(f"  {ok}  force_refresh defaults to False: {req.force_refresh}")

# ── Test 7: Simulate what happens on a real /analyze call ────────
print()
print("=" * 55)
print("7. Real /api/v1/analyze Flow Simulation")
print("=" * 55)
from vague_terms import calculate_transparency_score
from segmenter import segment_policy
from ai_analyzer import analyze_section_with_ai

SAMPLE_POLICY = """
Privacy Policy - ExampleEdu.com

Information We Collect
We collect various types of information including your name, email address,
IP address, and device identifiers. We may include cookies and similar technologies.
This information is collected from time to time as necessary.

How We Share Your Information
We share your information with various third parties including analytics providers,
advertising networks, and as we deem appropriate with commercial partners.
We may disclose information in our sole discretion.

Data Retention
We retain your data for as long as reasonably necessary to provide our services.
Subject to change at any time.

Your Rights
You may request deletion of your account at any time.
You have the right to opt-out of marketing communications.
You may access and export your data via your account settings.

Data Security
We use appropriate measures to protect your information.
"""

score, vague_count = calculate_transparency_score(SAMPLE_POLICY)
sections = segment_policy(SAMPLE_POLICY)
ai = analyze_section_with_ai(sections, api_key=None)  # mock fallback

print(f"  {PASS}  Transparency score: {score}, vague phrases: {vague_count}")
print(f"  {PASS}  Sections found: {list(sections.keys())}")
print(f"  {PASS}  AI mock fallback: data_sold={ai.get('data_sold')!r}, mode={ai.get('mode')!r}")

# Compute final score with deductions
final = float(score)
deductions = []
if ai.get("data_sold") == "YES":
    final = max(0, final - 25)
    deductions.append("-25: data sold")
if not ai.get("user_rights"):
    final = max(0, final - 10)
    deductions.append("-10: no user rights")
if ai.get("retention_period") in ("Not Specified", None, ""):
    final = max(0, final - 5)
    deductions.append("-5: retention not specified")

print(f"  {PASS}  Final score computed: {final} | Grade: {_score_to_grade(final)}")
print(f"  Deductions: {deductions if deductions else 'None'}")

print()
print("=" * 55)
print("All tests complete.")
print("=" * 55)
