/**
 * Map production beats → Director-compatible timeline v1 + optional WebAV export.
 */

/**
 * @typedef {{
 *   version: 1,
 *   tracks: Array<{
 *     id: string,
 *     type: 'video'|'audio',
 *     clips: Array<{
 *       id: string,
 *       shotId: string,
 *       url: string,
 *       sourceRange: { startSec: number, durationSec: number|null },
 *       transition: { type: 'cut'|'fade', durationSec?: number }
 *     }>
 *   }>
 * }} ProductionTimeline
 */

/**
 * @param {Array<{ id?: string, videoUrl?: string|null, audioUrl?: string|null }>} beats
 * @returns {ProductionTimeline}
 */
export function beatsToTimeline(beats) {
  const list = Array.isArray(beats) ? beats : [];
  /** @type {ProductionTimeline['tracks'][0]['clips']} */
  const videoClips = [];
  /** @type {ProductionTimeline['tracks'][0]['clips']} */
  const audioClips = [];

  for (let i = 0; i < list.length; i++) {
    const url = list[i]?.videoUrl;
    if (!url) continue;
    const shotId =
      typeof list[i].id === "string" && list[i].id
        ? list[i].id
        : `beat_${i + 1}`;
    videoClips.push({
      id: `clip_${videoClips.length + 1}`,
      shotId,
      url: String(url),
      sourceRange: { startSec: 0, durationSec: null },
      transition: { type: "cut" },
    });
    const audioUrl = list[i]?.audioUrl;
    if (audioUrl) {
      audioClips.push({
        id: `aclip_${audioClips.length + 1}`,
        shotId,
        url: String(audioUrl),
        sourceRange: { startSec: 0, durationSec: null },
        transition: { type: "cut" },
      });
    }
  }

  return {
    version: 1,
    tracks: [
      { id: "video", type: "video", clips: videoClips },
      { id: "audio", type: "audio", clips: audioClips },
    ],
  };
}

/**
 * @param {ProductionTimeline} timeline
 * @returns {boolean}
 */
export function validateProductionTimeline(timeline) {
  if (!timeline || timeline.version !== 1) return false;
  if (!Array.isArray(timeline.tracks) || timeline.tracks.length !== 2) return false;
  const video = timeline.tracks.find((t) => t.type === "video");
  const audio = timeline.tracks.find((t) => t.type === "audio");
  if (!video || !audio) return false;
  if (!Array.isArray(video.clips) || !Array.isArray(audio.clips)) return false;
  if (video.clips.length < 2) return false;
  return video.clips.every(
    (c) => c && typeof c.url === "string" && c.url && typeof c.shotId === "string",
  );
}

/**
 * @param {ProductionTimeline} timeline
 * @returns {{ timelineJson: string, urls: string[] }}
 */
export function timelineDownloadPayload(timeline) {
  const video = timeline?.tracks?.find((t) => t.type === "video");
  const urls = (video?.clips || []).map((c) => c.url);
  return {
    timelineJson: JSON.stringify(timeline, null, 2),
    urls,
  };
}

/**
 * Trigger browser downloads for timeline JSON and a plain URL list.
 * @param {ProductionTimeline} timeline
 */
export function downloadTimelineFallback(timeline) {
  if (typeof document === "undefined") return;
  const { timelineJson, urls } = timelineDownloadPayload(timeline);
  const jsonBlob = new Blob([timelineJson], { type: "application/json" });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const a = document.createElement("a");
  a.href = jsonUrl;
  a.download = "production-timeline.json";
  a.click();
  URL.revokeObjectURL(jsonUrl);

  const listBlob = new Blob([urls.join("\n")], { type: "text/plain" });
  const listUrl = URL.createObjectURL(listBlob);
  const b = document.createElement("a");
  b.href = listUrl;
  b.download = "production-clip-urls.txt";
  b.click();
  URL.revokeObjectURL(listUrl);
}

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
 * @param {import('@webav/av-cliper').OffscreenSprite[]} sprites
 * @param {{ Combinator: any, fixFMP4Duration: any, width: number, height: number }} webav
 * @returns {Promise<string>}
 */
async function combinatorToBlobUrl(sprites, webav) {
  const { Combinator, fixFMP4Duration, width, height } = webav;
  const combinator = new Combinator({ width, height });
  for (const spr of sprites) {
    await combinator.addSprite(spr);
  }
  const outStream = combinator.output();
  const fixed = await fixFMP4Duration(outStream);
  const chunks = await readStreamChunks(fixed);
  combinator.destroy?.();
  return URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
}

/**
 * Export timeline via WebAV. Throws if unsupported or fewer than 2 clips.
 * When audio clips exist, muxes AudioClip sprites; on audio failure keeps video-only
 * and reports via onStatus (does not change timeline schema version).
 *
 * @param {ProductionTimeline} timeline
 * @param {{ onStatus?: (msg: string) => void }} [options]
 * @returns {Promise<string>} blob: URL
 */
export async function exportProductionTimeline(timeline, options = {}) {
  const { onStatus } = options;
  if (!validateProductionTimeline(timeline)) {
    throw new Error("Need at least two beats with video URLs to assemble");
  }

  onStatus?.("Loading WebAV…");
  const {
    Combinator,
    MP4Clip,
    AudioClip,
    OffscreenSprite,
    fastConcatMP4,
    fixFMP4Duration,
  } = await import("@webav/av-cliper");

  if (typeof Combinator.isSupported === "function") {
    const ok = await Combinator.isSupported();
    if (!ok) throw new Error("WebAV Combinator is not supported in this browser");
  }

  const clips = timeline.tracks.find((t) => t.type === "video").clips;
  const audioTrackClips =
    timeline.tracks.find((t) => t.type === "audio")?.clips || [];
  const hasAudio = audioTrackClips.length > 0;

  // Prefer fast concat when all cuts and no separate audio track
  if (!hasAudio && clips.every((c) => c.transition?.type === "cut")) {
    try {
      onStatus?.("Downloading clips…");
      /** @type {ArrayBuffer[]} */
      const buffers = [];
      let refMeta = null;
      for (let i = 0; i < clips.length; i++) {
        onStatus?.(`Downloading clip ${i + 1}/${clips.length}…`);
        const res = await fetch(clips[i].url);
        if (!res.ok) throw new Error(`Failed to fetch clip ${i + 1}: ${res.status}`);
        const buf = await res.arrayBuffer();
        const probe = new MP4Clip(new Blob([buf], { type: "video/mp4" }).stream());
        await probe.ready;
        const meta = {
          width: probe.meta.width,
          height: probe.meta.height,
          audioSampleRate: probe.meta.audioSampleRate,
        };
        probe.destroy?.();
        if (!refMeta) refMeta = meta;
        else if (
          meta.width !== refMeta.width ||
          meta.height !== refMeta.height ||
          (meta.audioSampleRate || 0) !== (refMeta.audioSampleRate || 0)
        ) {
          throw new Error("mismatched codecs");
        }
        buffers.push(buf);
      }
      onStatus?.("Stitching…");
      const streams = buffers.map((b) => new Blob([b], { type: "video/mp4" }).stream());
      const out = await fastConcatMP4(streams);
      const fixed = await fixFMP4Duration(out);
      const chunks = await readStreamChunks(fixed);
      return URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
    } catch {
      // fall through to Combinator
    }
  }

  onStatus?.("Compositing…");
  /** @type {Array<{ shotId: string, spr: any, durationUs: number, offsetUs: number }>} */
  const videoPrepared = [];
  let offsetUs = 0;
  let width = 1280;
  let height = 720;

  for (let i = 0; i < clips.length; i++) {
    onStatus?.(`Preparing clip ${i + 1}/${clips.length}…`);
    const res = await fetch(clips[i].url);
    if (!res.ok) throw new Error(`Failed to fetch clip ${i + 1}: ${res.status}`);
    const buf = await res.arrayBuffer();
    const mp4 = new MP4Clip(new Blob([buf], { type: "video/mp4" }).stream());
    await mp4.ready;
    if (i === 0) {
      width = mp4.meta.width || width;
      height = mp4.meta.height || height;
    }
    const durationUs = mp4.meta.duration || 0;
    const spr = new OffscreenSprite(mp4);
    spr.time = { offset: offsetUs, duration: durationUs };
    videoPrepared.push({
      shotId: clips[i].shotId,
      spr,
      durationUs,
      offsetUs,
    });
    offsetUs += durationUs;
  }

  const videoSprites = videoPrepared.map((p) => p.spr);

  if (!hasAudio) {
    return combinatorToBlobUrl(videoSprites, {
      Combinator,
      fixFMP4Duration,
      width,
      height,
    });
  }

  // Mux beat audio via AudioClip + OffscreenSprite; on failure keep video-only
  try {
    onStatus?.("Muxing audio…");
    const audioSprites = [];
    for (let i = 0; i < audioTrackClips.length; i++) {
      const aClip = audioTrackClips[i];
      const match =
        videoPrepared.find((v) => v.shotId === aClip.shotId) ||
        videoPrepared[i] ||
        null;
      if (!match) continue;
      onStatus?.(`Preparing audio ${i + 1}/${audioTrackClips.length}…`);
      const res = await fetch(aClip.url);
      if (!res.ok) throw new Error(`Failed to fetch audio ${i + 1}: ${res.status}`);
      const body = res.body;
      if (!body) throw new Error(`Audio ${i + 1} has no body stream`);
      const audio = new AudioClip(body);
      await audio.ready;
      const spr = new OffscreenSprite(audio);
      const audioDur = audio.meta?.duration || match.durationUs;
      spr.time = {
        offset: match.offsetUs,
        duration: Math.min(audioDur, match.durationUs) || match.durationUs,
      };
      audioSprites.push(spr);
    }
    return combinatorToBlobUrl([...videoSprites, ...audioSprites], {
      Combinator,
      fixFMP4Duration,
      width,
      height,
    });
  } catch (audioErr) {
    const msg =
      audioErr && typeof audioErr === "object" && "message" in audioErr
        ? String(/** @type {{ message?: string }} */ (audioErr).message)
        : String(audioErr);
    onStatus?.(`Audio mux failed (${msg}). Exporting video-only…`);
    return combinatorToBlobUrl(videoSprites, {
      Combinator,
      fixFMP4Duration,
      width,
      height,
    });
  }
}
