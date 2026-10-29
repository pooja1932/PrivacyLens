from fastapi import FastAPI, Header
from pydantic import BaseModel
from typing import Optional
import spacy
from vague_terms import calculate_transparency_score
from segmenter import segment_policy
from ai_analyzer import analyze_section_with_ai

nlp = spacy.load("en_core_web_sm")

app = FastAPI(title="PrivacyLens AI Backend", version="1.0.0")

class PolicyRequest(BaseModel):
    domain: Optional[str] = "unknown"
    policy_text: str

@app.get("/")
def read_root():
    return {
        "service": "PrivacyLens Backend Engine",
        "status": "online",
        "architecture": "Hybrid (Rule-Based NLP + Structured LLM Extraction)"
    }

@app.post("/analyze")
def analyze_policy(request: PolicyRequest, x_api_key: Optional[str] = Header(None)):
    text = request.policy_text
    
    # 1. Deterministic Rule-Based Transparency Score
    transparency_score, vague_count = calculate_transparency_score(text)
    
    # 2. Rule-Based Section Segmentation
    segmented_data = segment_policy(text)
    
    # 3. AI Structured Extraction (Stage 2)
    ai_insights = analyze_section_with_ai(segmented_data, api_key=x_api_key)
    
    # Overall Final Trust Score Computation
    # Start with transparency score and penalize if data is sold according to AI
    final_trust_score = transparency_score
    if isinstance(ai_insights, dict) and ai_insights.get("data_sold") == "YES":
        final_trust_score = max(0, final_trust_score - 25)
    
    return {
        "domain": request.domain,
        "final_trust_score": final_trust_score,
        "deterministic_metrics": {
            "transparency_score": transparency_score,
            "vague_phrases_count": vague_count,
            "word_count": len(text.split())
        },
        "sections_found": list(segmented_data.keys()),
        "ai_structured_insights": ai_insights
    }
