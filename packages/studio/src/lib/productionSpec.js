/**
 * Prompts and parsers for Production Studio (brief → reference → story → critic).
 */

/**
 * @typedef {{ pacing?: string, firstMotion?: string, textEntrance?: string, payoff?: string }} ProductionSpec
 * @typedef {{ id: string, label: string, value: string, note?: string }} ProductionFigure
 * @typedef {{
 *   film?: string,
 *   audience?: string,
 *   durationSec?: number,
 *   formats?: string[],
 *   keep?: string,
 *   avoid?: string,
 *   assetsNotes?: string,
 * }} ProductionBrief
 * @typedef {{
 *   id: string,
 *   title: string,
 *   onScreen: string,
 *   durationSec: number,
 *   hole?: string,
 *   direction?: string,
 *   entryState?: string,
 *   exitState?: string,
 *   purpose?: string,
 *   imageUrl?: string|null,
 *   videoUrl?: string|null,
 *   audioUrl?: string|null,
 * }} ProductionBeat
 * @typedef {{
 *   beatId: string,
 *   timestampSec: number,
 *   evidence: string,
 *   fix: string,
 * }} ProductionDefect
 */

/**
 * @param {ProductionBrief} [brief]
 * @returns {string}
 */
export function buildBriefBlock(brief = {}) {
  const formats = Array.isArray(brief.formats)
    ? brief.formats.join(", ")
    : "16:9";
  const lines = [
    brief.film && `Film (one sentence): ${brief.film}`,
    brief.audience && `Audience: ${brief.audience}`,
    brief.durationSec != null && `Duration: ${brief.durationSec}s`,
    `Formats: ${formats}`,
    brief.keep && `Keep: ${brief.keep}`,
    brief.avoid && `Avoid: ${brief.avoid}`,
    brief.assetsNotes && `Assets notes: ${brief.assetsNotes}`,
    "Never invent product screens, logos, or metrics.",
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "(no brief)";
}

/**
 * @param {{ reference: string, referenceUrl?: string, recipeAddon?: string, brief?: ProductionBrief }} opts
 */
export function buildReferenceSpecPrompt({
  reference,
  referenceUrl = "",
  recipeAddon = "",
  brief,
} = {}) {
  const urlLine = referenceUrl ? `\nReference URL: ${referenceUrl}` : "";
  const addon = recipeAddon ? `\nAdditional craft guidance: ${recipeAddon}` : "";
  return [
    "Analyze the reference and return ONLY a JSON object (no markdown) with keys:",
    "pacing, firstMotion, textEntrance, payoff (each a short string).",
    "Do not invent product metrics.",
    "",
    "Director brief:",
    buildBriefBlock(brief),
    "",
    `Reference notes:${urlLine}`,
    String(reference || "").trim() || "(no notes)",
    addon,
  ].join("\n");
}

/**
 * @param {string} raw
 * @returns {ProductionSpec}
 */
export function parseSpecJson(raw) {
  const text = String(raw || "").trim();
  if (!text) return {};
  let jsonText = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) jsonText = fence[1].trim();
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Spec response is not JSON");
  }
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Spec JSON must be an object");
  }
  /** @type {ProductionSpec} */
  const out = {};
  for (const key of ["pacing", "firstMotion", "textEntrance", "payoff"]) {
    if (typeof parsed[key] === "string" && parsed[key].trim()) {
      out[key] = parsed[key].trim();
    }
  }
  return out;
}

/**
 * @param {{
 *   storyBrief: string,
 *   spec?: ProductionSpec,
 *   figures?: ProductionFigure[],
 *   recipeAddon?: string,
 *   brief?: ProductionBrief,
 * }} opts
 */
export function buildStoryPrompt({
  storyBrief,
  spec = {},
  figures = [],
  recipeAddon = "",
  brief,
} = {}) {
  const figureBlock =
    Array.isArray(figures) && figures.length
      ? figures
          .map((f) => `- ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ""}`)
          .join("\n")
      : "(none — do not invent numbers)";
  const specBlock = [
    spec.pacing && `Pacing: ${spec.pacing}`,
    spec.firstMotion && `First motion: ${spec.firstMotion}`,
    spec.textEntrance && `Text entrance: ${spec.textEntrance}`,
    spec.payoff && `Payoff: ${spec.payoff}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Write a short production beat list as ONLY a JSON array (no markdown).",
    "Each item: { id, title, onScreen, durationSec, hole, entryState, exitState, purpose }.",
    "id like beat_1; durationSec number 2–8; 3–8 beats total.",
    "onScreen is the text that appears; hole is what media fills (image/video).",
    "entryState / exitState describe viewer knowledge; purpose is why the beat exists.",
    "Use ONLY these checked figures when mentioning numbers:",
    figureBlock,
    "",
    "Director brief:",
    buildBriefBlock(brief),
    "",
    "Motion spec:",
    specBlock || "(none)",
    "",
    "Story brief:",
    String(storyBrief || "").trim() || "(empty)",
    recipeAddon ? `\nCraft guidance: ${recipeAddon}` : "",
  ].join("\n");
}

/**
 * @param {string} raw
 * @returns {ProductionBeat[]}
 */
export function parseBeatsJson(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  let jsonText = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) jsonText = fence[1].trim();
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Beats response is not a JSON array");
  }
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Beats must be an array");

  return parsed.slice(0, 8).map((item, i) => {
    const id =
      typeof item?.id === "string" && item.id.trim()
        ? item.id.trim()
        : `beat_${i + 1}`;
    const durationSec = Number(item?.durationSec);
    return {
      id,
      title: String(item?.title || `Beat ${i + 1}`).trim(),
      onScreen: String(item?.onScreen || "").trim(),
      durationSec:
        Number.isFinite(durationSec) && durationSec > 0
          ? Math.min(12, Math.max(1, durationSec))
          : 4,
      hole: String(item?.hole || "video").trim(),
      direction: String(item?.direction || "").trim(),
      entryState: String(item?.entryState || "").trim(),
      exitState: String(item?.exitState || "").trim(),
      purpose: String(item?.purpose || "").trim(),
      imageUrl: null,
      videoUrl: null,
      audioUrl: null,
    };
  });
}

/**
 * @param {ProductionBeat} beat
 * @param {ProductionFigure[]} [figures]
 * @param {string | null} [gradeClause]
 * @param {ProductionBrief} [brief]
 * @returns {string}
 */
export function beatToGenerationPrompt(
  beat,
  figures = [],
  gradeClause = null,
  brief = {},
) {
  const figLines =
    Array.isArray(figures) && figures.length
      ? figures.map((f) => `${f.label} ${f.value}`).join("; ")
      : "";
  const format = Array.isArray(brief.formats) && brief.formats[0]
    ? brief.formats[0]
    : "16:9";
  const parts = [
    beat?.title || "",
    beat?.onScreen ? `On-screen text: "${beat.onScreen}"` : "",
    beat?.hole ? `Visual: ${beat.hole}` : "",
    beat?.entryState ? `Entry state: ${beat.entryState}` : "",
    beat?.exitState ? `Exit state: ${beat.exitState}` : "",
    beat?.purpose ? `Purpose: ${beat.purpose}` : "",
    beat?.direction || "",
    figLines ? `Checked figures (do not invent others): ${figLines}` : "",
    brief.keep ? `Keep: ${brief.keep}` : "",
    brief.avoid ? `Avoid: ${brief.avoid}` : "",
    `Aspect ratio composition: ${format}`,
    gradeClause || "",
    "Cinematic frame, clear subject, high detail",
  ];
  return parts.filter((p) => p && String(p).trim()).join(". ");
}

/**
 * Cumulative timestamp at the start of each beat.
 * @param {ProductionBeat[]} beats
 * @returns {Array<{ beatId: string, timestampSec: number, title: string, imageUrl?: string|null, videoUrl?: string|null, onScreen?: string }>}
 */
export function beatTimelineIndex(beats) {
  let t = 0;
  return (beats || []).map((b) => {
    const row = {
      beatId: b.id,
      timestampSec: t,
      title: b.title,
      imageUrl: b.imageUrl || null,
      videoUrl: b.videoUrl || null,
      onScreen: b.onScreen || "",
    };
    t += typeof b.durationSec === "number" ? b.durationSec : 4;
    return row;
  });
}

/**
 * @param {{ beats: ProductionBeat[], defectsLimit?: number }} opts
 */
export function buildCriticPrompt({ beats = [], defectsLimit = 3 } = {}) {
  const index = beatTimelineIndex(beats);
  const sheet = index
    .map(
      (row) =>
        `- t=${row.timestampSec}s id=${row.beatId} title="${row.title}" onScreen="${row.onScreen}" still=${row.imageUrl || "none"} video=${row.videoUrl || "none"}`,
    )
    .join("\n");

  return [
    "You are reviewing a contact sheet of a code-assembled production film.",
    "Judge ONLY the listed rendered beats. Do not invent assets or metrics.",
    `Return ONLY a JSON array of at most ${defectsLimit} objects:`,
    '{ "beatId", "timestampSec", "evidence", "fix" }',
    "evidence: what is wrong in the frame; fix: a local direction note for that beat.",
    "Prefer the highest-impact defects (hook, readability, continuity, wrong product).",
    "",
    "Contact sheet:",
    sheet || "(empty)",
  ].join("\n");
}

/**
 * @param {string} raw
 * @param {number} [limit]
 * @returns {ProductionDefect[]}
 */
export function parseDefectsJson(raw, limit = 3) {
  const text = String(raw || "").trim();
  if (!text) return [];
  let jsonText = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) jsonText = fence[1].trim();
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Defects response is not a JSON array");
  }
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Defects must be an array");

  return parsed.slice(0, limit).map((d) => ({
    beatId: String(d?.beatId || "").trim(),
    timestampSec:
      typeof d?.timestampSec === "number" && Number.isFinite(d.timestampSec)
        ? d.timestampSec
        : Number(d?.timestampSec) || 0,
    evidence: String(d?.evidence || "").trim(),
    fix: String(d?.fix || "").trim(),
  }));
}
