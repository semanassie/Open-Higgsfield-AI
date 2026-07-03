/** Phase 2 — character registration & omni reference endpoints */

export const GEMINI_OMNI_CHARACTER = 'gemini-omni-character';
export const SEEDANCE_OMNI_TRAIN = 'seedance-2-omni-reference-train';

/** Text-to-image model for Character Builder when no reference photo is uploaded */
export const CHARACTER_PORTRAIT_T2I = 'kling-o3-image';
/** Face-preserving restyle when user provides a reference portrait */
export const CHARACTER_FACE_I2I = 'flux-pulid';

export const OMNI_I2V_MODELS = [
    'seedance-2-omni-reference-no-video',
    'seedance-2-omni-reference-no-video-fast',
];

export const OMNI_T2V_MODELS = [
    'seedance-2.0-omni-reference',
    'seedance-2.0-omni-reference-480p',
];

export const SHORTS_DEFAULT_I2V = 'seedance-2-mini-image-to-video';
export const SHORTS_DEFAULT_T2V = 'seedance-2-mini-text-to-video';
export const EXPLAINER_DEFAULT_T2V = 'seedance-2-mini-text-to-video';
