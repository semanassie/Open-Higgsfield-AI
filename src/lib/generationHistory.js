/** MuAPI-hosted output URLs expire after 30 days — mirror that in local history. */
export const MUAPI_OUTPUT_RETENTION_DAYS = 30;
export const MUAPI_OUTPUT_RETENTION_MS = MUAPI_OUTPUT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const HISTORY_KEYS = {
    image: 'muapi_history',
    video: 'video_history',
    lipsync: 'lipsync_history',
    cinema: 'cinema_history',
};

const DEFAULT_MAX_ENTRIES = 50;

export function computeExpiresAt(timestamp = Date.now()) {
    const base = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
    return new Date(base + MUAPI_OUTPUT_RETENTION_MS).toISOString();
}

export function isEntryExpired(entry, now = Date.now()) {
    if (!entry) return true;
    if (entry.expiresAt) return Date.parse(entry.expiresAt) <= now;
    if (entry.timestamp) return Date.parse(entry.timestamp) + MUAPI_OUTPUT_RETENTION_MS <= now;
    return false;
}

export function pruneExpiredEntries(entries, now = Date.now()) {
    return (entries || []).filter(e => !isEntryExpired(e, now));
}

/**
 * Load generation history from localStorage, pruning expired MuAPI output URLs.
 * @param {string} storageKey
 * @param {number} [maxEntries]
 * @returns {Array}
 */
export function loadGenerationHistory(storageKey, maxEntries = DEFAULT_MAX_ENTRIES) {
    try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const pruned = pruneExpiredEntries(raw);
        const normalized = pruned.map(normalizeHistoryEntry);
        if (normalized.length !== raw.length) {
            localStorage.setItem(storageKey, JSON.stringify(normalized.slice(0, maxEntries)));
        }
        return normalized.slice(0, maxEntries);
    } catch {
        return [];
    }
}

export function saveGenerationHistory(storageKey, entries, maxEntries = DEFAULT_MAX_ENTRIES) {
    const pruned = pruneExpiredEntries(entries);
    localStorage.setItem(storageKey, JSON.stringify(pruned.slice(0, maxEntries)));
    return pruned.slice(0, maxEntries);
}

/** Attach retention metadata to a new history entry. */
export function createHistoryEntry(data) {
    const timestamp = data.timestamp || new Date().toISOString();
    return {
        ...data,
        timestamp,
        expiresAt: data.expiresAt || computeExpiresAt(timestamp),
    };
}

function normalizeHistoryEntry(entry) {
    const timestamp = entry.timestamp || new Date().toISOString();
    return {
        ...entry,
        timestamp,
        expiresAt: entry.expiresAt || computeExpiresAt(timestamp),
    };
}

/** Short user-facing note about MuAPI 30-day output retention. */
export function getRetentionNoticeText() {
    return `MuAPI outputs expire after ${MUAPI_OUTPUT_RETENTION_DAYS} days. Download anything you want to keep.`;
}

/** DOM element for history sidebars. */
export function createRetentionNoticeElement() {
    const el = document.createElement('div');
    el.className = 'px-2 pb-2 text-[8px] leading-tight text-muted/70 text-center';
    el.title = getRetentionNoticeText();
    el.textContent = `${MUAPI_OUTPUT_RETENTION_DAYS}-day retention`;
    return el;
}

/** Days until an entry's hosted URL likely expires (0 if already expired). */
export function daysUntilExpiry(entry) {
    const expires = entry?.expiresAt ? Date.parse(entry.expiresAt) : null;
    if (!expires) return MUAPI_OUTPUT_RETENTION_DAYS;
    const diff = expires - Date.now();
    return diff <= 0 ? 0 : Math.ceil(diff / (24 * 60 * 60 * 1000));
}
