/**
 * PrivacyLens - Popup Controller
 * Manages view states, user interactions, DOM text extraction, and API communication.
 * Built with white/black/green aesthetics, tactile tap animations, and explainable Trustworthy AI metrics.
 */

import { getSettings, saveSettings, getCachedAnalysis, saveAnalysis, clearCache } from "../utils/storage.js";
import { checkBackendHealth, analyzePolicy } from "../utils/api.js";

// State
let currentTab = null;
let currentDomain = "unknown";
let currentUrl = "";
let currentDetectionState = null;
let lastAnalysisResult = null;

// DOM Elements
const elPageDomain = document.getElementById("page-domain");
const elPageUrl = document.getElementById("page-url");
const elPageBadge = document.getElementById("page-badge");
const elBackendPill = document.getElementById("backend-status-pill");
const elBackendText = document.getElementById("backend-status-text");

// Views
const viewInitial = document.getElementById("view-initial");
const viewLoading = document.getElementById("view-loading");
const viewError = document.getElementById("view-error");
const viewResult = document.getElementById("view-result");

// Settings Panel Elements
const btnToggleSettings = document.getElementById("btn-toggle-settings");
const panelSettings = document.getElementById("settings-panel");
const inputBackendUrl = document.getElementById("input-backend-url");
const checkMockMode = document.getElementById("check-mock-mode");
const btnSaveSettings = document.getElementById("btn-save-settings");
const btnTestConnection = document.getElementById("btn-test-connection");
const btnClearCache = document.getElementById("btn-clear-cache");
const elSettingsFeedback = document.getElementById("settings-feedback");

// Policy Alert Box
const boxPolicyAlert = document.getElementById("policy-alert");
const textPolicyAlertMsg = document.getElementById("policy-alert-msg");
const btnNavigatePolicy = document.getElementById("btn-navigate-policy");
const btnAnalyzeRemote = document.getElementById("btn-analyze-remote");

// Action Buttons
const btnAnalyzeCurrent = document.getElementById("btn-analyze-current");
const btnToggleManual = document.getElementById("btn-toggle-manual");
const containerManual = document.getElementById("manual-input-container");
const inputManualText = document.getElementById("manual-policy-text");
const btnAnalyzeManual = document.getElementById("btn-analyze-manual");

// Error View Actions
const elErrorMessage = document.getElementById("error-message-text");
const btnErrorRetry = document.getElementById("btn-error-retry");
const btnErrorMock = document.getElementById("btn-error-mock");

// Result Elements
const elScoreRing = document.getElementById("score-ring-indicator");
const elScoreNumber = document.getElementById("res-score-number");
const elScoreGrade = document.getElementById("res-score-grade");
const elScoreFormula = document.getElementById("res-formula-pill");
const elMetricTransparency = document.getElementById("res-metric-transparency");
const elMetricVague = document.getElementById("res-metric-vague");
const elMetricWords = document.getElementById("res-metric-words");
const elMetricSold = document.getElementById("res-metric-sold");

const elDataSoldBadge = document.getElementById("res-data-sold-badge");
const elRetentionText = document.getElementById("res-retention-text");
const elRisksList = document.getElementById("res-risks-list");
const elRightsList = document.getElementById("res-rights-list");
const elDatatypesChips = document.getElementById("res-datatypes-chips");
const elSharingChips = document.getElementById("res-sharing-chips");

const elRuleScore = document.getElementById("res-rule-score");
const elSectionsChips = document.getElementById("res-sections-chips");
const elVagueTermsChips = document.getElementById("res-vague-terms-chips");

// Footer Actions
const btnCopyReport = document.getElementById("btn-copy-report");
const btnViewLeaderboard = document.getElementById("btn-view-leaderboard");
const btnReanalyze = document.getElementById("btn-reanalyze");

// Loading Steps
const step1 = document.getElementById("step-1");
const step2 = document.getElementById("step-2");
const step3 = document.getElementById("step-3");

// Accordions
const accordionHeaders = document.querySelectorAll(".accordion-header");

/**
 * Initialize Popup
 */
async function init() {
  setupEventListeners();
  await loadSettingsToUI();
  await checkBackendStatus();
  await resolveActiveTab();
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  // Settings Drawer Toggle
  btnToggleSettings.addEventListener("click", () => {
    panelSettings.classList.toggle("hidden");
  });

  // Settings Actions
  btnSaveSettings.addEventListener("click", handleSaveSettings);
  btnTestConnection.addEventListener("click", handleTestConnection);
  btnClearCache.addEventListener("click", handleClearCache);

  // Analysis Triggers
  btnAnalyzeCurrent.addEventListener("click", () => runAnalysisOnCurrentTab());
  btnToggleManual.addEventListener("click", () => {
    containerManual.classList.toggle("hidden");
  });
  btnAnalyzeManual.addEventListener("click", handleManualAnalysis);

  // Policy Alert Actions
  btnNavigatePolicy.addEventListener("click", () => {
    if (currentDetectionState && currentDetectionState.detectedPolicyUrl) {
      chrome.tabs.update(currentTab.id, { url: currentDetectionState.detectedPolicyUrl });
      window.close();
    }
  });

  btnAnalyzeRemote.addEventListener("click", () => handleRemotePolicyAnalysis());

  // Error Actions
  btnErrorRetry.addEventListener("click", () => runAnalysisOnCurrentTab());
  btnErrorMock.addEventListener("click", () => runAnalysisOnCurrentTab({ forceMock: true }));

  // Results Actions
  btnCopyReport.addEventListener("click", handleCopyReport);
  btnViewLeaderboard.addEventListener("click", handleOpenLeaderboard);
  btnReanalyze.addEventListener("click", () => {
    if (currentDomain) {
      clearCache(currentDomain).then(() => {
        runAnalysisOnCurrentTab();
      });
    }
  });

  // Accordion Expand/Collapse
  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      item.classList.toggle("open");
    });
  });
}

/**
 * Resolve Active Browser Tab & Detection Status
 */
async function resolveActiveTab() {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    renderTabContext("example.com", "https://example.com/privacy", true);
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    currentTab = tabs[0];
    currentUrl = currentTab.url || "";

    if (currentUrl.startsWith("chrome://") || currentUrl.startsWith("edge://") || currentUrl.startsWith("about:")) {
      renderTabContext("Internal Page", currentUrl, false);
      btnAnalyzeCurrent.disabled = true;
      btnAnalyzeCurrent.classList.add("btn-secondary");
      btnAnalyzeCurrent.classList.remove("btn-primary");
      return;
    }

    try {
      const parsedUrl = new URL(currentUrl);
      currentDomain = parsedUrl.hostname.replace(/^www\./, "");
    } catch {
      currentDomain = "unknown";
    }

    // 1. Check if we already have cached analysis results for this domain
    const cached = await getCachedAnalysis(currentDomain);
    if (cached) {
      renderTabContext(currentDomain, currentUrl, true);
      renderResults(cached, true);
      return;
    }

    // 2. Query content script for page detection status
    try {
      chrome.tabs.sendMessage(currentTab.id, { type: "PL_GET_PAGE_STATUS" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script may not be loaded yet; use URL heuristics
          const isPolicy = /privacy/i.test(currentUrl);
          currentDetectionState = { isPolicyPage: isPolicy, detectedPolicyUrl: null };
          renderTabContext(currentDomain, currentUrl, isPolicy);
        } else {
          currentDetectionState = response;
          renderTabContext(currentDomain, currentUrl, response.isPolicyPage);

          if (!response.isPolicyPage && response.detectedPolicyUrl) {
            showPolicyFoundAlert(response.detectedPolicyUrl);
          }
        }
      });
    } catch {
      renderTabContext(currentDomain, currentUrl, /privacy/i.test(currentUrl));
    }
  } catch (err) {
    console.warn("[PrivacyLens] Tab resolution error:", err);
  }
}

/**
 * Update Header Context Card
 */
function renderTabContext(domain, url, isPolicy) {
  elPageDomain.textContent = domain;
  elPageUrl.textContent = url;

  if (isPolicy) {
    elPageBadge.textContent = "Policy Active";
    elPageBadge.className = "badge badge-success";
    btnAnalyzeCurrent.innerHTML = `
      <svg class="icon-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
      <span>Analyze Policy Now</span>
    `;
  } else {
    elPageBadge.textContent = "Webpage";
    elPageBadge.className = "badge badge-neutral";
  }
}

/**
 * Show Alert Box when a policy URL is discovered on a regular page
 */
function showPolicyFoundAlert(policyUrl) {
  boxPolicyAlert.classList.remove("hidden");
  textPolicyAlertMsg.textContent = `Found privacy policy link at: ${policyUrl}`;
}

/**
 * Check Backend API Health
 */
async function checkBackendStatus() {
  const settings = await getSettings();

  if (settings.mockMode) {
    elBackendPill.className = "status-pill status-mock";
    elBackendText.textContent = "Mock Mode";
    return;
  }

  elBackendPill.className = "status-pill status-checking";
  elBackendText.textContent = "Checking...";

  const health = await checkBackendHealth(settings.backendUrl);
  if (health.online) {
    elBackendPill.className = "status-pill status-online";
    elBackendText.textContent = "API Ready";
  } else {
    elBackendPill.className = "status-pill status-offline";
    elBackendText.textContent = "API Offline";
  }
}

/**
 * Settings Handlers
 */
async function loadSettingsToUI() {
  const settings = await getSettings();
  inputBackendUrl.value = settings.backendUrl;
  checkMockMode.checked = settings.mockMode;
}

async function handleSaveSettings() {
  const newBackend = inputBackendUrl.value.trim() || "http://localhost:8000";
  const mockMode = checkMockMode.checked;

  await saveSettings({ backendUrl: newBackend, mockMode });
  elSettingsFeedback.textContent = "Settings saved.";
  elSettingsFeedback.style.color = "var(--green-primary)";

  setTimeout(() => {
    panelSettings.classList.add("hidden");
    elSettingsFeedback.textContent = "";
  }, 900);

  checkBackendStatus();
}

async function handleTestConnection() {
  const url = inputBackendUrl.value.trim() || "http://localhost:8000";
  elSettingsFeedback.textContent = "Testing endpoint...";
  elSettingsFeedback.style.color = "var(--text-secondary)";

  const health = await checkBackendHealth(url);
  if (health.online) {
    elSettingsFeedback.textContent = `Connected! ${health.service || "Online"}`;
    elSettingsFeedback.style.color = "var(--green-primary)";
  } else {
    elSettingsFeedback.textContent = `Failed: ${health.error}`;
    elSettingsFeedback.style.color = "var(--red-primary)";
  }
}

async function handleClearCache() {
  await clearCache();
  elSettingsFeedback.textContent = "Local domain cache cleared.";
  elSettingsFeedback.style.color = "var(--green-primary)";
  setTimeout(() => {
    elSettingsFeedback.textContent = "";
  }, 1500);
}

/**
 * Run Analysis on Active Tab
 */
async function runAnalysisOnCurrentTab(options = {}) {
  switchView("loading");
  updateLoadingStep(1);

  try {
    if (!currentTab || !currentTab.id) {
      throw new Error("No active browser tab found to extract policy text from.");
    }

    // Step 1: Execute extractor in active tab
    let extractionResult = null;
    try {
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ["content/extractor.js"]
      });

      if (injectionResults && injectionResults[0] && injectionResults[0].result) {
        extractionResult = injectionResults[0].result;
      }
    } catch (injErr) {
      console.warn("[PrivacyLens] Direct script injection failed, trying runtime messaging:", injErr);
      // Fallback: try messaging content script
      extractionResult = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(currentTab.id, { type: "PL_EXTRACT_POLICY_TEXT" }, (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            reject(new Error("Could not extract page text. Ensure the page is fully loaded."));
          } else {
            resolve(res.data);
          }
        });
      });
    }

    if (!extractionResult || !extractionResult.policyText || extractionResult.policyText.length < 50) {
      throw new Error("Extracted policy content was too short or empty. Use 'Paste Custom Policy Text' for this page.");
    }

    // Step 2 & 3: Call API Gateway
    updateLoadingStep(2);
    setTimeout(() => updateLoadingStep(3), 600);

    const apiResult = await analyzePolicy(currentDomain, extractionResult.policyText, {
      ...options,
      allowFallbackOnFailure: true
    });

    // Save to local cache
    await saveAnalysis(currentDomain, apiResult);

    // Update Extension Badge Score
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: "PL_SET_BADGE_SCORE",
        tabId: currentTab.id,
        score: apiResult.final_trust_score
      });
    }

    renderResults(apiResult);
  } catch (error) {
    console.error("[PrivacyLens] Analysis Error:", error);
    showError(error.message);
  }
}

/**
 * Handle Remote Policy Analysis (Background fetch of detected policy URL)
 */
async function handleRemotePolicyAnalysis() {
  if (!currentDetectionState || !currentDetectionState.detectedPolicyUrl) return;

  switchView("loading");
  updateLoadingStep(1);

  const policyUrl = currentDetectionState.detectedPolicyUrl;

  try {
    // Request background service worker to fetch raw HTML
    const fetchResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "PL_FETCH_EXTERNAL_POLICY", url: policyUrl },
        (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            reject(new Error(res?.error || "Failed to download remote policy page."));
          } else {
            resolve(res.html);
          }
        }
      );
    });

    // Parse HTML in popup context
    const parser = new DOMParser();
    const doc = parser.parseFromString(fetchResponse, "text/html");

    // Clean noise
    const noise = doc.querySelectorAll("script, style, nav, footer, header, noscript, svg");
    noise.forEach((n) => n.remove());

    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((h) => {
      h.textContent = `\n\n=== ${h.textContent.trim()} ===\n`;
    });

    const cleanText = doc.body.innerText || doc.body.textContent || "";
    if (cleanText.length < 100) {
      throw new Error("Downloaded remote policy page contained insufficient text.");
    }

    updateLoadingStep(2);
    setTimeout(() => updateLoadingStep(3), 500);

    const apiResult = await analyzePolicy(currentDomain, cleanText, { allowFallbackOnFailure: true });
    await saveAnalysis(currentDomain, apiResult);

    renderResults(apiResult);
  } catch (error) {
    showError(`Remote policy analysis failed: ${error.message}`);
  }
}

/**
 * Manual Policy Input Analysis
 */
async function handleManualAnalysis() {
  const text = inputManualText.value.trim();
  if (!text || text.length < 80) {
    alert("Please paste a comprehensive privacy policy text (at least 80 characters).");
    return;
  }

  switchView("loading");
  updateLoadingStep(2);
  setTimeout(() => updateLoadingStep(3), 600);

  try {
    const apiResult = await analyzePolicy(currentDomain || "custom-audit", text, {
      allowFallbackOnFailure: true
    });
    renderResults(apiResult);
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Render Analysis Results into the Dashboard
 */
function renderResults(data, fromCache = false) {
  lastAnalysisResult = data;
  switchView("result");

  const score = Math.round(data.final_trust_score ?? 50);
  const metrics = data.deterministic_metrics || {};
  const insights = data.ai_structured_insights || {};

  // Animate Score Ring: circumference = 2 * PI * 42 ~= 264
  const circumference = 264;
  const offset = circumference - (circumference * (score / 100));
  elScoreRing.style.strokeDashoffset = offset;

  // Score Color Grading
  let color = "var(--green-primary)";
  let gradeText = "High Transparency";
  if (score < 50) {
    color = "var(--red-primary)";
    gradeText = "Significant Risk";
  } else if (score < 75) {
    color = "var(--amber-primary)";
    gradeText = "Moderate Privacy";
  }

  elScoreRing.style.stroke = color;
  elScoreNumber.textContent = score;
  elScoreNumber.style.color = color;
  elScoreGrade.textContent = gradeText;

  // Formula Explainer
  const transScore = metrics.transparency_score ?? score;
  const soldPenalty = insights.data_sold === "YES" ? 25 : 0;
  elScoreFormula.textContent = `Transparency (${transScore}) - Penalty (${soldPenalty}) = ${score}`;

  // Metrics Grid
  elMetricTransparency.textContent = `${transScore}%`;
  elMetricVague.textContent = metrics.vague_phrases_count ?? 0;
  elMetricWords.textContent = (metrics.word_count ?? 0).toLocaleString();

  const dataSold = (insights.data_sold || "UNCLEAR").toUpperCase();
  elMetricSold.textContent = dataSold;
  if (dataSold === "YES") {
    elMetricSold.style.color = "var(--red-primary)";
    elDataSoldBadge.className = "badge badge-danger";
    elDataSoldBadge.textContent = "Data Is Sold / Shared";
  } else if (dataSold === "NO") {
    elMetricSold.style.color = "var(--green-primary)";
    elDataSoldBadge.className = "badge badge-success";
    elDataSoldBadge.textContent = "No Commercial Sale";
  } else {
    elMetricSold.style.color = "var(--text-secondary)";
    elDataSoldBadge.className = "badge badge-neutral";
    elDataSoldBadge.textContent = "Unclear / Ambiguous";
  }

  // Retention Period
  elRetentionText.textContent = insights.retention_period || "Not Specified in Policy";

  // Key Risks List
  renderList(elRisksList, insights.key_risks, "No critical risks identified.", "danger");

  // User Rights List
  renderList(elRightsList, insights.user_rights, "Standard legal rights apply.", "success");

  // Chips: Data Types
  renderChips(elDatatypesChips, insights.key_data_types, "None specified");

  // Chips: Third Parties
  renderChips(elSharingChips, insights.third_party_sharing, "None specified");

  // Deterministic NLP Tab Data
  elRuleScore.textContent = `${transScore} / 100`;
  renderChips(elSectionsChips, data.sections_found, "general");

  const detectedVague = metrics.vague_phrases_detected || [];
  renderChips(elVagueTermsChips, detectedVague, "None detected");
}

function renderList(container, items, emptyText, type = "neutral") {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    container.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderChips(container, items, emptyText) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const span = document.createElement("span");
    span.className = "chip chip-muted";
    span.textContent = emptyText;
    container.appendChild(span);
    return;
  }

  items.forEach((item) => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = item;
    container.appendChild(span);
  });
}

/**
 * Copy Report Summary to Clipboard
 */
function handleCopyReport() {
  if (!lastAnalysisResult) return;

  const d = lastAnalysisResult;
  const insights = d.ai_structured_insights || {};
  const metrics = d.deterministic_metrics || {};

  const summary = `PrivacyLens Audit Report
Domain: ${d.domain}
Trust Score: ${d.final_trust_score}/100
Transparency Score: ${metrics.transparency_score}%
Data Sold: ${insights.data_sold || "UNCLEAR"}
Retention: ${insights.retention_period || "Not Specified"}

Key Risks:
${(insights.key_risks || []).map((r) => `- ${r}`).join("\n")}

User Rights:
${(insights.user_rights || []).map((u) => `- ${u}`).join("\n")}

Audited with PrivacyLens (Hybrid Rule-Based NLP + Structured LLM)`.trim();

  navigator.clipboard.writeText(summary).then(() => {
    const originalText = btnCopyReport.querySelector("span").textContent;
    btnCopyReport.querySelector("span").textContent = "Copied!";
    setTimeout(() => {
      btnCopyReport.querySelector("span").textContent = originalText;
    }, 1500);
  });
}

/**
 * Open Public Leaderboard (Person 3 Web App Integration)
 */
function handleOpenLeaderboard() {
  const domain = currentDomain || "";
  // Default to Person 3's local web app port or production Vercel URL
  const leaderboardUrl = `http://localhost:3000/?domain=${encodeURIComponent(domain)}`;
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.create({ url: leaderboardUrl });
  } else {
    window.open(leaderboardUrl, "_blank");
  }
}

/**
 * Loading Steps Progress Indicator
 */
function updateLoadingStep(stepNumber) {
  [step1, step2, step3].forEach((el, index) => {
    el.classList.remove("step-active", "step-done");
    if (index + 1 < stepNumber) {
      el.classList.add("step-done");
    } else if (index + 1 === stepNumber) {
      el.classList.add("step-active");
    }
  });
}

/**
 * Switch View
 */
function switchView(viewName) {
  viewInitial.classList.add("hidden");
  viewLoading.classList.add("hidden");
  viewError.classList.add("hidden");
  viewResult.classList.add("hidden");

  if (viewName === "initial") viewInitial.classList.remove("hidden");
  else if (viewName === "loading") viewLoading.classList.remove("hidden");
  else if (viewName === "error") viewError.classList.remove("hidden");
  else if (viewName === "result") viewResult.classList.remove("hidden");
}

function showError(msg) {
  switchView("error");
  elErrorMessage.textContent = msg;
}

// Kickoff
document.addEventListener("DOMContentLoaded", init);
