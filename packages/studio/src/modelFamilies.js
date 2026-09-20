/**
 * Model family helpers for FamilyModePicker (P1.5).
 * Consumes W6 catalog metadata: family, variant | modeKey | modeLabel, badges, bestFor.
 * Models without `family` fall back to a singleton row (id as family key).
 */

/** Preferred family order for Video (P1 + popular). Unknown families sort after. */
export const VIDEO_FAMILY_PRIORITY = [
  "seedance-2.5",
  "seedance-v2.0",
  "seedance-v1.5-pro",
  "wan-3.0",
  "wan2.6",
  "wan2.5",
  "wan2.2",
  "minimax-h3",
  "minimax-2",
  "flux-3",
  "kling-v3.0",
  "kling-v3.0-omni",
  "kling-v2.6",
  "kling-v2.5",
  "kling-v2.1",
  "kling-o1",
  "veo3.1",
  "veo",
  "sora",
  "runway",
  "bytedance",
];

/** Preferred family order for Image. */
export const IMAGE_FAMILY_PRIORITY = [
  "flux-3",
  "flux-2",
  "flux",
  "nano",
  "seedream",
  "seedream-v45",
  "gpt-2",
  "gpt-1.5",
  "gpt",
  "ideogram",
  "qwen",
  "kontext",
  "midjourney",
  "minimax",
];

const MODE_INFER_RULES = [
  { re: /\b4k\b|-4k-|4k-/i, key: "4k", label: "4K" },
  { re: /1080p?|1080/i, key: "1080p", label: "1080p" },
  { re: /720p?|720/i, key: "720p", label: "720p" },
  { re: /480p?|480/i, key: "480p", label: "480p" },
  { re: /fast|turbo/i, key: "fast", label: "Fast" },
  { re: /\blite\b|-lite-/i, key: "lite", label: "Lite" },
  { re: /\bmax\b|-max-/i, key: "max", label: "Max" },
  { re: /master/i, key: "master", label: "Master" },
  { re: /prime/i, key: "prime", label: "Prime" },
  { re: /\bpro\b|-pro-|_pro_/i, key: "pro", label: "Pro" },
  { re: /standard|\bstd\b|-std-/i, key: "standard", label: "Standard" },
];

const MODE_SORT_ORDER = [
  "standard",
  "fast",
  "lite",
  "pro",
  "master",
  "max",
  "prime",
  "turbo",
  "480p",
  "720p",
  "1080p",
  "4k",
];

function titleCaseFamilyId(familyId) {
  return String(familyId)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      if (part.length <= 3 && part === part.toLowerCase()) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function normalizeVariantToken(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/^(t2v|i2v|t2i|i2i|v2v)[-_]/, "")
    .replace(/[-_]+/g, "-")
    .replace(/^-|-$/g, "");
}

function humanizeVariantKey(key) {
  if (!key) return "Standard";
  const normalized = normalizeVariantToken(key);
  // Bare io tokens (t2v / i2v / …) are not user-facing modes
  if (
    !normalized ||
    normalized === "standard" ||
    normalized === "std" ||
    ["t2v", "i2v", "t2i", "i2i", "v2v"].includes(normalized)
  ) {
    return "Standard";
  }
  const known = MODE_INFER_RULES.find((r) => r.key === normalized);
  if (known) return known.label;
  // e.g. t2v-prime → Prime, i2v-fast → Fast
  const s = normalized.replace(/[-_]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Resolve display label for a model's mode chip.
 * Prefers W6 meta (`modeLabel` → `variant` → `modeKey`), then id/name inference.
 */
export function getModeLabel(model) {
  if (!model) return "Standard";
  if (model.modeLabel) return String(model.modeLabel);
  if (model.variant) return humanizeVariantKey(model.variant);
  if (model.modeKey) return humanizeVariantKey(model.modeKey);

  const hay = `${model.id || ""} ${model.name || ""}`;
  for (const rule of MODE_INFER_RULES) {
    if (rule.re.test(hay)) return rule.label;
  }
  return "Standard";
}

/** Stable mode key used by resolveVariant / chips. */
export function getModeKey(model) {
  if (!model) return "standard";
  if (model.modeKey) return normalizeVariantToken(model.modeKey) || "standard";
  if (model.variant) {
    const n = normalizeVariantToken(model.variant);
    return n || "standard";
  }
  if (model.modeLabel) {
    const fromLabel = MODE_INFER_RULES.find(
      (r) => r.label.toLowerCase() === String(model.modeLabel).toLowerCase(),
    );
    if (fromLabel) return fromLabel.key;
    return normalizeVariantToken(model.modeLabel) || "standard";
  }

  const hay = `${model.id || ""} ${model.name || ""}`;
  for (const rule of MODE_INFER_RULES) {
    if (rule.re.test(hay)) return rule.key;
  }
  return "standard";
}

export function getFamilyId(model) {
  if (!model) return "";
  return model.family || model.id;
}

/** When multiple siblings share a mode label, derive a short distinctive chip text. */
function disambiguateModeLabel(model, baseLabel, group) {
  const name = model.name || model.id || baseLabel;
  const familyName = getFamilyDisplayName(getFamilyId(model), group);
  let rest = name;
  if (familyName && name.toLowerCase().startsWith(familyName.toLowerCase())) {
    rest = name.slice(familyName.length).replace(/^[\s\-–—:]+/, "").trim();
  }
  if (!rest) {
    // Fall back to last meaningful id segment
    const parts = String(model.id || "").split("-").filter(Boolean);
    rest = parts.slice(-2).join(" ");
  }
  if (!rest || rest.toLowerCase() === baseLabel.toLowerCase()) return baseLabel;
  // Prefer short token lists
  const tokens = rest.split(/\s+/).slice(0, 3).join(" ");
  return tokens.length <= 24 ? tokens : baseLabel;
}

/**
 * Display name for a family group.
 * Uses shared catalog `name` when models share one; else strips mode suffixes / titles family id.
 */
export function getFamilyDisplayName(familyId, modelsInFamily = []) {
  if (!modelsInFamily.length) return titleCaseFamilyId(familyId);

  const names = modelsInFamily.map((m) => m.name).filter(Boolean);
  const unique = [...new Set(names)];
  if (unique.length === 1) return unique[0];

  // Strip common mode tokens from names and pick shortest shared stem
  const stripped = names.map((n) =>
    n
      .replace(/\b(Fast|Turbo|Lite|Pro|Master|Max|Prime|Standard|Std|4K|1080p|720p|480p)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[-–—]+\s*$/g, "")
      .trim(),
  );
  const stemCounts = stripped.reduce((acc, s) => {
    if (s) acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const bestStem = Object.entries(stemCounts).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
  if (bestStem && bestStem[1] >= 2 && bestStem[0].length >= 3) return bestStem[0];

  if (modelsInFamily.every((m) => m.family)) return titleCaseFamilyId(familyId);
  return modelsInFamily[0].name || titleCaseFamilyId(familyId);
}

function sortModes(modes) {
  return [...modes].sort((a, b) => {
    const ai = MODE_SORT_ORDER.indexOf(a.key);
    const bi = MODE_SORT_ORDER.indexOf(b.key);
    const ao = ai === -1 ? 100 : ai;
    const bo = bi === -1 ? 100 : bi;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label);
  });
}

function mergeBadges(models) {
  const set = new Set();
  for (const m of models) {
    if (Array.isArray(m.badges)) m.badges.forEach((b) => set.add(b));
  }
  return [...set];
}

/**
 * Group catalog models into family rows with mode chips.
 * @param {Array} models
 * @param {{ preferredOrder?: string[] }} [options]
 * @returns {Array<{ id: string, name: string, models: Array, modes: Array<{key,label,modelId,model}>, defaultModelId: string, badges: string[], bestFor?: string, singleton: boolean }>}
 */
export function getFamilies(models, options = {}) {
  const preferredOrder = options.preferredOrder || [];
  const byFamily = new Map();

  for (const model of models || []) {
    const fid = getFamilyId(model);
    if (!byFamily.has(fid)) byFamily.set(fid, []);
    byFamily.get(fid).push(model);
  }

  const families = [];
  for (const [id, group] of byFamily) {
    const modeMap = new Map();
    for (const model of group) {
      let key = getModeKey(model);
      let label = getModeLabel(model);
      // Disambiguate duplicate keys/labels within a family
      if (modeMap.has(key) && modeMap.get(key).modelId !== model.id) {
        key = `${key}__${model.id}`;
        label = disambiguateModeLabel(model, label, group);
      }
      modeMap.set(key, {
        key,
        label,
        modelId: model.id,
        model,
      });
    }
    // Second pass: if two different keys share the same visible label, disambiguate
    const labelCounts = {};
    for (const mode of modeMap.values()) {
      labelCounts[mode.label] = (labelCounts[mode.label] || 0) + 1;
    }
    for (const mode of modeMap.values()) {
      if (labelCounts[mode.label] > 1) {
        mode.label = disambiguateModeLabel(mode.model, mode.label, group);
      }
    }
    const modes = sortModes([...modeMap.values()]);
    // Prefer a "standard" default; else first in sort order
    const defaultMode =
      modes.find((m) => m.key === "standard" || m.label === "Standard") || modes[0];
    const singleton = !group[0]?.family || group.length === 1;

    families.push({
      id,
      name: getFamilyDisplayName(id, group),
      models: group,
      modes,
      defaultModelId: defaultMode?.modelId || group[0].id,
      badges: mergeBadges(group),
      bestFor: group.find((m) => m.bestFor)?.bestFor,
      singleton: singleton && group.length === 1,
    });
  }

  const priorityIndex = (fid) => {
    const i = preferredOrder.indexOf(fid);
    return i === -1 ? preferredOrder.length + 50 : i;
  };

  families.sort((a, b) => {
    const pa = priorityIndex(a.id);
    const pb = priorityIndex(b.id);
    if (pa !== pb) return pa - pb;
    // Prefer multi-mode families with catalog `family` slightly
    const aMeta = a.models[0]?.family ? 0 : 1;
    const bMeta = b.models[0]?.family ? 0 : 1;
    if (aMeta !== bMeta) return aMeta - bMeta;
    return a.name.localeCompare(b.name);
  });

  return families;
}

/**
 * Resolve a model id from family + mode selection.
 * @param {string|object} familyOrId - family id or family object from getFamilies
 * @param {{ modeKey?: string, modeLabel?: string, io?: string, quality?: string, resolution?: string }} selection
 * @param {Array} [allModels] - required when familyOrId is a string
 */
export function resolveVariant(familyOrId, selection = {}, allModels) {
  let family = familyOrId;
  if (typeof familyOrId === "string") {
    const families = getFamilies(allModels || []);
    family = families.find((f) => f.id === familyOrId);
  }
  if (!family) return null;

  const { modeKey, modeLabel, quality, resolution, variant, io } = selection;
  const want =
    (modeKey && String(modeKey).toLowerCase()) ||
    (variant && String(variant).toLowerCase()) ||
    (modeLabel && String(modeLabel).toLowerCase()) ||
    (quality && String(quality).toLowerCase()) ||
    (resolution && String(resolution).toLowerCase()) ||
    null;

  let candidates = family.modes;
  if (io) {
    const ioNorm = String(io).toLowerCase();
    const ioFiltered = candidates.filter(({ model }) => {
      const hay = `${model?.id || ""} ${model?.endpoint || ""}`.toLowerCase();
      if (ioNorm === "t2v" || ioNorm === "t2i") {
        return hay.includes("t2v") || hay.includes("t2i") || hay.includes("text-to");
      }
      if (ioNorm === "i2v" || ioNorm === "i2i") {
        return hay.includes("i2v") || hay.includes("i2i") || hay.includes("image-to");
      }
      return true;
    });
    if (ioFiltered.length) candidates = ioFiltered;
  }

  if (want) {
    const hit =
      candidates.find((m) => m.key === want || m.key.startsWith(`${want}__`)) ||
      candidates.find((m) => m.label.toLowerCase() === want) ||
      candidates.find(
        (m) =>
          m.modelId.toLowerCase().includes(want) ||
          (m.model?.name || "").toLowerCase().includes(want),
      );
    if (hit) return hit.model;
  }

  const pool = candidates.map((m) => m.model);
  return (
    pool.find((m) => m.id === family.defaultModelId) ||
    pool[0] ||
    family.models.find((m) => m.id === family.defaultModelId) ||
    family.models[0] ||
    null
  );
}

export function findFamilyForModel(models, modelId) {
  const families = getFamilies(models);
  return families.find((f) => f.models.some((m) => m.id === modelId)) || null;
}

export function filterFamiliesBySearch(families, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return families;
  return families.filter((f) => {
    if (f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)) return true;
    return f.models.some(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.id || "").toLowerCase().includes(q) ||
        (m.endpoint || "").toLowerCase().includes(q),
    );
  });
}
