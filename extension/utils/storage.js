/**
 * PrivacyLens - Storage Utility
 * Manages domain caching and user settings via chrome.storage.local.
 * Built with graceful in-memory fallbacks for resilient operation.
 */

const CACHE_PREFIX = "pl_cache_";
const SETTINGS_KEY = "pl_settings";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

const DEFAULT_SETTINGS = {
  backendUrl: "http://localhost:8000",
  mockMode: false,
  autoDetect: true
};

// Fallback in-memory store for environments where chrome.storage is unavailable
const memoryFallback = new Map();

function isChromeStorageAvailable() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

export async function getCachedAnalysis(domain) {
  if (!domain) return null;
  const key = `${CACHE_PREFIX}${domain.toLowerCase()}`;

  try {
    let record = null;
    if (isChromeStorageAvailable()) {
      const res = await chrome.storage.local.get(key);
      record = res[key];
    } else {
      record = memoryFallback.get(key);
    }

    if (!record) return null;

    // Check TTL expiration
    const now = Date.now();
    if (record.expiresAt && now > record.expiresAt) {
      await clearCache(domain);
      return null;
    }

    return record.data;
  } catch (error) {
    console.warn("[PrivacyLens Storage] Failed to read cache for domain:", domain, error);
    return null;
  }
}

export async function saveAnalysis(domain, data, ttlMs = DEFAULT_TTL_MS) {
  if (!domain || !data) return;
  const key = `${CACHE_PREFIX}${domain.toLowerCase()}`;
  const record = {
    domain: domain.toLowerCase(),
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
    data
  };

  try {
    if (isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [key]: record });
    } else {
      memoryFallback.set(key, record);
    }
  } catch (error) {
    console.warn("[PrivacyLens Storage] Failed to write cache for domain:", domain, error);
  }
}

export async function clearCache(domain = null) {
  try {
    if (domain) {
      const key = `${CACHE_PREFIX}${domain.toLowerCase()}`;
      if (isChromeStorageAvailable()) {
        await chrome.storage.local.remove(key);
      } else {
        memoryFallback.delete(key);
      }
    } else {
      if (isChromeStorageAvailable()) {
        const all = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(all).filter((k) => k.startsWith(CACHE_PREFIX));
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
      } else {
        memoryFallback.clear();
      }
    }
  } catch (error) {
    console.warn("[PrivacyLens Storage] Failed to clear cache:", error);
  }
}

export async function getSettings() {
  try {
    if (isChromeStorageAvailable()) {
      const res = await chrome.storage.local.get(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] || {}) };
    } else {
      return { ...DEFAULT_SETTINGS, ...(memoryFallback.get(SETTINGS_KEY) || {}) };
    }
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    if (isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
    } else {
      memoryFallback.set(SETTINGS_KEY, merged);
    }
    return merged;
  } catch (error) {
    console.warn("[PrivacyLens Storage] Failed to save settings:", error);
    return DEFAULT_SETTINGS;
  }
}
