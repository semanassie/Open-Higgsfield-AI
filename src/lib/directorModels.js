/**
 * Default model IDs for Director Studio (short film pipeline).
 * Resolved against packages/studio models catalog.
 */

export const DIRECTOR_STILL_T2I = 'nano-banana-2';
export const DIRECTOR_STILL_I2I = 'nano-banana-2-edit';
export const DIRECTOR_CHARACTER_T2I = 'nano-banana-2';

/** Budget I2V — used for quality tier "budget" */
export const DIRECTOR_I2V_BUDGET = 'seedance-lite-i2v';
/** Quality I2V — used for quality tier "quality" */
export const DIRECTOR_I2V_QUALITY = 'seedance-v2.0-i2v';
/** Turbo/mid I2V */
export const DIRECTOR_I2V_TURBO = 'seedance-pro-i2v-fast';

/** T2V fallbacks when I2V fails or no start frame */
export const DIRECTOR_T2V_BUDGET = 'seedance-lite-t2v';
export const DIRECTOR_T2V_QUALITY = 'seedance-v2.0-t2v';

export const DIRECTOR_DEFAULT_SHOT_COUNT = 4;
export const DIRECTOR_MAX_SHOT_COUNT = 8;
export const DIRECTOR_DEFAULT_DURATION_SEC = 5;
export const DIRECTOR_DEFAULT_ASPECT = '16:9';

/** Rough credit hint (USD) for UI warning before Auto — not billing truth */
export const DIRECTOR_CREDIT_HINT = {
    budget: { still: 0.06, video: 0.2 },
    turbo: { still: 0.06, video: 0.75 },
    quality: { still: 0.06, video: 1.25 },
};

export function resolveDirectorModels(qualityTier = 'budget') {
    const tier = ['budget', 'turbo', 'quality'].includes(qualityTier) ? qualityTier : 'budget';
    if (tier === 'quality') {
        return {
            stillT2i: DIRECTOR_STILL_T2I,
            stillI2i: DIRECTOR_STILL_I2I,
            characterT2i: DIRECTOR_CHARACTER_T2I,
            i2v: DIRECTOR_I2V_QUALITY,
            t2v: DIRECTOR_T2V_QUALITY,
            tier,
        };
    }
    if (tier === 'turbo') {
        return {
            stillT2i: DIRECTOR_STILL_T2I,
            stillI2i: DIRECTOR_STILL_I2I,
            characterT2i: DIRECTOR_CHARACTER_T2I,
            i2v: DIRECTOR_I2V_TURBO,
            t2v: DIRECTOR_T2V_BUDGET,
            tier,
        };
    }
    return {
        stillT2i: DIRECTOR_STILL_T2I,
        stillI2i: DIRECTOR_STILL_I2I,
        characterT2i: DIRECTOR_CHARACTER_T2I,
        i2v: DIRECTOR_I2V_BUDGET,
        t2v: DIRECTOR_T2V_BUDGET,
        tier,
    };
}

export function estimateDirectorCostUsd(shotCount, qualityTier = 'budget') {
    const hint = DIRECTOR_CREDIT_HINT[qualityTier] || DIRECTOR_CREDIT_HINT.budget;
    const n = Math.max(1, Number(shotCount) || 1);
    return Number(((hint.still + hint.video) * n).toFixed(2));
}
