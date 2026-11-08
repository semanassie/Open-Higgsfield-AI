/**
 * Gate rules for Production Studio steps 0–3.
 */

/** @type {Record<number, 'brief'|'reference'|'figures'|'story'>} */
const STEP_GATES = {
  0: "brief",
  1: "reference",
  2: "figures",
  3: "story",
};

/**
 * @param {number} step
 * @returns {'brief'|'reference'|'figures'|'story'|null}
 */
export function gateIdForStep(step) {
  return STEP_GATES[step] ?? null;
}

/**
 * Whether the user may leave `step` toward a higher step.
 * @param {{ approvals?: Record<string, boolean> }} project
 * @param {number} step
 */
export function canLeaveStep(project, step) {
  const gate = gateIdForStep(step);
  if (!gate) return true;
  return !!(project?.approvals && project.approvals[gate]);
}

/**
 * Whether navigation to `targetStep` is allowed from current project state.
 * Moving backward is always allowed. Moving forward requires all gates up to
 * the destination's previous gate steps to be approved.
 * @param {{ approvals?: Record<string, boolean>, step?: number }} project
 * @param {number} targetStep
 */
export function canGoToStep(project, targetStep) {
  const current = typeof project?.step === "number" ? project.step : 0;
  if (targetStep <= current) return true;
  for (let s = 0; s < targetStep; s++) {
    if (!canLeaveStep(project, s)) return false;
  }
  return true;
}
