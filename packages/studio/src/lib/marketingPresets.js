/**
 * Marketing preset workflows (P1.6 / S1.2)
 * Product shots / Graphic ads / Marketplace — client-side templates only.
 * Uses existing T2I/I2I endpoints; no Marketing Studio Image API.
 */

/** @typedef {'product-shots' | 'graphic-ads' | 'marketplace'} MarketingPresetId */

/**
 * @typedef {Object} MarketingPreset
 * @property {MarketingPresetId} id
 * @property {string} name
 * @property {string} shortLabel
 * @property {string} description
 * @property {string} aspectRatio
 * @property {'i2i' | 't2i' | 'auto'} preferredMode
 * @property {string} preferredI2IModelId
 * @property {string} preferredT2IModelId
 * @property {boolean} requiresImage
 * @property {string} placeholder
 * @property {string} defaultBrief
 * @property {string} promptPrefix
 * @property {string} promptSuffix
 * @property {string[]} qualityTags
 * @property {string} expandMarker
 */

/** @type {MarketingPreset[]} */
export const MARKETING_PRESETS = [
  {
    id: "product-shots",
    name: "Product shots",
    shortLabel: "Product",
    description:
      "Hero product photography from a reference photo — studio lighting, clean composition.",
    aspectRatio: "4:5",
    preferredMode: "i2i",
    preferredI2IModelId: "flux-kontext-dev-i2i",
    preferredT2IModelId: "flux-dev",
    requiresImage: true,
    placeholder: "e.g. luxury bottle on dark marble, soft rim light…",
    defaultBrief: "premium product hero shot on a minimal studio set",
    promptPrefix:
      "Commercial product photography of the exact product in the reference image",
    promptSuffix:
      "keep product identity, logo and proportions accurate, no text overlays, no watermark",
    qualityTags: [
      "professional studio lighting",
      "soft key light with gentle rim",
      "sharp focus on product",
      "shallow depth of field",
      "high-end catalog look",
      "photorealistic",
      "8K detail",
    ],
    expandMarker: "[oh-mkt:product-shots]",
  },
  {
    id: "graphic-ads",
    name: "Graphic ads",
    shortLabel: "Ads",
    description:
      "Scroll-stopping social / display creatives — bold composition, campaign-ready framing.",
    aspectRatio: "1:1",
    preferredMode: "auto",
    preferredI2IModelId: "nano-banana-edit",
    preferredT2IModelId: "nano-banana",
    requiresImage: false,
    placeholder: "e.g. summer sale sneaker campaign, bold color blocking…",
    defaultBrief: "bold social ad creative for a product launch",
    promptPrefix:
      "Graphic advertising creative, eye-catching commercial layout",
    promptSuffix:
      "clean negative space for headline, high contrast, brand-safe, no unreadable fake text, no watermark",
    qualityTags: [
      "modern marketing campaign style",
      "strong focal subject",
      "vibrant but controlled color grade",
      "poster-quality composition",
      "sharp commercial photography",
      "scroll-stopping visual",
    ],
    expandMarker: "[oh-mkt:graphic-ads]",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    shortLabel: "Market",
    description:
      "Clean listing photos — white/neutral background, true-to-life product for Amazon-style catalogs.",
    aspectRatio: "1:1",
    preferredMode: "i2i",
    preferredI2IModelId: "flux-kontext-dev-i2i",
    preferredT2IModelId: "flux-dev",
    requiresImage: true,
    placeholder: "e.g. earbuds centered, pure white backdrop…",
    defaultBrief: "marketplace listing photo on pure white background",
    promptPrefix:
      "E-commerce marketplace product listing photo of the exact product in the reference image",
    promptSuffix:
      "centered product, intact branding, no props clutter, no text overlays, no watermark, true color",
    qualityTags: [
      "seamless pure white background",
      "even softbox lighting",
      "neutral color accurate",
      "catalog photography",
      "sharp edges",
      "Amazon-style listing",
      "photorealistic",
    ],
    expandMarker: "[oh-mkt:marketplace]",
  },
];

/**
 * @param {string} id
 * @returns {MarketingPreset | undefined}
 */
export function getMarketingPreset(id) {
  return MARKETING_PRESETS.find((p) => p.id === id);
}

/**
 * Template-based prompt expand (no LLM). Idempotent if marker already present.
 * @param {MarketingPreset | string} presetOrId
 * @param {string} [userBrief]
 * @returns {string}
 */
export function expandMarketingPrompt(presetOrId, userBrief = "") {
  const preset =
    typeof presetOrId === "string"
      ? getMarketingPreset(presetOrId)
      : presetOrId;
  if (!preset) return (userBrief || "").trim();

  const raw = (userBrief || "").trim();
  if (raw.includes(preset.expandMarker)) {
    return raw;
  }

  // If user pasted a prior expanded prompt for another preset, strip old marker line noise lightly
  const brief = raw || preset.defaultBrief;
  const tags = preset.qualityTags.filter(Boolean).join(", ");

  return [
    preset.expandMarker,
    preset.promptPrefix,
    brief,
    tags,
    preset.promptSuffix,
  ]
    .filter((part) => part && String(part).trim() !== "")
    .join(", ");
}

/**
 * Resolve studio mode + model preference for a preset given current uploads.
 * @param {MarketingPreset} preset
 * @param {{ hasImage?: boolean }} [ctx]
 * @returns {{ imageMode: boolean, modelId: string, aspectRatio: string }}
 */
export function resolveMarketingPresetApplication(preset, ctx = {}) {
  const hasImage = Boolean(ctx.hasImage);
  let imageMode;
  if (preset.preferredMode === "i2i") {
    imageMode = true;
  } else if (preset.preferredMode === "t2i") {
    imageMode = false;
  } else {
    imageMode = hasImage;
  }

  const modelId = imageMode
    ? preset.preferredI2IModelId
    : preset.preferredT2IModelId;

  return {
    imageMode,
    modelId,
    aspectRatio: preset.aspectRatio,
  };
}

/**
 * Short brief suitable for the textarea before enhance.
 * @param {MarketingPreset} preset
 * @returns {string}
 */
export function getMarketingPresetSeedPrompt(preset) {
  return preset.defaultBrief;
}
