/** Local timeline export via WebAV Combinator (ffmpeg remains a DirectorStudio fallback). */

import { validateTimeline } from './directorTimeline.js';
import { layoutClipsWithOpacityFade } from './directorFade.js';

const US = 1e6;

/**
 * @param {ReadableStream<Uint8Array>} stream
 * @returns {Promise<Uint8Array[]>}
 */
async function readStreamChunks(stream) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    return chunks;
}

/**
 * @param {ReadableStream<Uint8Array>} stream
 * @param {(s: ReadableStream<Uint8Array>) => Promise<ReadableStream<Uint8Array>>} fixFMP4Duration
 * @returns {Promise<string>} blob: URL
 */
async function streamToBlobUrl(stream, fixFMP4Duration) {
    const fixed = await fixFMP4Duration(stream);
    const chunks = await readStreamChunks(fixed);
    const blob = new Blob(chunks, { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}

/**
 * @param {import('./directorTimeline.js').TimelineClip[]} clips
 * @param {{ MP4Clip: any, fastConcatMP4: any, fixFMP4Duration: any }} webav
 * @param {(msg: string) => void} [onStatus]
 * @returns {Promise<string|null>}
 */
async function tryFastConcat(clips, webav, onStatus) {
    const { MP4Clip, fastConcatMP4, fixFMP4Duration } = webav;
    if (!clips.length || clips.some((c) => c.transition?.type !== 'cut')) return null;

    /** @type {ArrayBuffer[]} */
    const buffers = [];
    /** @type {Array<{ width: number, height: number, audioSampleRate?: number }>} */
    const metas = [];

    for (let i = 0; i < clips.length; i++) {
        onStatus?.(`Downloading clip ${i + 1}/${clips.length}…`);
        const res = await fetch(clips[i].url);
        if (!res.ok) throw new Error(`Failed to fetch clip ${i + 1}: ${res.status}`);
        const buf = await res.arrayBuffer();
        buffers.push(buf);

        const probe = new MP4Clip(new Blob([buf], { type: 'video/mp4' }).stream());
        await probe.ready;
        metas.push({
            width: probe.meta.width,
            height: probe.meta.height,
            audioSampleRate: probe.meta.audioSampleRate,
        });
        probe.destroy?.();
    }

    const ref = metas[0];
    for (let i = 1; i < metas.length; i++) {
        const m = metas[i];
        if (m.width !== ref.width || m.height !== ref.height) return null;
        if ((m.audioSampleRate || 0) !== (ref.audioSampleRate || 0)) return null;
    }

    onStatus?.('Stitching (fast concat)…');
    const streams = buffers.map((b) => new Blob([b], { type: 'video/mp4' }).stream());
    const out = await fastConcatMP4(streams);
    return streamToBlobUrl(out, fixFMP4Duration);
}

/**
 * Export a validated timeline to a local blob: video/mp4 URL using WebAV.
 *
 * @param {import('./directorTimeline.js').Timeline} timeline
 * @param {{ onStatus?: (msg: string) => void }} [options]
 * @returns {Promise<string>} blob URL
 */
export async function exportTimelineLocally(timeline, options = {}) {
    const { onStatus } = options;
    if (!validateTimeline(timeline)) {
        throw new Error('Invalid timeline');
    }

    onStatus?.('Loading WebAV…');
    const {
        Combinator,
        MP4Clip,
        OffscreenSprite,
        fastConcatMP4,
        fixFMP4Duration,
    } = await import('@webav/av-cliper');

    const supported = await Combinator.isSupported();
    if (!supported) {
        throw new Error('WebAV Combinator is not supported in this environment');
    }

    const videoTrack = timeline.tracks.find((t) => t.type === 'video');
    const clips = videoTrack?.clips || [];
    if (clips.length < 2) {
        throw new Error('Need at least 2 timeline clips to export');
    }

    const fastUrl = await tryFastConcat(
        clips,
        { MP4Clip, fastConcatMP4, fixFMP4Duration },
        onStatus,
    );
    if (fastUrl) return fastUrl;

    onStatus?.('Compositing with Combinator…');
    /** @type {Array<{ clip: any, spr: any, url: string, transition: any, sourceRange: any }>} */
    const prepared = [];

    for (let i = 0; i < clips.length; i++) {
        onStatus?.(`Loading clip ${i + 1}/${clips.length}…`);
        const res = await fetch(clips[i].url);
        if (!res.ok) throw new Error(`Failed to fetch clip ${i + 1}: ${res.status}`);
        const mp4 = new MP4Clip(res.body);
        await mp4.ready;
        const spr = new OffscreenSprite(mp4);
        await spr.ready;
        prepared.push({
            clip: mp4,
            spr,
            url: clips[i].url,
            transition: clips[i].transition,
            sourceRange: clips[i].sourceRange,
        });
    }

    const width = prepared[0].clip.meta.width || 1280;
    const height = prepared[0].clip.meta.height || 720;

    const layoutInputs = prepared.map((p) => {
        const fullSec = (p.clip.meta.duration || 0) / US;
        const durationSec =
            p.sourceRange.durationSec != null ? Number(p.sourceRange.durationSec) : fullSec;
        return {
            durationSec,
            transition: p.transition,
        };
    });
    const layouts = layoutClipsWithOpacityFade(layoutInputs);

    const com = new Combinator({ width, height });

    for (let i = 0; i < prepared.length; i++) {
        const { spr } = prepared[i];
        const layout = layouts[i];
        const durationUs = Math.round(layout.durationSec * US);
        spr.time = {
            offset: Math.round(layout.offsetSec * US),
            duration: durationUs,
        };
        spr.rect.w = width;
        spr.rect.h = height;
        spr.zIndex = i + 1;

        if (layout.fadeInSec > 0 || layout.fadeOutSec > 0) {
            const fadeInUs = Math.round(layout.fadeInSec * US);
            const fadeOutUs = Math.round(layout.fadeOutSec * US);
            /** @type {Record<string, { opacity: number }>} */
            const keyframes = {};
            if (fadeInUs > 0) {
                keyframes['0%'] = { opacity: 0 };
                const pct = Math.min(99, Math.round((fadeInUs / durationUs) * 100));
                keyframes[`${pct}%`] = { opacity: 1 };
            } else {
                keyframes['0%'] = { opacity: 1 };
            }
            if (fadeOutUs > 0) {
                const startPct = Math.max(1, Math.round(((durationUs - fadeOutUs) / durationUs) * 100));
                keyframes[`${startPct}%`] = { opacity: 1 };
                keyframes['100%'] = { opacity: 0 };
            } else {
                keyframes['100%'] = { opacity: 1 };
            }
            spr.setAnimation(keyframes, { duration: durationUs, iterCount: 1 });
        }

        await com.addSprite(spr, i === 0 ? { main: true } : undefined);
    }

    onStatus?.('Muxing MP4…');
    const outStream = com.output();
    const url = await streamToBlobUrl(outStream, fixFMP4Duration);
    com.destroy?.();
    return url;
}
