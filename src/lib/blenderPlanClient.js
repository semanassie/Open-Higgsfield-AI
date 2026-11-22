// MuAPI any-llm → Blender shot.json. Falls back to stub/current scene on failure.

import { muapi } from './muapi.js';
import {
    SCENE_SYSTEM_PROMPT,
    parseSceneResponse,
    stubScene,
} from './blenderPlanParse.js';

/**
 * @param {string} prompt
 * @param {{
 *   callLLM?: (prompt: string, options?: object) => Promise<string>,
 *   fallbackScene?: object,
 *   model?: string,
 * }} [options]
 * @returns {Promise<{ scene: object, source: 'llm'|'fallback'|'prompt-empty', error?: string, raw?: string }>}
 */
export async function planBlenderScene(prompt, options = {}) {
    const text = typeof prompt === 'string' ? prompt.trim() : '';
    const fallback = options.fallbackScene
        ? JSON.parse(JSON.stringify(options.fallbackScene))
        : stubScene();

    if (!text) {
        return { scene: fallback, source: 'prompt-empty' };
    }

    const callLLM = options.callLLM
        || ((p, opts) => muapi.callLLM(p, opts));

    try {
        const raw = await callLLM(
            `User request:\n${text}\n\nReturn only the shot JSON.`,
            {
                systemPrompt: SCENE_SYSTEM_PROMPT,
                useCase: 'blender_scene_plan',
                model: options.model,
            },
        );
        const parsed = parseSceneResponse(raw, fallback);
        return { ...parsed, raw };
    } catch (error) {
        return {
            scene: fallback,
            source: 'fallback',
            error: error.message || String(error),
        };
    }
}

export { stubScene, parseSceneResponse, SCENE_SYSTEM_PROMPT } from './blenderPlanParse.js';
