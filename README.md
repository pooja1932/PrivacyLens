# PrivacyLens 🛡️
> AI-Powered Privacy Policy Analyzer & Leaderboard

PrivacyLens is a Chrome Extension and Web Platform that analyzes complex privacy policies on-the-fly using a hybrid **Deterministic NLP + Structured LLM** pipeline.

## 🚀 Repository Structure

```
PrivacyLens/
├── backend/                   # FastAPI Engine (Person 2 Domain)
│   ├── main.py                # FastAPI routes and endpoint controller
│   ├── vague_terms.py         # Deterministic transparency scorer
│   ├── segmenter.py           # Rule-based policy section segmenter
│   └── ai_analyzer.py         # Gemini/OpenAI structured JSON extractor
├── extension/                 # Chrome Extension Manifest V3 (Person 1 Domain)
├── web/                       # Leaderboard Web App & Database (Person 3 Domain)
└── PrivacyLens_2Week_Project_Plan.docx  # Project Roadmap
```

## 🛠️ Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   pip install fastapi uvicorn spacy pydantic python-dotenv google-generativeai
   python -m spacy download en_core_web_sm
   ```

2. **Run the API Server**:
   ```bash
   uvicorn main:app --reload
   ```

3. **Test the Endpoint**:
   Visit `http://localhost:8000/docs` to test the API directly via Swagger UI.

## 🤝 Team Integration

- **Extension**: Send policy text via `POST /analyze` with body: `{"domain": "example.com", "policy_text": "..."}`.
- **Web/DB**: Extend `main.py` with MongoDB connections to cache domain scores.
