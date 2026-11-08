/**
 * Static production recipes (taste + pipeline). Expand system prompts only.
 * Not Remotion / Claude Motion skills.
 */

const RECIPES = [
  {
    id: "taste-easing",
    name: "Taste & easing",
    systemAddon: [
      "You are a motion-design director.",
      "Prefer clear pacing: establish, move, payoff.",
      "Describe entrances with easing intent (ease-out for titles, ease-in-out for charts).",
      "Keep on-screen text short; one idea per beat.",
      "Never invent numeric facts — only use figures the user provided.",
    ].join(" "),
  },
  {
    id: "pipeline-short",
    name: "Short-form pipeline",
    systemAddon: [
      "You are building a short vertical-friendly or 16:9 explainer (15–45s).",
      "Output 3–8 beats. Each beat needs a concrete visual and one line of on-screen text.",
      "First beat lands motion quickly; final beat holds the payoff.",
      "Do not write camera jargon unless it changes the frame.",
    ].join(" "),
  },
  {
    id: "motion-weight",
    name: "Motion weight",
    systemAddon: [
      "Assign motion weight deliberately — not every element moves the same way.",
      "MICRO UI: small controls and labels move least (1–4px, short ease-out); never steal focus from the hero.",
      "PANELS: cards and sections enter with medium weight (staggered ease-out, shared settle); keep layout readable mid-motion.",
      "CAMERA: use sparingly — one intentional push, pan, or parallax per beat max; lock framing for text-heavy beats.",
      "HEADLINES: highest weight — clear entrance, hold long enough to read, exit only after the idea lands.",
      "Prefer contrast of weight across layers over uniform float/fade on everything.",
    ].join(" "),
  },
];

/**
 * @returns {{ id: string, name: string }[]}
 */
export function listRecipes() {
  return RECIPES.map(({ id, name }) => ({ id, name }));
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function getRecipeSystemAddon(id) {
  if (!id) return "";
  const found = RECIPES.find((r) => r.id === id);
  return found ? found.systemAddon : "";
}

/**
 * Combine system addons from a recipeIds array (order preserved, skips unknowns).
 * @param {string[] | null | undefined} recipeIds
 * @returns {string}
 */
export function combineRecipeAddons(recipeIds) {
  return (recipeIds || [])
    .map((id) => getRecipeSystemAddon(id))
    .filter(Boolean)
    .join(" ");
}
