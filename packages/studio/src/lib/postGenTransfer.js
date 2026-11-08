/**
 * Cross-tab post-gen handoff (PostGenActions → Enhance / Video / Lipsync).
 * Shared by W1 (rail) and W3 (Enhancer). Do not invent a second client.
 */

import { sendAssetTo } from "./assetsStore.js";

export const POSTGEN_NAV_EVENT = "studio:navigate";
export const POSTGEN_STORAGE_KEY = "studio_postgen_payload";

/** Dedicated Enhance key used by PostGenActions (W1). */
export const ENHANCE_IMAGE_KEY = "muapi_enhance_image";

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read and consume a handoff payload from sessionStorage.
 * @param {{ matchTarget?: string, consume?: boolean }} [opts]
 */
export function readPostGenPayload({ matchTarget, consume = true } = {}) {
  if (typeof sessionStorage === "undefined") return null;

  const tryKey = (key) => {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = parseJson(raw);
    if (!parsed) {
      // Plain URL string
      if (typeof raw === "string" && raw.startsWith("http")) {
        if (consume) sessionStorage.removeItem(key);
        return { url: raw, imageUrl: raw, target: "enhance" };
      }
      return null;
    }
    if (matchTarget) {
      const target = parsed.target || parsed.tab;
      if (target && target !== matchTarget) return null;
    }
    if (consume) sessionStorage.removeItem(key);
    return parsed;
  };

  // Prefer generic payload, then enhance-specific key (W1)
  return tryKey(POSTGEN_STORAGE_KEY) || tryKey(ENHANCE_IMAGE_KEY);
}

/**
 * Persist handoff + ask StandaloneShell to open a tab.
 */
export function navigateWithPostGen(tabId, entry, mediaType = "image") {
  const asset = {
    ...entry,
    type: entry?.type || mediaType,
    url: entry?.url,
    refs: entry?.refs?.length ? entry.refs : entry?.url ? [entry.url] : [],
  };

  sendAssetTo(tabId, asset);

  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      POSTGEN_STORAGE_KEY,
      JSON.stringify({
        target: tabId,
        tab: tabId,
        url: asset.url,
        imageUrl: asset.url,
        asset,
        ts: Date.now(),
      }),
    );
  } catch {
    /* quota */
  }

  if (tabId === "enhance" && asset.url) {
    try {
      sessionStorage.setItem(
        ENHANCE_IMAGE_KEY,
        JSON.stringify({ imageUrl: asset.url, url: asset.url }),
      );
    } catch {
      /* quota */
    }
    window.dispatchEvent(
      new CustomEvent("muapi:send-to-enhance", {
        detail: { imageUrl: asset.url, url: asset.url },
      }),
    );
  }

  window.dispatchEvent(
    new CustomEvent(POSTGEN_NAV_EVENT, {
      detail: { tab: tabId, target: tabId, payload: { url: asset.url, imageUrl: asset.url, asset } },
    }),
  );
}
