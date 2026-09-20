/**
 * Smoke checks for marketing preset expand (no test runner required).
 * Run: node tests/marketingPresets.test.js
 */
import {
  MARKETING_PRESETS,
  expandMarketingPrompt,
  resolveMarketingPresetApplication,
  getMarketingPreset,
} from "../packages/studio/src/lib/marketingPresets.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

assert(MARKETING_PRESETS.length === 3, "exactly 3 presets");
assert(
  MARKETING_PRESETS.map((p) => p.id).join(",") ===
    "product-shots,graphic-ads,marketplace",
  "preset ids",
);

const expanded = expandMarketingPrompt("product-shots", "red sneakers");
assert(expanded.includes("[oh-mkt:product-shots]"), "marker present");
assert(expanded.includes("red sneakers"), "brief kept");
assert(
  expandMarketingPrompt("product-shots", expanded) === expanded,
  "idempotent expand",
);

const adsNoImg = resolveMarketingPresetApplication(
  getMarketingPreset("graphic-ads"),
  { hasImage: false },
);
assert(adsNoImg.imageMode === false, "graphic ads without image → t2i");
assert(adsNoImg.modelId === "nano-banana", "graphic ads t2i model");

const adsImg = resolveMarketingPresetApplication(
  getMarketingPreset("graphic-ads"),
  { hasImage: true },
);
assert(adsImg.imageMode === true, "graphic ads with image → i2i");

const product = resolveMarketingPresetApplication(
  getMarketingPreset("product-shots"),
  { hasImage: false },
);
assert(product.imageMode === true, "product shots prefer i2i");
assert(product.aspectRatio === "4:5", "product shots aspect");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll marketing preset checks passed.");
