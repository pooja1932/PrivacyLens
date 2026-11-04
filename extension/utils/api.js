/**
 * PrivacyLens - API Gateway Communicator
 * Direct interface to the FastAPI backend (main.py).
 * Encapsulates network timeouts, health checks, error formatting, and deterministic mock fallbacks.
 */

import { getSettings } from "./storage.js";

const DEFAULT_TIMEOUT_MS = 25000;

export async function checkBackendHealth(baseUrl = null) {
  const url = baseUrl || (await getSettings()).backendUrl;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${url}/`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, service: data.service || "PrivacyLens Engine", architecture: data.architecture };
    }
    return { online: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      online: false,
      error: error.name === "AbortError" ? "Connection timed out" : "Backend unreachable (Connection refused)"
    };
  }
}

export async function analyzePolicy(domain, policyText, options = {}) {
  const settings = await getSettings();
  const baseUrl = options.backendUrl || settings.backendUrl;

  // If Mock Mode is explicitly enabled in settings, use deterministic local simulation
  if (settings.mockMode || options.forceMock) {
    return generateMockAnalysis(domain, policyText);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.apiKey ? { "x-api-key": options.apiKey } : {})
      },
      body: JSON.stringify({
        domain: domain || "unknown",
        policy_text: policyText
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.detail || errorText;
      } catch {
        // Keep raw text
      }
      throw new Error(`Backend Error (${response.status}): ${parsedError}`);
    }

    const result = await response.json();
    return {
      ...result,
      _source: "live_backend"
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // If fetch failed due to network / offline server and fallback allowed, provide simulated result with warning
    if (options.allowFallbackOnFailure) {
      console.warn("[PrivacyLens API] Backend offline, falling back to local simulation:", error.message);
      const simulated = generateMockAnalysis(domain, policyText);
      simulated._source = "fallback_simulation";
      simulated._fallback_reason = error.message;
      return simulated;
    }

    const message =
      error.name === "AbortError"
        ? `Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. The document might be too long for the AI pipeline.`
        : `Could not connect to FastAPI at ${baseUrl}. Ensure the server is running with 'uvicorn main:app --reload' or switch to Mock Mode in settings. Details: ${error.message}`;

    throw new Error(message);
  }
}

/**
 * Deterministic local simulation of Person 2's backend pipeline.
 * Evaluates the exact vague terms from backend/vague_terms.py.
 */
function generateMockAnalysis(domain, text) {
  const VAGUE_TERMS = [
    "from time to time",
    "as we deem appropriate",
    "various third parties",
    "where necessary",
    "may include",
    "subject to change",
    "in our sole discretion",
    "appropriate measures",
    "reasonably necessary",
    "as described herein",
    "some information",
    "such as",
    "including but not limited to",
    "other similar technologies"
  ];

  const lower = (text || "").toLowerCase();
  const detectedVagueTerms = VAGUE_TERMS.filter((term) => lower.includes(term));
  const vagueCount = detectedVagueTerms.length;
  const transparencyScore = Math.max(0, 100 - vagueCount * 5);

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  // Segment detection matching backend/segmenter.py
  const sectionsFound = [];
  if (/(information\s+we\s+collect|data\s+we\s+collect|personal\s+data\s+collected|what\s+information)/i.test(text)) {
    sectionsFound.push("data_collection");
  }
  if (/(how\s+we\s+share|sharing\s+your\s+information|third[\s-]party\s+disclosure|disclosure\s+of\s+data|who\s+we\s+share)/i.test(text)) {
    sectionsFound.push("data_sharing");
  }
  if (/(data\s+retention|how\s+long\s+we\s+keep|retention\s+period|storing\s+your\s+data)/i.test(text)) {
    sectionsFound.push("data_retention");
  }
  if (/(your\s+rights|your\s+choices|managing\s+your\s+privacy|access\s+and\s+control|opt-out)/i.test(text)) {
    sectionsFound.push("user_rights");
  }
  if (/(data\s+security|how\s+we\s+protect|security\s+measures)/i.test(text)) {
    sectionsFound.push("security");
  }

  // AI Structured Insights heuristic mock
  const sellsData = /(sell\s+your\s+personal\s+information|monetize\s+data|commercial\s+sale)/i.test(text) &&
    !/(do\s+not\s+sell\s+your\s+personal\s+information|we\s+do\s+not\s+sell)/i.test(text);

  let finalTrustScore = transparencyScore;
  if (sellsData) {
    finalTrustScore = Math.max(0, finalTrustScore - 25);
  }

  return {
    domain: domain || "example.com",
    final_trust_score: finalTrustScore,
    deterministic_metrics: {
      transparency_score: transparencyScore,
      vague_phrases_count: vagueCount,
      vague_phrases_detected: detectedVagueTerms,
      word_count: wordCount
    },
    sections_found: sectionsFound.length > 0 ? sectionsFound : ["general"],
    ai_structured_insights: {
      data_sold: sellsData ? "YES" : "NO",
      key_data_types: [
        "Email & Contact Info",
        "IP Address & Device Telemetry",
        "Usage Analytics & Interactions"
      ],
      third_party_sharing: [
        "Analytics Providers",
        "Cloud Infrastructure Vendors",
        "Payment Processors"
      ],
      retention_period: "Retained for the duration of active service or as required by law",
      key_risks: [
        vagueCount > 5
          ? `Detected ${vagueCount} ambiguous contractual statements giving unilateral data rights`
          : "Standard telemetry collection with third-party cloud hosting",
        "Aggregated behavioral metadata may be used for product development"
      ],
      user_rights: [
        "Right to access personal data",
        "Right to request deletion / account closure",
        "Right to opt-out of marketing communications"
      ]
    },
    _source: "mock_simulation"
  };
}
