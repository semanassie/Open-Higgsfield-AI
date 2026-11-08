/** Director edit timeline — derived view of shots + videoUrls (version 1). */

/**
 * @typedef {{ startSec: number, durationSec: number|null }} SourceRange
 * @typedef {{ type: 'cut'|'fade', durationSec?: number }} Transition
 * @typedef {{
 *   id: string,
 *   shotId: string,
 *   url: string,
 *   sourceRange: SourceRange,
 *   transition: Transition
 * }} TimelineClip
 * @typedef {{ id: string, type: 'video'|'audio', clips: TimelineClip[] }} TimelineTrack
 * @typedef {{ version: 1, tracks: TimelineTrack[] }} Timeline
 */

/**
 * @param {unknown} timeline
 * @returns {timeline is Timeline}
 */
export function validateTimeline(timeline) {
    if (!timeline || typeof timeline !== 'object') return false;
    if (timeline.version !== 1) return false;
    if (!Array.isArray(timeline.tracks) || timeline.tracks.length !== 2) return false;

    const videoTracks = timeline.tracks.filter((t) => t && t.type === 'video');
    const audioTracks = timeline.tracks.filter((t) => t && t.type === 'audio');
    if (videoTracks.length !== 1 || audioTracks.length !== 1) return false;

    const video = videoTracks[0];
    const audio = audioTracks[0];
    if (!Array.isArray(video.clips) || !Array.isArray(audio.clips)) return false;

    for (const clip of video.clips) {
        if (!clip || typeof clip !== 'object') return false;
        if (typeof clip.shotId !== 'string' || !clip.shotId) return false;
        if (typeof clip.url !== 'string' || !clip.url) return false;
        const sr = clip.sourceRange;
        if (!sr || typeof sr !== 'object') return false;
        if (sr.startSec !== 0) return false;
        if (sr.durationSec !== null && (typeof sr.durationSec !== 'number' || !(sr.durationSec >= 0))) {
            return false;
        }
        const tr = clip.transition;
        if (!tr || typeof tr !== 'object') return false;
        if (tr.type !== 'cut' && tr.type !== 'fade') return false;
        if (tr.type === 'fade') {
            if (typeof tr.durationSec !== 'number' || !(tr.durationSec >= 0)) return false;
        }
    }

    for (const clip of audio.clips) {
        if (!clip || typeof clip !== 'object') return false;
        if (typeof clip.url !== 'string' || !clip.url) return false;
    }

    return true;
}

/**
 * Build a v1 timeline from planned shots and rendered video URLs.
 * Empty/missing URLs are omitted (skip gaps drop the clip); shotId is kept on included clips.
 *
 * @param {Array<{ id?: string }>} shots
 * @param {Array<string|null|undefined>} videoUrls
 * @returns {Timeline}
 */
export function timelineFromShots(shots, videoUrls) {
    const list = Array.isArray(shots) ? shots : [];
    const urls = Array.isArray(videoUrls) ? videoUrls : [];
    /** @type {TimelineClip[]} */
    const clips = [];

    for (let i = 0; i < list.length; i++) {
        const url = urls[i];
        if (!url) continue;
        const shot = list[i] || {};
        clips.push({
            id: `clip_${clips.length + 1}`,
            shotId: typeof shot.id === 'string' && shot.id ? shot.id : `shot_${i + 1}`,
            url: String(url),
            sourceRange: { startSec: 0, durationSec: null },
            transition: { type: 'cut' },
        });
    }

    /** @type {Timeline} */
    const timeline = {
        version: 1,
        tracks: [
            { id: 'video', type: 'video', clips },
            { id: 'audio', type: 'audio', clips: [] },
        ],
    };

    if (!validateTimeline(timeline)) {
        throw new Error('timelineFromShots produced an invalid timeline');
    }
    return timeline;
}
