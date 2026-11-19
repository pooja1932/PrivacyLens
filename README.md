# PrivacyLens
> **AI-Powered Privacy Policy Analyzer & Public Trust Leaderboard**

PrivacyLens is a Chrome Extension (Manifest V3) and Web Platform that audits website privacy policies in real time using a hybrid **Deterministic NLP + Structured LLM** pipeline—combining rule-based transparency scoring with Gemini AI structured risk extraction.

## Live Deployment

* **Public Leaderboard & Web Analyzer:** [https://privacy-lens-gamma.vercel.app](https://privacy-lens-gamma.vercel.app)
* **Backend API & Interactive Swagger Docs:** [https://privacylens-1-pwny.onrender.com/docs](https://privacylens-1-pwny.onrender.com/docs)

---

## How It Works (Hybrid Trust Pipeline)

Unlike black-box LLM summaries, PrivacyLens separates objective text metrics from semantic extraction:

1. **DOM Extraction & Segmentation (`detector.js`, `extractor.js`, `segmenter.py`):** Strips navigation, cookie banners, and ads, then segments the policy into standard legal sections (Data Collection, Third-Party Sharing, Retention, User Rights).
2. **Deterministic NLP Scoring (`vague_terms.py`):** Uses spaCy and a curated lexicon of ambiguous/hedging legal phrases (*"may share"*, *"from time to time"*, *"business partners"*) to compute an objective **Transparency Score (0–100)**.
3. **Structured AI Extraction (`ai_analyzer.py`):** Uses Gemini with strict JSON schema enforcement to extract data types collected, third-party sharing, retention periods, user rights, and whether user data is commercially sold (`YES` / `NO` / `UNCLEAR`).
4. **Explainable Final Trust Score:**
   text{Final Trust Score} = text{Transparency Score} - text{Data Sale Penalty (25 if Sold)}
5. **Caching & Leaderboard (`MongoDB Atlas`):** Results are cached in Chrome local storage (24h TTL) and persisted to MongoDB Atlas to power the live public leaderboard.

---

## Repository Structure

```text
PrivacyLens/
├── backend/                   # FastAPI + NLP + Gemini Engine
│   ├── main.py                # FastAPI routes, CORS, and MongoDB integration
│   ├── vague_terms.py         # Deterministic transparency & vague-phrase scorer
│   ├── segmenter.py           # Rule-based policy section segmenter
│   ├── ai_analyzer.py         # Structured JSON extractor using Gemini
│   └── requirements.txt       # Python dependencies
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # Least-privilege extension configuration
│   ├── background/
│   │   └── service-worker.js  # Badge updates, state & background policy fetching
│   ├── content/
│   │   ├── detector.js        # Auto-detects privacy policy pages & links
│   │   └── extractor.js       # Clean DOM text extractor
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   ├── popup.css          # High-contrast theme & animations
│   │   └── popup.js           # View state manager, score ring & accordions
│   ├── icons/                 # Extension icons (16x16, 48x48, 128x128)
│   └── utils/
│       ├── api.js             # Backend API client with offline mock fallback
│       └── storage.js         # chrome.storage.local wrapper & 24h domain cache
└── web/                       # React + Vite Leaderboard Web App
```

---

## Local Setup

### 1. Environment Variables

Create a `.env` file inside `backend/`:
```env
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:5173
```

Create a `.env` file inside `web/`:
```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend Setup (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```
The API will run at `http://localhost:8000` (Swagger UI at `http://localhost:8000/docs`).

### 3. Web Leaderboard Setup (React + Vite)

```bash
cd web
npm install
npm run dev
```
The web dashboard will run at `http://localhost:5173`.

### 4. Load the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` folder inside your cloned `PrivacyLens` directory.
5. Pin **PrivacyLens** to your Chrome toolbar. *(By default, it connects to the live production API; you can switch to `http://localhost:8000` or enable Mock Mode via the popup's Settings gear icon.)*

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check and service status |
| `POST` | `/analyze` | Analyze policy text (`{"domain": "example.com", "policy_text": "..."}`) |
| `GET` | `/api/v1/leaderboard` | Retrieve ranked domains and trust metrics (`?sort_by=highest&limit=50`) |
| `GET` | `/api/v1/stats` | Retrieve global aggregate stats (total policies, avg score, % selling data) |

---

## Testing Modes

* **Live / Local Mode:** Visit any privacy policy page (e.g., `https://discord.com/privacy` or `https://signal.org/legal/`), open the extension, and click **Analyze Policy Now**.
* **Offline / Mock Mode:** Open the extension's **Settings** gear icon, toggle on **Mock Mode**, and click **Save** to test the client-side deterministic scorer without any network calls.
