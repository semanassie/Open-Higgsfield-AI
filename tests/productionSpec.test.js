/**
 * Smoke checks for Production Studio spec helpers.
 * Run: node tests/productionSpec.test.js
 */
import {
  buildBriefBlock,
  buildReferenceSpecPrompt,
  parseSpecJson,
  buildStoryPrompt,
  parseBeatsJson,
  beatToGenerationPrompt,
  parseDefectsJson,
} from "../packages/studio/src/lib/productionSpec.js";
import {
  listRecipes,
  getRecipeSystemAddon,
  combineRecipeAddons,
} from "../packages/studio/src/lib/productionRecipes.js";
import {
  createEmptyProductionProject,
  normalizeProductionProject,
} from "../packages/studio/src/lib/productionProject.js";
import { canLeaveStep, canGoToStep } from "../packages/studio/src/lib/productionGates.js";
import { beatsToTimeline } from "../packages/studio/src/lib/productionCompose.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

const recipes = listRecipes();
assert(recipes.length === 3, "three recipes");
assert(
  recipes.map((r) => r.id).join(",") ===
    "taste-easing,pipeline-short,motion-weight",
  "recipe ids",
);
assert(
  getRecipeSystemAddon("taste-easing").includes("easing"),
  "taste addon",
);
assert(
  getRecipeSystemAddon("motion-weight").includes("MICRO UI"),
  "motion-weight recipe exists",
);
assert(
  getRecipeSystemAddon("motion-weight").includes("HEADLINES"),
  "motion-weight headlines",
);
assert(getRecipeSystemAddon("missing") === "", "missing recipe empty");
assert(
  combineRecipeAddons(["taste-easing", "motion-weight"]).includes("MICRO UI"),
  "combine recipe addons",
);

const brief = {
  film: "Empty stations before 9am",
  audience: "city operators",
  durationSec: 24,
  formats: ["16:9", "9:16"],
  keep: "real metrics",
  avoid: "fake logos",
  assetsNotes: "use chart stills",
};
assert(buildBriefBlock(brief).includes("Empty stations"), "brief block film");
assert(buildBriefBlock(brief).includes("Avoid: fake logos"), "brief block avoid");

const refPrompt = buildReferenceSpecPrompt({
  reference: "fast cuts, bold titles",
  referenceUrl: "https://example.com/ref",
  recipeAddon: getRecipeSystemAddon("taste-easing"),
  brief,
});
assert(refPrompt.includes("https://example.com/ref"), "url in ref prompt");
assert(refPrompt.includes("easing"), "recipe in ref prompt");
assert(refPrompt.includes("Empty stations"), "brief injected in ref prompt");

const spec = parseSpecJson(
  '```json\n{"pacing":"quick","firstMotion":"title slam","textEntrance":"from left","payoff":"logo hold"}\n```',
);
assert(spec.pacing === "quick", "parse pacing");
assert(spec.payoff === "logo hold", "parse payoff");

const figures = [
  { id: "f1", label: "Retention", value: "71%", note: "weekday AM" },
];
const storyPrompt = buildStoryPrompt({
  storyBrief: "Empty stations before 9am",
  spec,
  figures,
  recipeAddon: getRecipeSystemAddon("pipeline-short"),
  brief,
});
assert(storyPrompt.includes("71%"), "figure in story prompt");
assert(storyPrompt.includes("Empty stations"), "brief in story prompt");
assert(storyPrompt.includes("Keep: real metrics"), "brief keep in story");

const beats = parseBeatsJson(
  JSON.stringify([
    {
      id: "beat_1",
      title: "Hook",
      onScreen: "71% empty",
      durationSec: 3,
      hole: "chart still",
      entryState: "viewer cold",
      exitState: "problem known",
      purpose: "hook",
    },
    {
      title: "Payoff",
      onScreen: "Fix the gap",
      durationSec: 4,
      hole: "city dawn",
    },
  ]),
);
assert(beats.length === 2, "two beats");
assert(beats[1].id === "beat_2", "auto beat id");
assert(beats[0].entryState === "viewer cold", "entry state parsed");
assert(beats[0].purpose === "hook", "purpose parsed");

const genPrompt = beatToGenerationPrompt(
  beats[0],
  figures,
  "warm tungsten print color science",
  brief,
);
assert(genPrompt.includes("71%"), "figure in beat prompt");
assert(genPrompt.includes("warm tungsten"), "grade clause in beat prompt");
assert(genPrompt.includes("Keep: real metrics"), "brief keep in beat prompt");
assert(genPrompt.includes("16:9"), "aspect from brief");
assert(!genPrompt.includes("1.08"), "no CDL numbers in beat prompt");

const defects = parseDefectsJson(
  JSON.stringify([
    {
      beatId: "beat_1",
      timestampSec: 0,
      evidence: "text too late",
      fix: "Title a beat earlier",
    },
    {
      beatId: "beat_2",
      timestampSec: 3,
      evidence: "soft focus",
      fix: "Sharper subject",
    },
    {
      beatId: "beat_3",
      timestampSec: 7,
      evidence: "wrong metric",
      fix: "Use 71%",
    },
    {
      beatId: "beat_4",
      timestampSec: 11,
      evidence: "extra",
      fix: "drop",
    },
  ]),
  3,
);
assert(defects.length === 3, "defect parse capped at 3");
assert(defects[0].beatId === "beat_1", "defect beatId");
assert(defects[0].fix.includes("earlier"), "defect fix");

const empty = createEmptyProductionProject();
assert(typeof empty.llmModelId === "string" && empty.llmModelId, "default llm");
assert(empty.brief && typeof empty.brief.film === "string", "default brief");
assert(empty.recipeIds.includes("motion-weight"), "default includes motion-weight");

const loaded = normalizeProductionProject({
  combinedVideoUrl: "blob:http://localhost/x",
  beats: [{ title: "A", videoUrl: "https://cdn.example/a.mp4" }],
});
assert(loaded.combinedVideoUrl === null, "blob combined cleared");
assert(loaded.beats[0].videoUrl.includes("cdn.example"), "beat video kept");
assert(loaded.brief && Array.isArray(loaded.brief.formats), "legacy gets brief");
assert(loaded.approvals.brief === false, "legacy approvals default false");

const unapproved = normalizeProductionProject({
  step: 0,
  approvals: { brief: false, reference: false, figures: false, story: false },
});
assert(!canLeaveStep(unapproved, 0), "no Brief approve → cannot leave step 0");
assert(!canGoToStep(unapproved, 1), "cannot go to Reference without brief");

const approvedBrief = normalizeProductionProject({
  step: 0,
  approvals: { brief: true, reference: false, figures: false, story: false },
});
assert(canLeaveStep(approvedBrief, 0), "brief approve allows leave step 0");
assert(canGoToStep(approvedBrief, 1), "can go to Reference after brief");

const timeline = beatsToTimeline([
  { id: "beat_1", videoUrl: "https://cdn.example/a.mp4", audioUrl: "https://cdn.example/a.mp3" },
  { id: "beat_2", videoUrl: null },
  { id: "beat_3", videoUrl: "https://cdn.example/c.mp4" },
]);
assert(timeline.version === 1, "timeline version");
assert(timeline.tracks[0].clips.length === 2, "skip null video");
assert(timeline.tracks[0].clips[1].shotId === "beat_3", "shotId preserved");
assert(timeline.tracks[1].clips.length === 1, "audio clip when audioUrl set");
assert(timeline.tracks[1].clips[0].shotId === "beat_1", "audio shotId matches");
assert(timeline.tracks[1].clips[0].url.includes("a.mp3"), "audio url kept");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall ok");
