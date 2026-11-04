# PrivacyLens Chrome Extension (Manifest V3)

> **Person 1 Domain Deliverable** | AI-Powered Privacy Policy Auditor & Real-time Trust Scorer

This folder contains the complete, production-grade Chrome Extension built with Chrome Manifest V3, adhering to high standards of code hygiene, explainable AI, and privacy-by-design principles.

---

## Architecture Overview

```
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
    └── storage.js             # chrome.storage.local wrapper with 24h domain TTL cache
```

---

## Key Features Built for Person 1

1. **Automatic Policy URL Discovery (`content/detector.js`)**:
   - Detects if the current webpage is an active privacy policy page.
   - If browsing a general website (e.g. `spotify.com` or `notion.so`), it scans the DOM footer and navigation links for canonical policy links (`/privacy`, `/legal/privacy-policy`) and alerts the user.

2. **Clean DOM Text Stripper (`content/extractor.js`)**:
   - Isolates the main legal content container (`<main>`, `<article>`, `.privacy-policy`).
   - Recursively eliminates boilerplate noise: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, cookie banners (`.cookie-banner`, `[id*="cookie"]`), modals, and social links.
   - Preserves semantic headings (`h1`–`h4`) as isolated single lines (`=== Heading ===`) under 100 characters, ensuring 100% regex matching compatibility with Person 2's `segmenter.py`.

3. **Client UI & Visual Trust Badge (`popup/`)**:
   - Clean, professional design: White, Black, and Emerald Green (`#059669`).
   - **Tactile micro-animations** on buttons (`:hover` lift, `:active` scale-97 tap effect).
   - **Zero Emojis**: Replaced entirely with crisp, scalable inline SVG icons.
   - **Zero Purple Gradients**: Replaced with clean high-contrast card structures.
   - Dynamic SVG circular trust score gauge (0–100) with color states (Green, Amber, Red).
   - Clear explainability breakdown: Reveals deterministic rule score vs. AI penalty deductions.

4. **API Gateway & Local Cache (`utils/api.js` & `utils/storage.js`)**:
   - Communicates directly with FastAPI `POST /analyze`.
   - Caches completed domain audits in `chrome.storage.local` with 24-hour expiration.
   - Includes a **Deterministic Mock Engine** for offline development if the backend is not running.

---

## How to Install & Load in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` folder in this repository:
   ```
   c:\Users\anvit\college\sem5\TAI\PrivacyLens\extension
   ```
5. The **PrivacyLens** extension icon will now appear in your browser toolbar. Pin it for quick access.

---

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

---

## Trustworthy AI Guarantees

- **Privacy-by-Design**: The extension collects zero personal telemetry, form inputs, session cookies, or user history. It only processes publicly accessible legal text.
- **Explainability**: Trust scores are accompanied by exact evidence quotes, vague phrase counts, and transparent mathematical deductions rather than opaque LLM labels.
