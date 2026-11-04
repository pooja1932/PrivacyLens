/**
 * PrivacyLens - Policy URL Detector (Content Script)
 * Scans active web pages for privacy policies, legal disclaimers, and canonical policy links.
 * Runs non-intrusively at document_idle.
 */

(() => {
  // Regex heuristics for detecting if current URL is a privacy policy
  const POLICY_URL_PATTERN = /(privacy[-_]?policy|privacy[-_]?notice|legal\/privacy|data[-_]?protection|data[-_]?privacy|terms[-_]?and[-_]?privacy)/i;

  // Regex heuristics for scanning anchor link targets and inner text
  const LINK_TEXT_PATTERN = /^(privacy\s*(policy|notice)?|data\s*protection|privacy|data\s*privacy)$/i;
  const LINK_HREF_PATTERN = /(privacy[-_]?policy|privacy[-_]?notice|\/privacy(\/|\.html|\.php)?|\/legal\/privacy)/i;

  function isCurrentPagePolicy() {
    const href = window.location.href;
    const pathname = window.location.pathname;

    // Check URL structure
    if (POLICY_URL_PATTERN.test(pathname) || POLICY_URL_PATTERN.test(href)) {
      return true;
    }

    // Check page title and primary headings
    const title = document.title || "";
    if (/privacy\s*policy/i.test(title)) {
      return true;
    }

    const h1 = document.querySelector("h1");
    if (h1 && /privacy\s*(policy|notice)/i.test(h1.innerText.trim())) {
      return true;
    }

    return false;
  }

  function findPolicyLink() {
    // 1. Prioritize footer and navigation regions
    const priorityContainers = document.querySelectorAll("footer, [role='contentinfo'], nav, #footer, .footer");
    for (const container of priorityContainers) {
      const links = container.querySelectorAll("a[href]");
      for (const link of links) {
        const text = link.innerText.trim();
        const href = link.getAttribute("href") || "";
        if (LINK_TEXT_PATTERN.test(text) || LINK_HREF_PATTERN.test(href)) {
          return normalizeLink(href);
        }
      }
    }

    // 2. Scan all anchor links across entire document
    const allLinks = document.querySelectorAll("a[href]");
    for (const link of allLinks) {
      const text = link.innerText.trim();
      const href = link.getAttribute("href") || "";
      const rel = link.getAttribute("rel") || "";

      if (rel.toLowerCase() === "privacy-policy") {
        return normalizeLink(href);
      }

      if (LINK_TEXT_PATTERN.test(text)) {
        return normalizeLink(href);
      }

      if (LINK_HREF_PATTERN.test(href) && text.length > 0 && text.length < 50) {
        return normalizeLink(href);
      }
    }

    return null;
  }

  function normalizeLink(href) {
    if (!href || href.startsWith("javascript:") || href.startsWith("#") || href.startsWith("mailto:")) {
      return null;
    }
    try {
      return new URL(href, window.location.origin).href;
    } catch {
      return null;
    }
  }

  function evaluatePage() {
    const isPolicy = isCurrentPagePolicy();
    const policyUrl = isPolicy ? window.location.href : findPolicyLink();
    const hostname = window.location.hostname.replace(/^www\./, "");

    const status = {
      isPolicyPage: isPolicy,
      detectedPolicyUrl: policyUrl,
      currentUrl: window.location.href,
      domain: hostname,
      pageTitle: document.title || hostname
    };

    // Notify background service worker
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: "PL_PAGE_STATUS_UPDATE",
          payload: status
        });
      }
    } catch {
      // Context might be invalidated during navigation
    }

    return status;
  }

  // Listen for direct queries from popup or background script
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "PL_GET_PAGE_STATUS") {
        const status = evaluatePage();
        sendResponse(status);
        return true;
      }
    });
  }

  // Initial scan
  evaluatePage();
})();
