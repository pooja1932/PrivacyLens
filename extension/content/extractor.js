/**
 * PrivacyLens - Clean DOM Text Stripper (Content Script)
 * Strips boilerplate HTML, cookie banners, navigation trees, and footers.
 * Preserves semantic headings and list structures for Person 2's regex Section Segmenter.
 */

(() => {
  function extractCleanText() {
    // 1. Locate main content region
    const contentSelectors = [
      "main",
      "article",
      "[role='main']",
      "[data-testid*='policy']",
      ".privacy-policy",
      ".legal-content",
      ".terms-content",
      "#content",
      "#main-content"
    ];

    let targetElement = null;
    for (const selector of contentSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim().length > 300) {
        targetElement = el;
        break;
      }
    }

    // Fallback: If no dedicated content container exists, use document.body
    if (!targetElement) {
      targetElement = document.body;
    }

    // 2. Clone in-memory to prevent mutating the live web page
    const clone = targetElement.cloneNode(true);

    // 3. Remove noise, non-text, navigation, and advertisement elements
    const noiseSelectors = [
      "script",
      "style",
      "nav",
      "header",
      "footer",
      "aside",
      "noscript",
      "svg",
      "iframe",
      "canvas",
      "video",
      "audio",
      "form",
      "button",
      "input",
      "select",
      "textarea",
      "dialog",
      "[aria-modal='true']",
      "[aria-hidden='true']",
      ".cookie-banner",
      ".cookie-consent",
      ".cookie-notice",
      "#cookie-banner",
      "#cookie-notice",
      ".advertisement",
      ".ad-banner",
      ".sidebar"
    ];

    clone.querySelectorAll(noiseSelectors.join(",")).forEach((node) => node.remove());

    // 4. Format headings as isolated, single-line elements (< 100 chars where possible)
    // Critical: Person 2's segmenter.py checks lines with len(clean_line) < 100 for section regexes!
    const headings = clone.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((heading) => {
      const headingText = heading.textContent.trim().replace(/\s+/g, " ");
      heading.textContent = `\n\n=== ${headingText} ===\n`;
    });

    // 5. Format paragraph blocks and list items with clear boundary linebreaks
    const blocks = clone.querySelectorAll("p, div, section, blockquote");
    blocks.forEach((block) => {
      block.insertAdjacentText("afterend", "\n");
    });

    const listItems = clone.querySelectorAll("li");
    listItems.forEach((li) => {
      const liText = li.textContent.trim().replace(/\s+/g, " ");
      li.textContent = `\n- ${liText}\n`;
    });

    // 6. Extract textual content
    const rawText = clone.innerText || clone.textContent || "";

    // 7. Normalize line breaks and whitespace
    const cleanLines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const normalizedText = cleanLines.join("\n");
    const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

    const hostname = window.location.hostname.replace(/^www\./, "");

    return {
      domain: hostname,
      url: window.location.href,
      pageTitle: document.title || hostname,
      policyText: normalizedText,
      wordCount: wordCount,
      characterCount: normalizedText.length,
      extractedAt: new Date().toISOString()
    };
  }

  // Support both direct script execution and runtime message listener
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "PL_EXTRACT_POLICY_TEXT") {
        try {
          const result = extractCleanText();
          sendResponse({ success: true, data: result });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }
    });
  }

  // Return payload when executed directly via chrome.scripting.executeScript
  return extractCleanText();
})();
