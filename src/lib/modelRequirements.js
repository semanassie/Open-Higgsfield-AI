import {
    getModelById, getVideoModelById, getI2IModelById, getI2VModelById,
    getV2VModelById, getLipSyncModelById, getMaxImagesForI2IModel,
    getTTSModelById, getMusicModelById, getSFXModelById,
} from './models.js';
import { appCategories } from './appsList.js';

/** Apps used outside AppsGallery cards (viral presets, etc.) */
const EXTRA_APP_SCHEMAS = {
    'higgsfield-dop-image-to-video': {
        inputs: {
            image_url: { type: 'image', title: 'Image', required: true },
            prompt: { type: 'text', title: 'Prompt' },
            motion: { type: 'text', title: 'Motion', required: true },
            options: { type: 'select', title: 'Options', enum: ['dop-lite', 'dop-pro'], default: 'dop-lite' },
            strength: { type: 'number', title: 'Strength', default: 1 },
            aspect_ratio: { type: 'select', title: 'Aspect Ratio', enum: ['9:16', '16:9', '1:1'], default: '9:16' },
        },
    },
    'gemini-omni-character': {
        inputs: {
            descriptions: { type: 'text', title: 'Description', required: true },
            images_list: { type: 'text', title: 'Image URLs', required: true },
            character_name: { type: 'text', title: 'Character Name' },
        },
    },
    'seedance-2-omni-reference-train': {
        inputs: {
            image_url: { type: 'image', title: 'Portrait', required: true },
            character_name: { type: 'text', title: 'Character Name', required: true },
            description: { type: 'text', title: 'Description' },
        },
    },
};

const PROMPT_MIN = 2;
const PROMPT_MAX = 3000;

const AR_DIMENSIONS = {
    '1:1': [1024, 1024],
    '16:9': [1280, 720],
    '9:16': [720, 1280],
    '4:3': [1152, 864],
    '3:4': [864, 1152],
    '3:2': [1216, 832],
    '2:3': [832, 1216],
    '21:9': [1536, 640],
    '9:21': [640, 1536],
};

export function getModelDefinition(category, modelId) {
    switch (category) {
        case 't2i': return getModelById(modelId);
        case 't2v': return getVideoModelById(modelId);
        case 'i2i': return getI2IModelById(modelId);
        case 'i2v': return getI2VModelById(modelId);
        case 'v2v': return getV2VModelById(modelId);
        case 'lipsync': return getLipSyncModelById(modelId);
        default: return null;
    }
}

function snapInt(value, spec) {
    let n = Math.round(Number(value));
    if (Number.isNaN(n)) n = spec?.default ?? spec?.minValue ?? 0;
    if (spec?.minValue != null) n = Math.max(spec.minValue, n);
    if (spec?.maxValue != null) n = Math.min(spec.maxValue, n);
    if (spec?.step) {
        const base = spec.minValue ?? 0;
        n = base + Math.round((n - base) / spec.step) * spec.step;
    }
    return n;
}

function validateEnum(fieldName, value, spec, errors) {
    if (value == null || value === '') return spec?.default ?? null;
    const str = String(value);
    if (spec.enum && !spec.enum.map(String).includes(str)) {
        errors.push(`${fieldName} must be one of: ${spec.enum.join(', ')}`);
        return spec.default ?? spec.enum[0];
    }
    return spec.type === 'int' ? parseInt(str, 10) : str;
}

function validatePrompt(prompt, required, errors) {
    const trimmed = (prompt ?? '').trim();
    if (required && !trimmed) {
        errors.push('Prompt is required for this model.');
        return null;
    }
    if (trimmed && (trimmed.length < PROMPT_MIN || trimmed.length > PROMPT_MAX)) {
        errors.push(`Prompt must be between ${PROMPT_MIN} and ${PROMPT_MAX} characters.`);
    }
    return trimmed || null;
}

function dimensionsFromAspectRatio(ar, widthSpec, heightSpec) {
    const pair = AR_DIMENSIONS[ar] || AR_DIMENSIONS['1:1'];
    return [snapInt(pair[0], widthSpec), snapInt(pair[1], heightSpec)];
}

/**
 * Validate studio params against model schema. Returns normalized values for API payload.
 * @param {'t2i'|'t2v'|'i2i'|'i2v'|'v2v'|'lipsync'} category
 * @param {string} modelId
 * @param {Object} params
 * @returns {{ valid: boolean, errors: string[], normalized: Object, model: Object|null }}
 */
export function validateModelParams(category, modelId, params = {}) {
    const errors = [];
    const model = getModelDefinition(category, modelId);
    if (!model) {
        return { valid: false, errors: [`Unknown model: ${modelId}`], normalized: {}, model: null };
    }

    const inputs = model.inputs || {};
    const normalized = { model: modelId };

    if (model.requiresRequestId) {
        const rid = params.request_id;
        if (!rid) errors.push('A previous generation request ID is required to extend this video.');
        else normalized.request_id = String(rid);
    }

    const promptRequired =
        category === 't2i' ||
        (category === 't2v' && !model.requiresRequestId) ||
        (category === 'i2v' && model.hasPrompt !== false);
    const promptOptional =
        category === 'i2i' && model.hasPrompt !== false;

    if (inputs.prompt || promptRequired || promptOptional) {
        const p = validatePrompt(params.prompt, promptRequired, errors);
        if (p) normalized.prompt = p;
    }

    if (category === 'i2i' || category === 'i2v') {
        const imageField = model.imageField || 'image_url';

        if (model.startImageField && imageField === 'last_image') {
            const start = params[model.startImageField] || params.image_url;
            if (!start) errors.push('A start frame image is required.');
            else normalized[model.startImageField] = start;
            const end = params.last_image || params[imageField];
            if (!end) errors.push('An end frame image is required.');
            else normalized.last_image = end;
        } else if (imageField === 'reference_video_url') {
            if (!params.image_url) errors.push('A character image is required.');
            else normalized.image_url = params.image_url;
            const ref = params.reference_video_url || params.video_url;
            if (!ref) errors.push('A reference motion video is required.');
            else normalized.reference_video_url = ref;
        } else if (imageField === 'videos_list') {
            const videos = params.videos_list?.length
                ? params.videos_list
                : (params.video_url ? [params.video_url] : []);
            if (videos.length === 0) errors.push('A reference video is required.');
            else normalized.videos_list = videos.slice(0, 1);
        } else {
            const images = params.images_list?.length
                ? params.images_list
                : (params.image_url ? [params.image_url] : []);
            if (images.length === 0) {
                errors.push('A reference image is required.');
            } else {
                const max = category === 'i2i' ? getMaxImagesForI2IModel(modelId) : 1;
                if (images.length > max) {
                    errors.push(`This model accepts at most ${max} image(s).`);
                }
                if (imageField === 'images_list') {
                    normalized.images_list = images.slice(0, max);
                } else {
                    normalized[imageField] = images[0];
                }
            }
        }
    }

    if (category === 'v2v') {
        if (model.requiresRequestId) {
            // request_id validated above; no source video needed
        } else if (model.videoField === 'image_url') {
            if (!params.image_url) errors.push('A reference image is required.');
            else normalized.image_url = params.image_url;
        } else {
            const videoField = model.videoField || 'video_url';
            if (!params.video_url) errors.push('A source video is required.');
            else normalized[videoField] = params.video_url;
        }
    }

    if (category === 'lipsync') {
        if (!params.audio_url) errors.push('An audio file is required.');
        else normalized.audio_url = params.audio_url;
        if (model.category === 'video') {
            if (!params.video_url) errors.push('A source video is required.');
            else normalized.video_url = params.video_url;
        } else {
            if (!params.image_url) errors.push('A portrait image is required.');
            else normalized.image_url = params.image_url;
        }
    }

    if (inputs.aspect_ratio && !model.requiresRequestId) {
        normalized.aspect_ratio = validateEnum('aspect_ratio', params.aspect_ratio, inputs.aspect_ratio, errors);
    }

    if (inputs.width && inputs.height && !inputs.aspect_ratio) {
        const [w, h] = dimensionsFromAspectRatio(
            params.aspect_ratio || inputs.aspect_ratio?.default || '1:1',
            inputs.width,
            inputs.height
        );
        normalized.width = w;
        normalized.height = h;
    }

    if (inputs.duration) {
        normalized.duration = validateEnum('duration', params.duration, inputs.duration, errors);
    }

    if (inputs.resolution && params.resolution) {
        normalized.resolution = validateEnum('resolution', params.resolution, inputs.resolution, errors);
    } else if (inputs.resolution?.default && params.resolution !== '') {
        normalized.resolution = params.resolution || inputs.resolution.default;
    }

    if (inputs.quality) {
        const q = params.quality ?? inputs.quality.default;
        if (q != null && q !== '') {
            normalized.quality = validateEnum('quality', q, inputs.quality, errors);
        }
    }

    if (inputs.mode) {
        const m = params.mode ?? inputs.mode.default;
        if (m != null && m !== '') {
            normalized.mode = validateEnum('mode', m, inputs.mode, errors);
        }
    }

    if (params.seed != null && params.seed !== -1) {
        normalized.seed = Number(params.seed);
    }

    if (params.strength != null && category === 't2i' && params.image_url) {
        normalized.strength = Number(params.strength);
    }

    if (params.negative_prompt != null && String(params.negative_prompt).trim()) {
        normalized.negative_prompt = String(params.negative_prompt).trim();
    }

    const handledInputs = new Set([
        'prompt', 'aspect_ratio', 'width', 'height', 'duration', 'resolution',
        'quality', 'mode', 'request_id',
    ]);
    for (const [fieldName, spec] of Object.entries(inputs)) {
        if (handledInputs.has(fieldName)) continue;
        const raw = params[fieldName];
        if (raw == null || raw === '') {
            if (spec.default != null && spec.default !== '') {
                normalized[fieldName] = spec.type === 'int' ? snapInt(spec.default, spec) : spec.default;
            }
            continue;
        }
        if (spec.enum) {
            normalized[fieldName] = validateEnum(fieldName, raw, spec, errors);
        } else if (spec.type === 'int') {
            normalized[fieldName] = snapInt(raw, spec);
        } else if (spec.type === 'boolean') {
            normalized[fieldName] = Boolean(raw);
        } else {
            normalized[fieldName] = raw;
        }
    }

    if (params.extraPayload && typeof params.extraPayload === 'object') {
        Object.assign(normalized, params.extraPayload);
    }

    return { valid: errors.length === 0, errors, normalized, model };
}

/**
 * Build a MuAPI-ready JSON body (omits null/undefined, maps image fields).
 * @param {'t2i'|'t2v'|'i2i'|'i2v'|'v2v'|'lipsync'} category
 * @param {string} modelId
 * @param {Object} params
 */
export function buildApiPayload(category, modelId, params = {}) {
    const { valid, errors, normalized, model } = validateModelParams(category, modelId, params);
    if (!valid) {
        throw new Error(errors.join(' '));
    }

    const payload = {};
    const skip = new Set([
        'model', 'onRequestId', 'images_list', 'image_url', 'video_url', 'extraPayload',
        'videos_list', 'reference_video_url', 'last_image', 'request_id',
    ]);

    for (const [key, value] of Object.entries(normalized)) {
        if (skip.has(key)) continue;
        if (value !== null && value !== undefined && value !== '') {
            payload[key] = value;
        }
    }

    if (category === 'i2i' || category === 'i2v') {
        const imageField = model.imageField || 'image_url';
        if (imageField === 'images_list' && normalized.images_list) {
            payload.images_list = normalized.images_list;
        } else if (imageField === 'videos_list' && normalized.videos_list) {
            payload.videos_list = normalized.videos_list;
        } else if (imageField === 'reference_video_url') {
            if (normalized.image_url) payload.image_url = normalized.image_url;
            if (normalized.reference_video_url) payload.reference_video_url = normalized.reference_video_url;
        } else if (imageField === 'last_image' || model.startImageField) {
            if (normalized.image_url) payload.image_url = normalized.image_url;
            if (normalized.last_image) payload.last_image = normalized.last_image;
        } else {
            const field = imageField === 'images_list' ? 'image_url' : imageField;
            const src = normalized.images_list?.[0] ?? normalized[imageField] ?? params.image_url;
            if (src) payload[field] = src;
        }
    }

    if (category === 'v2v') {
        if (model.requiresRequestId && normalized.request_id) {
            payload.request_id = normalized.request_id;
        } else if (model.videoField === 'image_url' && normalized.image_url) {
            payload.image_url = normalized.image_url;
        } else {
            const videoField = model.videoField || 'video_url';
            payload[videoField] = normalized[videoField] || params.video_url;
        }
    }

    if (category === 'lipsync') {
        if (normalized.audio_url) payload.audio_url = normalized.audio_url;
        if (normalized.image_url) payload.image_url = normalized.image_url;
        if (normalized.video_url) payload.video_url = normalized.video_url;
    }

    if (category === 't2i' && params.image_url) {
        payload.image_url = params.image_url;
        if (params.strength != null) payload.strength = params.strength;
    }

    return payload;
}

export function getEndpointForModel(category, modelId) {
    const model = getModelDefinition(category, modelId);
    return model?.endpoint || modelId;
}

export function getAppById(appId) {
    for (const cat of appCategories) {
        const app = cat.apps.find((a) => a.id === appId);
        if (app) return app;
    }
    if (EXTRA_APP_SCHEMAS[appId]) {
        return { id: appId, ...EXTRA_APP_SCHEMAS[appId] };
    }
    return null;
}

export function getAudioModelDefinition(subcategory, modelId) {
    switch (subcategory) {
        case 'tts': return getTTSModelById(modelId);
        case 'music': return getMusicModelById(modelId);
        case 'sfx': return getSFXModelById(modelId);
        default: return null;
    }
}

/**
 * @param {string} appId
 * @param {Object} params
 */
export function validateAppParams(appId, params = {}) {
    const app = getAppById(appId);
    if (!app) {
        return { valid: false, errors: [`Unknown app: ${appId}`], normalized: {}, app: null };
    }

    const errors = [];
    const normalized = {};

    for (const [key, spec] of Object.entries(app.inputs || {})) {
        let raw = params[key];

        if ((key === 'video_urls' || key === 'videos_list') && typeof raw === 'string') {
            raw = raw.split('\n').map((s) => s.trim()).filter(Boolean);
        }

        if ((key === 'videos_list' || key === 'images_list') && Array.isArray(raw)) {
            if (spec.required && raw.length === 0) {
                errors.push(`${spec.title || key} is required.`);
                continue;
            }
            normalized[key] = raw;
            continue;
        }

        const isEmpty = raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);

        if (spec.required && isEmpty) {
            errors.push(`${spec.title || key} is required.`);
            continue;
        }

        if (isEmpty) {
            if (spec.default != null && spec.default !== '') {
                normalized[key] = spec.default;
            }
            continue;
        }

        if (spec.type === 'select' && spec.enum) {
            let val = validateEnum(key, raw, { enum: spec.enum, default: spec.default }, errors);
            if (key === 'aspect_ratio' && typeof val === 'string') {
                val = val.toLowerCase();
            }
            normalized[key] = val;
        } else if (spec.type === 'boolean') {
            normalized[key] = Boolean(raw);
        } else if (spec.type === 'int' || spec.type === 'number') {
            normalized[key] = snapInt(raw, spec);
        } else {
            normalized[key] = raw;
        }
    }

    return { valid: errors.length === 0, errors, normalized, app };
}

export function buildAppPayload(appId, params = {}) {
    const { valid, errors, normalized } = validateAppParams(appId, params);
    if (!valid) throw new Error(errors.join(' '));
    return normalized;
}

/**
 * @param {'tts'|'music'|'sfx'} subcategory
 * @param {string} modelId
 * @param {Object} params
 */
export function validateAudioParams(subcategory, modelId, params = {}) {
    const model = getAudioModelDefinition(subcategory, modelId);
    if (!model) {
        return { valid: false, errors: [`Unknown audio model: ${modelId}`], normalized: {}, model: null };
    }

    const errors = [];
    const normalized = {};
    const inputs = model.inputs || {};

    if (subcategory === 'tts') {
        const prompt = (params.prompt ?? params.text ?? '').trim();
        if (!prompt) errors.push('Text is required.');
        else normalized.prompt = prompt;
    } else {
        const prompt = (params.prompt ?? '').trim();
        if (!prompt) errors.push('Prompt is required.');
        else normalized.prompt = prompt;
    }

    for (const [fieldName, spec] of Object.entries(inputs)) {
        if (fieldName === 'text' || fieldName === 'prompt') continue;

        const raw = params[fieldName];
        if (raw == null || raw === '') {
            if (spec.default != null && spec.default !== '') {
                normalized[fieldName] = spec.type === 'boolean' ? spec.default : spec.default;
            }
            continue;
        }

        if (spec.enum) {
            normalized[fieldName] = validateEnum(fieldName, raw, spec, errors);
        } else if (spec.type === 'number' || spec.type === 'int') {
            let n = Number(raw);
            if (Number.isNaN(n)) n = spec.default ?? 1;
            if (spec.minValue != null) n = Math.max(spec.minValue, n);
            if (spec.maxValue != null) n = Math.min(spec.maxValue, n);
            normalized[fieldName] = n;
        } else if (spec.type === 'boolean') {
            normalized[fieldName] = Boolean(raw);
        } else {
            normalized[fieldName] = String(raw).trim();
        }
    }

    return { valid: errors.length === 0, errors, normalized, model };
}

export function buildAudioPayload(subcategory, modelId, params = {}) {
    const { valid, errors, normalized } = validateAudioParams(subcategory, modelId, params);
    if (!valid) throw new Error(errors.join(' '));
    return normalized;
}
