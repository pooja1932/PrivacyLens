"""
models.py — Person 3 Domain
Pydantic v2 schemas that define the API contract between:
  • Chrome Extension  →  FastAPI backend
  • FastAPI backend   →  MongoDB Atlas
  • FastAPI backend   →  Leaderboard Web App
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ─────────────────────────────────────────────
# 1.  Incoming request (from Extension / Web App)
# ─────────────────────────────────────────────

class PolicyRequest(BaseModel):
    domain: Optional[str] = Field(default="unknown", description="Domain name e.g. 'notion.so'")
    policy_text: str = Field(..., min_length=100, description="Raw privacy policy text")
    force_refresh: bool = Field(default=False, description="Bypass cache and re-analyse")

    @field_validator("domain", mode="before")
    @classmethod
    def strip_domain(cls, v: str) -> str:
        if not v:
            return "unknown"
        v = v.lower().strip()
        for prefix in ("https://", "http://", "www."):
            if v.startswith(prefix):
                v = v[len(prefix):]
        return v.rstrip("/").split("/")[0]


# ─────────────────────────────────────────────
# 2.  AI insights sub-model (from Person 2's pipeline)
# ─────────────────────────────────────────────

class AIInsights(BaseModel):
    data_sold: str = Field(default="UNCLEAR", description="'YES' | 'NO' | 'UNCLEAR'")
    key_data_types: list[str] = Field(default_factory=list)
    third_party_sharing: list[str] = Field(default_factory=list)
    retention_period: str = Field(default="Not Specified")
    key_risks: list[str] = Field(default_factory=list)
    user_rights: list[str] = Field(default_factory=list)
    mode: Optional[str] = None      # "mock_fallback" or None for real
    error: Optional[str] = None


# ─────────────────────────────────────────────
# 3.  Deterministic metrics sub-model (from Person 2's NLP layer)
# ─────────────────────────────────────────────

class DeterministicMetrics(BaseModel):
    transparency_score: float = Field(ge=0, le=100)
    vague_phrases_count: int = Field(ge=0)
    word_count: int = Field(ge=0)


# ─────────────────────────────────────────────
# 4.  Full analysis document (stored in MongoDB + returned by API)
# ─────────────────────────────────────────────

def _score_to_grade(score: float) -> str:
    if score >= 90:
        return "A+"
    elif score >= 80:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 60:
        return "C"
    elif score >= 50:
        return "D"
    return "F"


class AnalysisResponse(BaseModel):
    domain: str
    final_trust_score: float = Field(ge=0, le=100)
    grade: str = ""
    deterministic_metrics: DeterministicMetrics
    sections_found: list[str] = Field(default_factory=list)
    ai_structured_insights: dict = Field(default_factory=dict)
    analyzed_at: Optional[str] = None
    cached: bool = False

    def model_post_init(self, __context) -> None:
        if not self.grade:
            object.__setattr__(self, "grade", _score_to_grade(self.final_trust_score))


# ─────────────────────────────────────────────
# 5.  Leaderboard query parameters
# ─────────────────────────────────────────────

class LeaderboardQuery(BaseModel):
    sort_by: str = Field(
        default="highest",
        description="'highest' | 'lowest' | 'recent'",
    )
    filter_sold: str = Field(
        default="all",
        description="'all' | 'yes' | 'no'",
    )
    search: str = Field(default="", description="Domain prefix substring to filter by")
    limit: int = Field(default=50, ge=1, le=200)
    skip: int = Field(default=0, ge=0)

    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v: str) -> str:
        allowed = {"highest", "lowest", "recent"}
        if v not in allowed:
            raise ValueError(f"sort_by must be one of {allowed}")
        return v

    @field_validator("filter_sold")
    @classmethod
    def validate_filter_sold(cls, v: str) -> str:
        allowed = {"all", "yes", "no"}
        if v not in allowed:
            raise ValueError(f"filter_sold must be one of {allowed}")
        return v


# ─────────────────────────────────────────────
# 6.  Platform stats response
# ─────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_analyzed: int
    average_trust_score: float
    percent_selling_data: float
