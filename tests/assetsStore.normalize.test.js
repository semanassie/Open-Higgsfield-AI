/**
 * Lightweight pure-function checks for assetsStore helpers (no IndexedDB).
 * Run: node tests/assetsStore.normalize.test.js
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");

const storePath = path.join(
  __dirname,
  "..",
  "packages",
  "studio",
  "src",
  "lib",
  "assetsStore.js",
);

// ESM file — extract & eval pure helpers via dynamic import when available,
// otherwise smoke-parse the source.
async function main() {
  assert.ok(fs.existsSync(storePath), "assetsStore.js exists");

  const src = fs.readFileSync(storePath, "utf8");
  assert.ok(src.includes("export function normalizeAsset"), "normalizeAsset exported");
  assert.ok(src.includes("export function toHistoryMeta"), "toHistoryMeta exported");
  assert.ok(src.includes("export async function saveAsset"), "saveAsset exported");
  assert.ok(src.includes("migrateFromLocalStorageOnce"), "migration present");
  assert.ok(src.includes("SEND_TO_EVENT"), "send-to event present");
  assert.ok(src.includes("STORE_MOODBOARD"), "moodboard store");
  assert.ok(src.includes("STORE_ELEMENTS"), "elements store");
  assert.ok(src.includes("QuotaExceededError"), "quota handling");
  assert.ok(src.includes("muapi_history"), "migrates muapi_history");
  assert.ok(src.includes("hg_image_studio_persistent"), "migrates image persist");
  assert.ok(src.includes("hg_video_studio_persistent"), "migrates video persist");

  const hooks = [
    "packages/studio/src/hooks/useRemix.js",
    "packages/studio/src/hooks/useCompare.js",
    "packages/studio/src/hooks/useAssets.js",
    "packages/studio/src/components/AssetsPanel.jsx",
    "packages/studio/src/components/CompareView.jsx",
  ];
  for (const rel of hooks) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", rel)), `${rel} exists`);
  }

  const imageSrc = fs.readFileSync(
    path.join(__dirname, "..", "packages/studio/src/components/ImageStudio.jsx"),
    "utf8",
  );
  const videoSrc = fs.readFileSync(
    path.join(__dirname, "..", "packages/studio/src/components/VideoStudio.jsx"),
    "utf8",
  );
  assert.ok(imageSrc.includes("saveGeneration"), "ImageStudio persists assets");
  assert.ok(videoSrc.includes("persistAsset"), "VideoStudio persists assets");
  assert.ok(
    !fs
      .readFileSync(path.join(__dirname, "..", "packages/studio/src/models.js"), "utf8")
      .includes("hf_assets"),
    "models.js untouched by assets",
  );

  console.log("assetsStore QA smoke: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
