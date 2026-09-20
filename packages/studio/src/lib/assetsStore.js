/**
 * Unified Assets / history store (IndexedDB).
 * Single source of truth for generated media + remix metadata.
 *
 * Asset shape:
 * {
 *   id, type: 'image'|'video'|'audio',
 *   url, thumbnailUrl?,
 *   prompt?, model?, aspect_ratio?, seed?, refs?, duration?,
 *   studio?, createdAt, meta?
 * }
 */

const DB_NAME = "hf_assets";
const DB_VERSION = 1;
const STORE_ASSETS = "assets";
const STORE_MOODBOARD = "moodboard";
const STORE_ELEMENTS = "elements";
const STORE_META = "meta";

const MIGRATION_FLAG = "hf_assets_migrated_v1";
const SEND_TO_STORAGE_KEY = "hf_send_to_payload";
export const SEND_TO_EVENT = "hf:send-to";

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

/** @type {Promise<{migrated:number,skipped:boolean}>|null} */
let migrationPromise = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb() {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error("Failed to open assets DB"));
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        const assets = db.createObjectStore(STORE_ASSETS, { keyPath: "id" });
        assets.createIndex("type", "type", { unique: false });
        assets.createIndex("createdAt", "createdAt", { unique: false });
        assets.createIndex("studio", "studio", { unique: false });
        assets.createIndex("url", "url", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_MOODBOARD)) {
        db.createObjectStore(STORE_MOODBOARD, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_ELEMENTS)) {
        const els = db.createObjectStore(STORE_ELEMENTS, { keyPath: "id" });
        els.createIndex("kind", "kind", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });

  return dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function isQuotaError(err) {
  if (!err) return false;
  const name = err.name || "";
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(String(err.message || ""))
  );
}

function newId(prefix = "asset") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Normalize a generation / history entry into a stored asset.
 * @param {object} partial
 */
export function normalizeAsset(partial = {}) {
  const type = partial.type || inferType(partial);
  const createdAt =
    partial.createdAt ||
    partial.timestamp ||
    new Date().toISOString();
  const refs = Array.isArray(partial.refs)
    ? partial.refs.filter(Boolean)
    : partial.images_list ||
      (partial.image_url ? [partial.image_url] : undefined);

  return {
    id: String(partial.id || newId()),
    type,
    url: partial.url || "",
    thumbnailUrl:
      partial.thumbnailUrl ||
      (type === "image" ? partial.url : partial.thumbnailUrl) ||
      null,
    prompt: partial.prompt || "",
    model: partial.model || partial.selectedModel || "",
    aspect_ratio: partial.aspect_ratio || partial.aspectRatio || "",
    seed: partial.seed ?? null,
    refs: refs || [],
    duration: partial.duration ?? null,
    studio: partial.studio || null,
    createdAt,
    meta: partial.meta || {},
  };
}

function inferType(entry) {
  if (entry?.type) return entry.type;
  const url = String(entry?.url || "");
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || /video/i.test(url)) return "video";
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url) || /audio/i.test(url))
    return "audio";
  return "image";
}

/**
 * Remix-ready history metadata extracted from an asset.
 */
export function toHistoryMeta(asset) {
  if (!asset) return null;
  return {
    prompt: asset.prompt || "",
    model: asset.model || "",
    seed: asset.seed ?? null,
    refs: Array.isArray(asset.refs) ? [...asset.refs] : [],
    aspect_ratio: asset.aspect_ratio || "",
    type: asset.type,
    url: asset.url,
    id: asset.id,
  };
}

/** @param {object} asset */
export async function saveAsset(asset) {
  const record = normalizeAsset(asset);
  if (!record.url) {
    throw new Error("saveAsset requires a url");
  }

  try {
    await migrateFromLocalStorageOnce();
    const db = await openDb();
    const tx = db.transaction(STORE_ASSETS, "readwrite");
    tx.objectStore(STORE_ASSETS).put(record);
    await txDone(tx);
    return record;
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn(
        "[assetsStore] Quota exceeded — trimming oldest assets and retrying",
      );
      await trimOldestAssets(40);
      try {
        const db = await openDb();
        const tx = db.transaction(STORE_ASSETS, "readwrite");
        tx.objectStore(STORE_ASSETS).put(record);
        await txDone(tx);
        return record;
      } catch (retryErr) {
        console.error("[assetsStore] save failed after trim:", retryErr);
        throw retryErr;
      }
    }
    console.error("[assetsStore] saveAsset failed:", err);
    throw err;
  }
}

/**
 * Convenience: persist a studio generation with remix meta.
 */
export async function saveGeneration({
  url,
  type = "image",
  prompt = "",
  model = "",
  aspect_ratio = "",
  seed = null,
  refs = [],
  duration = null,
  studio = null,
  id = null,
  meta = {},
}) {
  return saveAsset({
    id: id || newId(type),
    type,
    url,
    prompt,
    model,
    aspect_ratio,
    seed,
    refs,
    duration,
    studio,
    createdAt: new Date().toISOString(),
    meta,
  });
}

export async function getAsset(id) {
  await migrateFromLocalStorageOnce();
  const db = await openDb();
  const tx = db.transaction(STORE_ASSETS, "readonly");
  return requestToPromise(tx.objectStore(STORE_ASSETS).get(id));
}

/**
 * @param {{ type?: string, studio?: string, limit?: number }=} opts
 */
export async function listAssets(opts = {}) {
  await migrateFromLocalStorageOnce();
  const { type, studio, limit = 200 } = opts;
  const db = await openDb();
  const tx = db.transaction(STORE_ASSETS, "readonly");
  const store = tx.objectStore(STORE_ASSETS);
  /** @type {object[]} */
  let rows;

  if (type) {
    rows = await requestToPromise(store.index("type").getAll(type));
  } else if (studio) {
    rows = await requestToPromise(store.index("studio").getAll(studio));
  } else {
    rows = await requestToPromise(store.getAll());
  }

  rows.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
  return rows.slice(0, limit);
}

export async function deleteAsset(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_ASSETS, "readwrite");
  tx.objectStore(STORE_ASSETS).delete(id);
  await txDone(tx);
}

export async function clearAssets() {
  const db = await openDb();
  const tx = db.transaction(STORE_ASSETS, "readwrite");
  tx.objectStore(STORE_ASSETS).clear();
  await txDone(tx);
}

async function trimOldestAssets(keep = 50) {
  const all = await listAssets({ limit: 10_000 });
  if (all.length <= keep) return;
  const toDelete = all.slice(keep);
  const db = await openDb();
  const tx = db.transaction(STORE_ASSETS, "readwrite");
  const store = tx.objectStore(STORE_ASSETS);
  for (const row of toDelete) store.delete(row.id);
  await txDone(tx);
}

async function getMeta(key) {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_META, "readonly");
    const row = await requestToPromise(tx.objectStore(STORE_META).get(key));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setMeta(key, value) {
  const db = await openDb();
  const tx = db.transaction(STORE_META, "readwrite");
  tx.objectStore(STORE_META).put({ key, value });
  await txDone(tx);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * One-shot migration from legacy localStorage history keys.
 */
export async function migrateFromLocalStorageOnce() {
  if (!isBrowser()) return { migrated: 0, skipped: true };
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const done = await getMeta(MIGRATION_FLAG);
      if (done) return { migrated: 0, skipped: true };
    } catch {
      // DB may not exist yet — continue
    }

    /** @type {object[]} */
    const candidates = [];

    const legacy = readJson("muapi_history", []);
    if (Array.isArray(legacy)) {
      for (const item of legacy) {
        if (item?.url) {
          candidates.push(
            normalizeAsset({
              ...item,
              type: item.type || "image",
              studio: item.studio || "image",
            }),
          );
        }
      }
    }

    const imagePersist = readJson("hg_image_studio_persistent", null);
    if (Array.isArray(imagePersist?.localHistory)) {
      for (const item of imagePersist.localHistory) {
        if (item?.url) {
          candidates.push(
            normalizeAsset({
              ...item,
              type: "image",
              studio: "image",
            }),
          );
        }
      }
    }

    const videoPersist = readJson("hg_video_studio_persistent", null);
    if (Array.isArray(videoPersist?.localHistory)) {
      for (const item of videoPersist.localHistory) {
        if (item?.url) {
          candidates.push(
            normalizeAsset({
              ...item,
              type: "video",
              studio: "video",
            }),
          );
        }
      }
    }

    // Dedupe by url (prefer richer / newer)
    const byUrl = new Map();
    for (const asset of candidates) {
      const prev = byUrl.get(asset.url);
      if (!prev) {
        byUrl.set(asset.url, asset);
        continue;
      }
      const newer =
        new Date(asset.createdAt).getTime() >= new Date(prev.createdAt).getTime()
          ? asset
          : prev;
      byUrl.set(asset.url, {
        ...prev,
        ...newer,
        id: prev.id || newer.id,
        refs: newer.refs?.length ? newer.refs : prev.refs,
        prompt: newer.prompt || prev.prompt,
        model: newer.model || prev.model,
      });
    }

    const unique = [...byUrl.values()];
    if (unique.length > 0) {
      const db = await openDb();
      // Read existing outside the write tx so awaits don't abort it.
      const readTx = db.transaction(STORE_ASSETS, "readonly");
      const existing = await requestToPromise(
        readTx.objectStore(STORE_ASSETS).getAll(),
      );
      const existingIds = new Set(existing.map((r) => r.id));
      const existingUrls = new Set(existing.map((r) => r.url).filter(Boolean));

      const toInsert = unique.filter(
        (a) => !existingIds.has(a.id) && !existingUrls.has(a.url),
      );

      if (toInsert.length > 0) {
        const writeTx = db.transaction(STORE_ASSETS, "readwrite");
        const store = writeTx.objectStore(STORE_ASSETS);
        for (const asset of toInsert) store.put(asset);
        await txDone(writeTx);
      }
    }

    await setMeta(MIGRATION_FLAG, {
      at: new Date().toISOString(),
      count: unique.length,
    });

    try {
      localStorage.setItem(MIGRATION_FLAG, "1");
    } catch {
      /* ignore */
    }

    return { migrated: unique.length, skipped: false };
  })();

  try {
    return await migrationPromise;
  } catch (err) {
    migrationPromise = null;
    throw err;
  }
}

// ── Send-to API (shell / PostGenActions integration) ─────────────────────────

/**
 * Cross-tab handoff: sessionStorage + CustomEvent.
 * @param {'video'|'enhance'|'lipsync'|'image'} target
 * @param {object} asset
 */
export function sendAssetTo(target, asset) {
  const payload = {
    target,
    asset: normalizeAsset(asset),
    meta: toHistoryMeta(asset),
    ts: Date.now(),
  };
  try {
    sessionStorage.setItem(SEND_TO_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[assetsStore] sessionStorage send-to failed:", err);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SEND_TO_EVENT, { detail: payload }));
  }
  return payload;
}

export function consumeSendToPayload() {
  try {
    const raw = sessionStorage.getItem(SEND_TO_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SEND_TO_STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekSendToPayload() {
  try {
    const raw = sessionStorage.getItem(SEND_TO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Moodboard stub API ───────────────────────────────────────────────────────

export async function listMoodboard() {
  const db = await openDb();
  const tx = db.transaction(STORE_MOODBOARD, "readonly");
  const rows = await requestToPromise(tx.objectStore(STORE_MOODBOARD).getAll());
  return rows || [];
}

export async function addMoodboardItem({ url, label = "", id = null }) {
  const item = {
    id: id || newId("mood"),
    url,
    label,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE_MOODBOARD, "readwrite");
  tx.objectStore(STORE_MOODBOARD).put(item);
  await txDone(tx);
  return item;
}

export async function removeMoodboardItem(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_MOODBOARD, "readwrite");
  tx.objectStore(STORE_MOODBOARD).delete(id);
  await txDone(tx);
}

// ── Elements stub API (character / product refs) ─────────────────────────────

/**
 * @param {{ id?, name, kind?: 'character'|'product'|'other', refs?: string[], promptPrefix?: string }} element
 */
export async function saveElement(element) {
  const record = {
    id: element.id || newId("el"),
    name: element.name || "Untitled",
    kind: element.kind || "other",
    refs: Array.isArray(element.refs) ? element.refs : [],
    promptPrefix: element.promptPrefix || "",
    updatedAt: new Date().toISOString(),
    createdAt: element.createdAt || new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE_ELEMENTS, "readwrite");
  tx.objectStore(STORE_ELEMENTS).put(record);
  await txDone(tx);
  return record;
}

export async function listElements(kind) {
  const db = await openDb();
  const tx = db.transaction(STORE_ELEMENTS, "readonly");
  const store = tx.objectStore(STORE_ELEMENTS);
  const rows = kind
    ? await requestToPromise(store.index("kind").getAll(kind))
    : await requestToPromise(store.getAll());
  return rows || [];
}

export async function getElement(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_ELEMENTS, "readonly");
  return requestToPromise(tx.objectStore(STORE_ELEMENTS).get(id));
}

export async function deleteElement(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_ELEMENTS, "readwrite");
  tx.objectStore(STORE_ELEMENTS).delete(id);
  await txDone(tx);
}

/**
 * Resolve `@Name` mentions → refs + prompt prefixes for multi-image models.
 * Stub: exact name match (case-insensitive).
 */
export async function resolveElementMentions(promptText = "") {
  const elements = await listElements();
  const mentions = [];
  let prefixParts = [];
  const refs = [];

  for (const el of elements) {
    const token = `@${el.name}`;
    const re = new RegExp(`@${escapeRegExp(el.name)}\\b`, "i");
    if (re.test(promptText) || promptText.includes(token)) {
      mentions.push(el);
      if (el.promptPrefix) prefixParts.push(el.promptPrefix);
      for (const r of el.refs || []) {
        if (r && !refs.includes(r)) refs.push(r);
      }
    }
  }

  return {
    mentions,
    refs,
    promptPrefix: prefixParts.join(" ").trim(),
    prompt:
      [prefixParts.join(" ").trim(), promptText].filter(Boolean).join("\n") ||
      promptText,
  };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
