/**
 * Director render helpers — still frames then I2V clips, sequential, per-shot errors.
 */

import { muapi } from './muapi.js';
import { savePendingJob, removePendingJob } from './pendingJobs.js';
import { resolveDirectorModels } from './directorModels.js';
import { saveCharacter, getCharacterById } from './characterLibrary.js';

function trackRequest(shotId, kind) {
    return (requestId) => {
        savePendingJob({
            requestId,
            studioType: 'director',
            shotId,
            kind,
            submittedAt: Date.now(),
        });
    };
}

function clearRequest(result) {
    const id = result?.request_id || result?.id;
    if (id) removePendingJob(id);
}

/**
 * Ensure character has a reference still (generate once if missing).
 */
export async function ensureCharacterStill(binding, models, aspectRatio = '16:9') {
    if (binding.referenceImageUrl) return binding.referenceImageUrl;
    const prompt = `Photoreal character portrait for film continuity. Name: ${binding.name}. ${binding.appearance || 'distinctive features'}. Neutral background, sharp face detail, cinematic lighting.`;
    const res = await muapi.generateImage({
        model: models.characterT2i,
        prompt,
        aspect_ratio: aspectRatio === '9:16' ? '3:4' : '1:1',
        onRequestId: trackRequest(binding.libraryId || binding.name, 'character_still'),
    });
    clearRequest(res);
    const url = res.url || res.outputs?.[0];
    if (url && binding.libraryId) {
        const existing = getCharacterById(binding.libraryId);
        if (existing) {
            saveCharacter({ ...existing, referenceImageUrl: url });
        }
    }
    return url || null;
}

/**
 * Generate start-frame still for one shot.
 * Uses I2I with character reference when available, else T2I.
 */
export async function renderShotStill(shot, {
    models,
    aspectRatio = '16:9',
    characterBindings = [],
} = {}) {
    const modelsResolved = models || resolveDirectorModels('budget');
    const prompt = shot.imagePrompt || shot.action;
    const primaryCharName = (shot.characterIds || [])[0];
    const binding = characterBindings.find(
        (b) => b.name === primaryCharName || b.screenplayId === primaryCharName || b.libraryId === primaryCharName
    );

    let refUrl = binding?.referenceImageUrl || null;
    if (binding && !refUrl) {
        try {
            refUrl = await ensureCharacterStill(binding, modelsResolved, aspectRatio);
            binding.referenceImageUrl = refUrl;
        } catch (e) {
            console.warn('[Director] Character still failed, falling back to T2I:', e.message);
        }
    }

    const onRequestId = trackRequest(shot.id, 'still');

    try {
        let res;
        if (refUrl) {
            res = await muapi.generateI2I({
                model: modelsResolved.stillI2i,
                prompt: `${prompt}. Keep the identity of the reference character (${binding?.name || 'lead'}).`,
                image_url: refUrl,
                aspect_ratio: aspectRatio,
                onRequestId,
            });
        } else {
            res = await muapi.generateImage({
                model: modelsResolved.stillT2i,
                prompt,
                aspect_ratio: aspectRatio,
                onRequestId,
            });
        }
        clearRequest(res);
        const url = res.url || res.outputs?.[0];
        if (!url) throw new Error('No still URL returned');
        return { url, error: null };
    } catch (e) {
        return { url: null, error: e.message || String(e) };
    }
}

/**
 * Generate I2V clip from still; falls back to T2V if I2V fails.
 */
export async function renderShotVideo(shot, stillUrl, {
    models,
    aspectRatio = '16:9',
    durationSec = 5,
} = {}) {
    const modelsResolved = models || resolveDirectorModels('budget');
    const prompt = shot.visualPrompt || shot.action;
    const duration = Number(shot.durationSec) || durationSec || 5;
    const onRequestId = trackRequest(shot.id, 'video');

    if (stillUrl) {
        try {
            const res = await muapi.generateI2V({
                model: modelsResolved.i2v,
                image_url: stillUrl,
                prompt,
                aspect_ratio: aspectRatio,
                duration,
                onRequestId,
            });
            clearRequest(res);
            const url = res.url || res.outputs?.[0];
            if (!url) throw new Error('No video URL returned');
            return { url, error: null, usedFallback: false };
        } catch (e) {
            console.warn('[Director] I2V failed, trying T2V:', e.message);
        }
    }

    try {
        const res = await muapi.generateVideo({
            model: modelsResolved.t2v,
            prompt: stillUrl
                ? `${prompt} (match the start frame composition)`
                : prompt,
            aspect_ratio: aspectRatio,
            duration,
            onRequestId,
        });
        clearRequest(res);
        const url = res.url || res.outputs?.[0];
        if (!url) throw new Error('No video URL returned');
        return { url, error: null, usedFallback: true };
    } catch (e) {
        return { url: null, error: e.message || String(e), usedFallback: true };
    }
}

/**
 * Render all shots sequentially. Mutates stillUrls/videoUrls arrays in place via callbacks.
 * @param {object} opts
 * @param {Function} [opts.onProgress] — (message, index, total)
 * @param {Function} [opts.onShotUpdate] — (index, { stillUrl, videoUrl, error, status })
 * @param {Function} [opts.shouldCancel] — () => boolean
 */
export async function renderAllShots(shots, {
    qualityTier = 'budget',
    aspectRatio = '16:9',
    characterBindings = [],
    existingStills = [],
    existingVideos = [],
    onProgress,
    onShotUpdate,
    shouldCancel,
    skipExisting = true,
} = {}) {
    const models = resolveDirectorModels(qualityTier);
    const stillUrls = [...existingStills];
    const videoUrls = [...existingVideos];
    stillUrls.length = shots.length;
    videoUrls.length = shots.length;

    for (let i = 0; i < shots.length; i++) {
        if (shouldCancel?.()) break;
        const shot = shots[i];

        if (!(skipExisting && stillUrls[i])) {
            onProgress?.(`Still ${i + 1}/${shots.length}…`, i, shots.length);
            onShotUpdate?.(i, { status: 'still' });
            const still = await renderShotStill(shot, { models, aspectRatio, characterBindings });
            stillUrls[i] = still.url;
            if (still.error) {
                onShotUpdate?.(i, { stillUrl: null, error: still.error, status: 'error' });
                continue;
            }
            onShotUpdate?.(i, { stillUrl: still.url, status: 'still_done' });
        }

        if (shouldCancel?.()) break;

        if (!(skipExisting && videoUrls[i])) {
            onProgress?.(`Clip ${i + 1}/${shots.length}…`, i, shots.length);
            onShotUpdate?.(i, { status: 'video' });
            const video = await renderShotVideo(shot, stillUrls[i], {
                models,
                aspectRatio,
                durationSec: shot.durationSec,
            });
            videoUrls[i] = video.url;
            onShotUpdate?.(i, {
                stillUrl: stillUrls[i],
                videoUrl: video.url,
                error: video.error,
                status: video.error ? 'error' : 'done',
            });
        }
    }

    return { stillUrls, videoUrls, models };
}
