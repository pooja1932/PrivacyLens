/**
 * PrivacyLens - Background Service Worker (Manifest V3)
 * Manages tab state, extension action badges, and inter-script messaging.
 */

const tabStateMap = new Map();

// Helper to safely set badge text and color
function updateBadge(tabId, text, backgroundColor) {
  if (typeof chrome === "undefined" || !chrome.action) return;

  chrome.action.setBadgeText({ tabId, text: text || "" });
  if (backgroundColor) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: backgroundColor });
  }
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  if (message.type === "PL_PAGE_STATUS_UPDATE") {
    if (tabId) {
      tabStateMap.set(tabId, message.payload);

      if (message.payload.isPolicyPage) {
        updateBadge(tabId, "ON", "#059669"); // Emerald Green for active policy
      } else if (message.payload.detectedPolicyUrl) {
        updateBadge(tabId, "FIND", "#111827"); // Slate for detected link
      } else {
        updateBadge(tabId, "", "");
      }
    }
    sendResponse({ received: true });
    return true;
  }

  if (message.type === "PL_GET_TAB_STATE") {
    const targetTabId = message.tabId || tabId;
    const state = tabStateMap.get(targetTabId) || null;
    sendResponse({ state });
    return true;
  }

  if (message.type === "PL_SET_BADGE_SCORE") {
    const score = message.score;
    const targetTabId = message.tabId;
    if (targetTabId && typeof score === "number") {
      let color = "#059669"; // Green
      if (score < 50) color = "#DC2626"; // Red
      else if (score < 75) color = "#D97706"; // Amber

      updateBadge(targetTabId, `${score}`, color);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "PL_FETCH_EXTERNAL_POLICY") {
    // Background fetch for when user wants to analyze a found policy link without navigating to it
    const url = message.url;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.text();
      })
      .then((html) => {
        sendResponse({ success: true, html });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

// Clean up state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStateMap.delete(tabId);
});
