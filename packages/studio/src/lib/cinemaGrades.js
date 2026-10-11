import { grade } from "./mediaContract.js";

/** @typedef {ReturnType<typeof grade>} GradeRecord */

/**
 * Six ASC CDL looks. Numbers stay in the record; browser does not evaluate SOP.
 * @type {Record<string, GradeRecord>}
 */
const GRADES = {
  "neutral-print": grade({
    look: "neutral-print",
    slope: [1, 1, 1],
    offset: [0, 0, 0],
    power: [1, 1, 1],
    sat: 1,
  }),
  "daylight-balanced": grade({
    look: "daylight-balanced",
    slope: [0.98, 1.0, 1.04],
    offset: [0.0, 0.0, 0.01],
    power: [1.0, 1.0, 0.98],
    sat: 1.02,
  }),
  "warm-tungsten": grade({
    look: "warm-tungsten",
    slope: [1.08, 1.0, 0.9],
    offset: [0.02, 0.0, -0.01],
    power: [0.97, 1.0, 1.03],
    sat: 1.05,
  }),
  "cool-moonlight": grade({
    look: "cool-moonlight",
    slope: [0.9, 0.98, 1.1],
    offset: [-0.01, 0.0, 0.02],
    power: [1.02, 1.0, 0.96],
    sat: 0.92,
  }),
  "golden-hour-print": grade({
    look: "golden-hour-print",
    slope: [1.12, 1.02, 0.88],
    offset: [0.03, 0.01, -0.02],
    power: [0.95, 0.98, 1.04],
    sat: 1.08,
  }),
  "bleach-bypass-mild": grade({
    look: "bleach-bypass-mild",
    slope: [1.15, 1.12, 1.1],
    offset: [-0.02, -0.02, -0.01],
    power: [0.92, 0.94, 0.96],
    sat: 0.72,
  }),
};

/** Prompt clauses — natural language only, never CDL numbers. */
const PROMPT_CLAUSES = {
  "neutral-print": null,
  "daylight-balanced": "daylight-balanced color science",
  "warm-tungsten": "warm tungsten print color science",
  "cool-moonlight": "cool moonlight color science",
  "golden-hour-print": "golden hour print color science",
  "bleach-bypass-mild": "mild bleach-bypass color science",
};

/** Stable order for UI dropdowns. */
export const GRADE_IDS = Object.keys(GRADES);

/**
 * @param {string | null | undefined} id
 * @returns {GradeRecord | null}
 */
export function gradeFromId(id) {
  if (id == null || id === "") return null;
  return GRADES[id] ?? null;
}

/**
 * @param {string | null | undefined} id
 * @returns {string | null}
 */
export function gradePromptClause(id) {
  if (id == null || id === "") return null;
  if (!(id in PROMPT_CLAUSES)) return null;
  return PROMPT_CLAUSES[id];
}
