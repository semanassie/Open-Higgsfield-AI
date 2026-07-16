import { muapi } from './muapi.js';
import { validateModelParams } from './modelRequirements.js';
import { t2iModels, t2vModels } from './models.js';
import { CREDIT_TOOLS } from './assistPrompt.js';

const DEFAULT_IMAGE_MODEL = 'nano-banana-2-lite';
const DEFAULT_VIDEO_MODEL = 'seedance-2-mini-text-to-video';

const STUDIO_ROUTES = {
    image: 'image',
    video: 'video',
    shorts: 'shorts',
    explainer: 'explainer',
    audio: 'audio',
    apps: 'apps',
    seedance: 'seedance',
    cinema: 'cinema',
    character: 'character',
    edit: 'edit',
    lipsync: 'lipsync',
    influencer: 'influencer',
    vibemotion: 'vibemotion',
    assist: 'assist',
};

const MODEL_HINTS = [
    { match: /product|packshot|commercial/i, image: 'nano-banana-2-lite', video: 'seedance-2-mini-text-to-video', note: 'Clean product shots — fast Lite model for images, Seedance Mini for video.' },
    { match: /cinematic|film|movie|epic/i, image: 'flux-2-klein-9b-turbo', video: 'seedance-2.5-text-to-video', note: 'Cinematic look — Klein 9B or Seedance 2.5 for quality.' },
    { match: /fast|draft|quick|cheap|budget/i, image: 'nano-banana-2-lite', video: 'seedance-2-mini-text-to-video', note: 'Budget/fast tier — Nano Banana 2 Lite + Seedance Mini.' },
    { match: /anime|cartoon|stylized/i, image: 'nano-banana-2-lite', video: 'pixverse-v6-t2v', note: 'Stylized content — Pixverse supports anime styles in video.' },
    { match: /portrait|face|character/i, image: 'nano-banana-2-lite', video: 'kling-v3-turbo-standard-t2v', note: 'Character-focused — use Character Builder for consistency.' },
    { match: /4k|high.?quality|premium/i, image: 'nano-banana-2', video: 'seedance-2.5-text-to-video', note: 'Higher quality tier — Seedance 2.5 supports up to 4K video.' },
];

/**
 * Extract tool call JSON from assistant message.
 * @returns {{ tool: string, params: Object, summary?: string } | null}
 */
export function parseToolCall(text) {
    if (!text) return null;
    const block = text.match(/```tool\s*([\s\S]*?)```/);
    if (!block) return null;
    try {
        const parsed = JSON.parse(block[1].trim());
        if (parsed?.tool) return parsed;
    } catch { /* ignore */ }
    return null;
}

/** Strip tool block from message for display */
export function stripToolBlock(text) {
    return text
        .replace(/```tool[\s\S]*?```/g, '')
        .replace(/\{"tool"\s*:\s*"[^"]+"[\s\S]*?\}\s*/g, '')
        .trim();
}

function findModelHint(task) {
    const t = String(task || '');
    for (const h of MODEL_HINTS) {
        if (h.match.test(t)) return h;
    }
    return {
        image: DEFAULT_IMAGE_MODEL,
        video: DEFAULT_VIDEO_MODEL,
        note: 'General purpose — Nano Banana 2 Lite for images, Seedance 2 Mini T2V for video.',
    };
}

function modelExists(category, id) {
    const list = category === 't2i' ? t2iModels : t2vModels;
    return list.some((m) => m.id === id);
}

/**
 * Execute an assist tool.
 * @returns {Promise<{ type: string, text?: string, url?: string, studio?: string, needsConfirm?: boolean }>}
 */
export async function executeAssistTool(toolCall) {
    const { tool, params = {} } = toolCall;

    switch (tool) {
        case 'enhance_prompt': {
            const target = params.target || 'image';
            const original = params.text || '';
            const enhanced = await muapi.callLLM(original, {
                useCase: 'enhance_prompt',
                systemPrompt: `Improve this ${target} generation prompt. Return ONLY the improved prompt, no explanation or preamble.`,
            });
            return { type: 'text', text: typeof enhanced === 'string' ? enhanced.trim() : String(enhanced) };
        }

        case 'suggest_model': {
            const hint = findModelHint(params.task);
            const budget = params.budget || 'medium';
            const img = modelExists('t2i', hint.image) ? hint.image : DEFAULT_IMAGE_MODEL;
            const vid = modelExists('t2v', hint.video) ? hint.video : DEFAULT_VIDEO_MODEL;
            const imgMeta = t2iModels.find((m) => m.id === img);
            const vidMeta = t2vModels.find((m) => m.id === vid);
            return {
                type: 'text',
                text: `**Recommended models** (${budget} budget)\n\n` +
                    `🖼 Image: **${imgMeta?.name || img}** (\`${img}\`)\n` +
                    `🎬 Video: **${vidMeta?.name || vid}** (\`${vid}\`)\n\n` +
                    `${hint.note}`,
            };
        }

        case 'generate_image': {
            const model = params.model || DEFAULT_IMAGE_MODEL;
            const check = validateModelParams('t2i', model, {
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || '1:1',
            });
            if (!check.valid) throw new Error(check.errors.join(' '));
            const result = await muapi.generateImage({
                model,
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || '1:1',
            });
            const url = result.url || result.outputs?.[0];
            if (!url) throw new Error('No image URL returned');
            return { type: 'image', url, model, text: `Generated with ${model}` };
        }

        case 'generate_video': {
            const model = params.model || DEFAULT_VIDEO_MODEL;
            const check = validateModelParams('t2v', model, {
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || '16:9',
                duration: params.duration || 5,
            });
            if (!check.valid) throw new Error(check.errors.join(' '));
            const result = await muapi.generateVideo({
                model,
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || '16:9',
                duration: params.duration || 5,
            });
            const url = result.url || result.outputs?.[0];
            if (!url) throw new Error('No video URL returned');
            return { type: 'video', url, model, text: `Generated with ${model}` };
        }

        case 'navigate': {
            const studio = STUDIO_ROUTES[params.studio] || params.studio;
            if (!studio) throw new Error('Unknown studio');
            if (params.prompt) sessionStorage.setItem(`assist_prefill_${studio}`, params.prompt);
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: studio } }));
            return { type: 'navigate', studio, text: `Opened ${params.studio} studio.` };
        }

        default:
            throw new Error(`Unknown tool: ${tool}`);
    }
}

export function toolNeedsCreditConfirmation(tool) {
    return CREDIT_TOOLS.has(tool);
}
