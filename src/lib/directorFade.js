/**
 * Opacity crossfade layout in seconds.
 * `cut` does not overlap; `fade` overlaps by transition.durationSec.
 */

/**
 * @typedef {{
 *   durationSec: number,
 *   transition?: { type?: string, durationSec?: number }
 * }} FadeLayoutInput
 *
 * @typedef {{
 *   offsetSec: number,
 *   durationSec: number,
 *   fadeInSec: number,
 *   fadeOutSec: number
 * }} FadeLayoutClip
 */

/**
 * Place clips on a continuous timeline with optional opacity crossfade overlap.
 *
 * Transition on clip i is the outgoing transition into clip i+1.
 * Cut → abut (no overlap). Fade → overlap by durationSec; both clips get fadeOut/fadeIn.
 *
 * @param {FadeLayoutInput[]} clips
 * @returns {FadeLayoutClip[]}
 */
export function layoutClipsWithOpacityFade(clips) {
    const list = Array.isArray(clips) ? clips : [];
    /** @type {FadeLayoutClip[]} */
    const out = [];
    let cursor = 0;

    for (let i = 0; i < list.length; i++) {
        const clip = list[i];
        const durationSec = Number(clip?.durationSec);
        if (!(durationSec > 0)) {
            throw new Error(`layoutClipsWithOpacityFade: invalid durationSec at index ${i}`);
        }

        const next = list[i + 1];
        const outgoing = clip?.transition;
        const overlap =
            next && outgoing?.type === 'fade'
                ? Math.max(0, Number(outgoing.durationSec) || 0)
                : 0;
        // Cap overlap so clips never reverse
        const fadeOutSec = Math.min(overlap, durationSec);
        const prev = list[i - 1];
        const fadeInSec =
            i > 0 && prev?.transition?.type === 'fade'
                ? Math.min(Math.max(0, Number(prev.transition.durationSec) || 0), durationSec)
                : 0;

        out.push({
            offsetSec: cursor,
            durationSec,
            fadeInSec,
            fadeOutSec,
        });

        cursor += durationSec - fadeOutSec;
        if (cursor < 0) cursor = 0;
    }

    return out;
}
