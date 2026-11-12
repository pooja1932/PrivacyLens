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
extension/
├── manifest.json              # Chrome Manifest V3 configuration (strict least-privilege)
├── background/
│   └── service-worker.js      # Event-driven service worker for badges, state & tab events
├── content/
│   ├── detector.js            # Policy URL detector running at document_idle
│   └── extractor.js           # Clean DOM text stripper (removes ads, cookies, navs)
├── popup/
│   ├── popup.html             # High-contrast UI (White, Black, Emerald Green theme)
│   ├── popup.css              # Custom styling with tactile tap animations & zero emojis
│   └── popup.js               # State manager, circular SVG meter, and accordion views
├── icons/
│   ├── icon16.png             # Clean shield vector icons (16x16)
│   ├── icon48.png             # Clean shield vector icons (48x48)
│   └── icon128.png            # Clean shield vector icons (128x128)
└── utils/
    ├── api.js                 # API Gateway to FastAPI backend with mock fallback
    └── storage.js             # chrome.storage.local wrapper with 24h domain TTL cache├── web/                       # Leaderboard Web App & Database (Person 3 Domain)
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

## How to Install & Load in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` folder in this repository:
   ```
   c:\Users\anvit\college\sem5\TAI\PrivacyLens\extension
   ```
5. The **PrivacyLens** extension icon will now appear in your browser toolbar. Pin it for quick access.

## How to Test

### Scenario A: Testing with Local FastAPI Backend
1. Start the backend:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
2. Open any webpage in Chrome (e.g. `https://notion.so/privacy` or `https://discord.com/privacy`).
3. Click the PrivacyLens toolbar icon.
4. Click **Analyze Policy Now**. The extension extracts DOM text, sends it to `http://localhost:8000/analyze`, and renders the trust metrics.

### Scenario B: Testing in Offline / Mock Mode (Zero dependencies)
1. If the Python backend is offline, click the **Settings** gear icon in the extension popup header.
2. Toggle on **Enable Offline Simulation (Mock Mode)** and click **Save**.
3. Click **Analyze This Page**. The extension executes the client-side deterministic rule engine (using the exact vague phrase list from `vague_terms.py`) and renders the full UI without needing any local server.


## 🤝 Team Integration

- **Extension**: Send policy text via `POST /analyze` with body: `{"domain": "example.com", "policy_text": "..."}`.
- **Web/DB**: Extend `main.py` with MongoDB connections to cache domain scores.
