import { LLM_FAMILY_DEFAULT_ID, LLM_FAMILY_PRIORITY } from "../llmModels.js";

export const PRODUCTION_PERSIST_KEY = "hg_production_studio_persistent";

const DEFAULT_LLM =
  LLM_FAMILY_DEFAULT_ID[LLM_FAMILY_PRIORITY[0]] || "gpt-6-astra";

const MAX_STEP = 7;

export function createEmptyBrief() {
  return {
    film: "",
    audience: "",
    durationSec: 20,
    formats: ["16:9"],
    keep: "",
    avoid: "",
    assetsNotes: "",
  };
}

export function createEmptyApprovals() {
  return {
    brief: false,
    reference: false,
    figures: false,
    story: false,
  };
}

export function createEmptyReview() {
  return {
    defects: [],
    scores: null,
    contactSheetAt: null,
  };
}

/**
 * @returns {import('./productionSpec.js').ProductionBeat}
 */
export function createEmptyBeat(index = 0) {
  return {
    id: `beat_${index + 1}`,
    title: `Beat ${index + 1}`,
    onScreen: "",
    durationSec: 4,
    hole: "video",
    direction: "",
    entryState: "",
    exitState: "",
    purpose: "",
    imageUrl: null,
    videoUrl: null,
    audioUrl: null,
  };
}

export function createEmptyProductionProject() {
  return {
    llmModelId: DEFAULT_LLM,
    recipeIds: ["taste-easing", "pipeline-short", "motion-weight"],
    brief: createEmptyBrief(),
    approvals: createEmptyApprovals(),
    review: createEmptyReview(),
    reference: "",
    referenceUrl: "",
    spec: {
      pacing: "",
      firstMotion: "",
      textEntrance: "",
      payoff: "",
    },
    figures: [],
    storyBrief: "",
    beats: [],
    gradeId: "neutral-print",
    includeAudio: true,
    step: 0,
    combinedVideoUrl: null,
    timeline: null,
    status: "",
    updatedAt: Date.now(),
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeProductionProject(raw) {
  const empty = createEmptyProductionProject();
  if (!raw || typeof raw !== "object") return empty;
  const src = /** @type {Record<string, unknown>} */ (raw);

  const figures = Array.isArray(src.figures)
    ? src.figures
        .filter((f) => f && typeof f === "object")
        .map((f, i) => ({
          id: String(f.id || `fig_${i + 1}`),
          label: String(f.label || ""),
          value: String(f.value || ""),
          note: String(f.note || ""),
        }))
    : [];

  const beats = Array.isArray(src.beats)
    ? src.beats
        .filter((b) => b && typeof b === "object")
        .map((b, i) => ({
          ...createEmptyBeat(i),
          id: String(b.id || `beat_${i + 1}`),
          title: String(b.title || `Beat ${i + 1}`),
          onScreen: String(b.onScreen || ""),
          durationSec:
            typeof b.durationSec === "number" && b.durationSec > 0
              ? b.durationSec
              : 4,
          hole: String(b.hole || "video"),
          direction: String(b.direction || ""),
          entryState: String(b.entryState || ""),
          exitState: String(b.exitState || ""),
          purpose: String(b.purpose || ""),
          imageUrl: typeof b.imageUrl === "string" ? b.imageUrl : null,
          videoUrl: typeof b.videoUrl === "string" ? b.videoUrl : null,
          audioUrl: typeof b.audioUrl === "string" ? b.audioUrl : null,
        }))
    : [];

  const specIn = src.spec && typeof src.spec === "object" ? src.spec : {};
  const briefIn = src.brief && typeof src.brief === "object" ? src.brief : {};
  const approvalsIn =
    src.approvals && typeof src.approvals === "object" ? src.approvals : {};
  const reviewIn = src.review && typeof src.review === "object" ? src.review : {};

  const recipeIds = Array.isArray(src.recipeIds)
    ? src.recipeIds.map(String)
    : empty.recipeIds;

  const formats = Array.isArray(briefIn.formats)
    ? briefIn.formats.map(String).filter(Boolean)
    : empty.brief.formats;

  const defects = Array.isArray(reviewIn.defects)
    ? reviewIn.defects
        .filter((d) => d && typeof d === "object")
        .slice(0, 3)
        .map((d) => ({
          beatId: String(d.beatId || ""),
          timestampSec:
            typeof d.timestampSec === "number" ? d.timestampSec : 0,
          evidence: String(d.evidence || ""),
          fix: String(d.fix || ""),
        }))
    : [];

  let combinedVideoUrl =
    typeof src.combinedVideoUrl === "string" ? src.combinedVideoUrl : null;
  if (combinedVideoUrl && combinedVideoUrl.startsWith("blob:")) {
    combinedVideoUrl = null;
  }

  // Legacy 0–5 steps map roughly; clamp to 0–7
  let step = typeof src.step === "number" ? src.step : 0;
  if (step > MAX_STEP) step = MAX_STEP;
  if (step < 0) step = 0;

  return {
    ...empty,
    llmModelId:
      typeof src.llmModelId === "string" && src.llmModelId
        ? src.llmModelId
        : empty.llmModelId,
    recipeIds,
    brief: {
      film: String(briefIn.film || ""),
      audience: String(briefIn.audience || ""),
      durationSec:
        typeof briefIn.durationSec === "number" && briefIn.durationSec > 0
          ? briefIn.durationSec
          : empty.brief.durationSec,
      formats: formats.length ? formats : ["16:9"],
      keep: String(briefIn.keep || ""),
      avoid: String(briefIn.avoid || ""),
      assetsNotes: String(briefIn.assetsNotes || ""),
    },
    approvals: {
      brief: !!approvalsIn.brief,
      reference: !!approvalsIn.reference,
      figures: !!approvalsIn.figures,
      story: !!approvalsIn.story,
    },
    review: {
      defects,
      scores:
        reviewIn.scores && typeof reviewIn.scores === "object"
          ? reviewIn.scores
          : null,
      contactSheetAt:
        typeof reviewIn.contactSheetAt === "number"
          ? reviewIn.contactSheetAt
          : null,
    },
    reference: String(src.reference || ""),
    referenceUrl: String(src.referenceUrl || ""),
    spec: {
      pacing: String(specIn.pacing || ""),
      firstMotion: String(specIn.firstMotion || ""),
      textEntrance: String(specIn.textEntrance || ""),
      payoff: String(specIn.payoff || ""),
    },
    figures,
    storyBrief: String(src.storyBrief || ""),
    beats,
    gradeId:
      typeof src.gradeId === "string" ? src.gradeId : empty.gradeId,
    includeAudio: src.includeAudio !== false,
    step,
    combinedVideoUrl,
    timeline: src.timeline && typeof src.timeline === "object" ? src.timeline : null,
    status: String(src.status || ""),
    updatedAt: typeof src.updatedAt === "number" ? src.updatedAt : Date.now(),
  };
}

/**
 * Clear media URLs and switch primary format to 9:16 (no crop).
 * @param {ReturnType<typeof createEmptyProductionProject>} project
 */
export function forkProjectForVertical(project) {
  const normalized = normalizeProductionProject(project);
  const formats = ["9:16", ...normalized.brief.formats.filter((f) => f !== "9:16")];
  return normalizeProductionProject({
    ...normalized,
    brief: { ...normalized.brief, formats },
    beats: normalized.beats.map((b) => ({
      ...b,
      imageUrl: null,
      videoUrl: null,
      audioUrl: null,
    })),
    approvals: {
      ...normalized.approvals,
      // Keep brief/reference/figures/story approvals; force re-generate
    },
    review: createEmptyReview(),
    combinedVideoUrl: null,
    timeline: null,
    step: 4,
    status: "Forked for 9:16 — regenerate beats",
  });
}

export function loadProductionProject() {
  if (typeof localStorage === "undefined") {
    return createEmptyProductionProject();
  }
  try {
    const raw = localStorage.getItem(PRODUCTION_PERSIST_KEY);
    if (!raw) return createEmptyProductionProject();
    return normalizeProductionProject(JSON.parse(raw));
  } catch {
    return createEmptyProductionProject();
  }
}

/**
 * @param {ReturnType<typeof createEmptyProductionProject>} project
 */
export function saveProductionProject(project) {
  if (typeof localStorage === "undefined") return;
  const normalized = normalizeProductionProject({
    ...project,
    updatedAt: Date.now(),
  });
  localStorage.setItem(PRODUCTION_PERSIST_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearProductionProject() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(PRODUCTION_PERSIST_KEY);
}

/** Primary aspect ratio for generation. */
export function primaryFormat(project) {
  const f = project?.brief?.formats?.[0];
  if (f === "9:16" || f === "1:1" || f === "16:9") return f;
  return "16:9";
}
