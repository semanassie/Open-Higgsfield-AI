/**
 * Director Planner — 3 LLM passes for short-film production.
 * Pass 1: creative screenplay text
 * Pass 2: structured shot JSON
 * Pass 3: model-aware visual/image prompt polish
 */

import { ensureCharacterFromDirector } from './characterLibrary.js';
import { resolveDirectorModels } from './directorModels.js';

const SCREENPLAY_SYSTEM = `You are an award-winning short-film screenwriter and director.
Write vivid, filmable scenes with clear character continuity.
Keep dialogue sparse and cinematic. Prefer visual storytelling.`;

/**
 * Extract first JSON array from LLM text (tolerant of markdown fences).
 * @param {string} text
 * @returns {any[]|null}
 */
export function extractJsonArray(text) {
    if (!text || typeof text !== 'string') return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const match = candidate.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Extract JSON object from LLM text.
 * @param {string} text
 * @returns {object|null}
 */
export function extractJsonObject(text) {
    if (!text || typeof text !== 'string') return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const match = candidate.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[0]);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Parse screenplay pass into structured fields.
 * Accepts free text or JSON object with title/logline/characters/scenes.
 */
export function parseScreenplay(text) {
    const obj = extractJsonObject(text);
    if (obj) {
        const characters = Array.isArray(obj.characters)
            ? obj.characters.map((c, i) => ({
                id: c.id || `c${i + 1}`,
                name: String(c.name || `Character ${i + 1}`).trim(),
                appearance: String(c.appearance || c.look || '').trim(),
                role: String(c.role || '').trim(),
            }))
            : [];
        return {
            title: String(obj.title || 'Untitled Short').trim(),
            logline: String(obj.logline || obj.synopsis || '').trim(),
            characters,
            scenesText: Array.isArray(obj.scenes)
                ? obj.scenes.map((s, i) => {
                    if (typeof s === 'string') return `${i + 1}. ${s}`;
                    return `${i + 1}. ${s.heading || s.title || 'Scene'}\n${s.action || s.description || ''}\n${s.dialogue || ''}`;
                }).join('\n\n')
                : String(obj.screenplay || obj.body || text).trim(),
            raw: text,
        };
    }

    // Free-text fallback: pull Title: / Logline: / Characters: headers if present
    const titleMatch = text.match(/^(?:Title|TITLE)\s*[:\-]\s*(.+)$/m);
    const loglineMatch = text.match(/^(?:Logline|LOGLINE|Synopsis)\s*[:\-]\s*(.+)$/m);
    const characters = [];
    const charBlock = text.match(/(?:Characters|CHARACTERS)\s*[:\-]?\s*\n([\s\S]*?)(?=\n\s*(?:Scenes|SCENES|Scene\s*1|INT\.|EXT\.|$))/i);
    if (charBlock) {
        charBlock[1].split('\n').forEach((line, i) => {
            const m = line.match(/^\s*[-*]?\s*\**([^:—\-\n]+)\**\s*[:—\-]\s*(.+)$/);
            if (m) {
                characters.push({
                    id: `c${characters.length + 1}`,
                    name: m[1].trim(),
                    appearance: m[2].trim(),
                    role: '',
                });
            } else if (line.trim() && characters.length < 8) {
                const nameOnly = line.replace(/^\s*[-*\d.]+\s*/, '').trim();
                if (nameOnly.length > 1 && nameOnly.length < 60) {
                    characters.push({
                        id: `c${characters.length + 1}`,
                        name: nameOnly.split(/[—(]/)[0].trim(),
                        appearance: nameOnly.includes('—') || nameOnly.includes('-') ? nameOnly : '',
                        role: '',
                    });
                }
            }
        });
    }

    return {
        title: titleMatch?.[1]?.trim() || 'Untitled Short',
        logline: loglineMatch?.[1]?.trim() || '',
        characters,
        scenesText: text.trim(),
        raw: text,
    };
}

/**
 * Normalize shot list from LLM JSON.
 * @param {any[]} arr
 * @param {number} shotCount
 */
export function normalizeShots(arr, shotCount = 4) {
    const list = Array.isArray(arr) ? arr : [];
    const n = Math.min(Math.max(shotCount, 1), 8);
    const shots = [];
    for (let i = 0; i < n; i++) {
        const s = list[i] || {};
        shots.push({
            id: s.id || `shot_${i + 1}`,
            index: i,
            durationSec: Number(s.durationSec) || Number(s.duration) || 5,
            characterIds: Array.isArray(s.characterIds)
                ? s.characterIds.map(String)
                : (Array.isArray(s.characters) ? s.characters.map(String) : []),
            camera: String(s.camera || 'medium shot, eye level').trim(),
            action: String(s.action || s.visual || s.description || `Shot ${i + 1}`).trim(),
            dialogue: String(s.dialogue || '').trim(),
            continuity: String(s.continuity || '').trim(),
            imagePrompt: String(s.imagePrompt || s.stillPrompt || '').trim(),
            visualPrompt: String(s.visualPrompt || s.videoPrompt || '').trim(),
            status: 'planned',
            error: null,
        });
    }
    // Fill prompts from action/camera if polish not yet applied
    shots.forEach((shot) => {
        if (!shot.imagePrompt) {
            shot.imagePrompt = `Cinematic still frame, ${shot.camera}: ${shot.action}. Photorealistic, film lighting, 35mm.`;
        }
        if (!shot.visualPrompt) {
            shot.visualPrompt = `${shot.action}. Camera: ${shot.camera}. ${shot.dialogue ? `Dialogue (lip sync): "${shot.dialogue}".` : 'No dialogue.'} Continuity: ${shot.continuity || 'matches previous shot'}.`;
        }
    });
    return shots;
}

/**
 * Fallback shot list when LLM JSON fails.
 */
export function fallbackShotsFromScreenplay(screenplay, shotCount = 4) {
    const n = Math.min(Math.max(shotCount, 1), 8);
    const charNames = (screenplay.characters || []).map((c) => c.name).join(', ') || 'protagonist';
    const base = screenplay.logline || screenplay.title || 'a short film moment';
    return normalizeShots(
        Array.from({ length: n }, (_, i) => ({
            id: `shot_${i + 1}`,
            durationSec: 5,
            characterIds: (screenplay.characters || []).slice(0, 2).map((c) => c.id),
            camera: i === 0 ? 'wide establishing shot' : i === n - 1 ? 'close-up emotional beat' : 'medium tracking shot',
            action: `Scene ${i + 1} of "${screenplay.title}": ${base}. Featuring ${charNames}.`,
            dialogue: '',
            continuity: i === 0 ? 'opening frame' : `continues from shot ${i}`,
        })),
        n
    );
}

function buildScreenplayPrompt(userPrompt, shotCount, libraryChars) {
    const libraryHint = libraryChars.length
        ? `\nPrefer reusing these existing characters when they fit (keep names exact):\n${libraryChars.map((c) => `- ${c.name}: ${c.appearance || 'no description'}`).join('\n')}`
        : '';
    return `Write a short film for this idea:

"""${userPrompt}"""

Target about ${shotCount} cinematic shots (~${shotCount * 5} seconds total).

Return a JSON object (and ONLY that JSON object) with this shape:
{
  "title": "string",
  "logline": "one sentence",
  "characters": [
    { "id": "c1", "name": "Name", "appearance": "visual description", "role": "protagonist|supporting" }
  ],
  "scenes": [
    { "heading": "INT. LOCATION - TIME", "action": "what we see", "dialogue": "optional spoken line" }
  ]
}
${libraryHint}
Keep 1–4 characters. Make it filmable with AI image-to-video (clear subjects, no complex crowd choreography).`;
}

function buildShotBreakdownPrompt(screenplay, shotCount) {
    return `Convert this short-film screenplay into exactly ${shotCount} shot cards for AI video generation.

TITLE: ${screenplay.title}
LOGLINE: ${screenplay.logline}
CHARACTERS: ${JSON.stringify(screenplay.characters)}
SCREENPLAY:
${screenplay.scenesText}

Return ONLY a JSON array of exactly ${shotCount} objects:
[
  {
    "id": "shot_1",
    "durationSec": 5,
    "characterIds": ["c1"],
    "camera": "shot size + angle + lens feel",
    "action": "concrete visible action in this shot",
    "dialogue": "exact spoken words or empty string",
    "continuity": "how this connects to previous shot end-state"
  }
]

Rules:
- Continuity must chain: shot N starts where shot N-1 ended.
- Action must be visual and specific (wardrobe, location, lighting).
- Prefer medium/close shots for dialogue.
- No markdown outside the JSON array.`;
}

function buildPolishPrompt(shots, models, screenplay) {
    return `You polish shot prompts for AI generation.

Still model: ${models.stillT2i}
Video model (image-to-video): ${models.i2v}
Film title: ${screenplay.title}
Characters: ${JSON.stringify(screenplay.characters)}

Input shots JSON:
${JSON.stringify(shots, null, 2)}

Return ONLY a JSON array of the same length. Each object must keep id/durationSec/characterIds/camera/action/dialogue/continuity and ADD:
- "imagePrompt": detailed photoreal start-frame prompt (include character appearance locks, wardrobe, lighting, ${models.stillT2i} friendly)
- "visualPrompt": motion prompt for I2V (camera move, subject motion, dialogue lip-sync hint if dialogue present; no scene cuts inside one shot)

Preserve continuity language across imagePrompt/visualPrompt. No markdown outside JSON.`;
}

/**
 * Bind screenplay characters to local library (create if missing).
 */
export function bindCharacters(screenplay) {
    const bindings = (screenplay.characters || []).map((c) => {
        const lib = ensureCharacterFromDirector(c);
        return {
            screenplayId: c.id,
            libraryId: lib.id,
            name: lib.name,
            appearance: lib.appearance || c.appearance,
            referenceImageUrl: lib.referenceImageUrl || null,
        };
    });
    return bindings;
}

function llmOptions(systemPrompt, useCase, modelId) {
    const options = { systemPrompt, useCase };
    if (modelId) options.modelId = modelId;
    return options;
}

/**
 * Run pass 1 — screenplay.
 * @param {{ callLLM: Function }} llm
 * @param {{ prompt: string, shotCount: number, libraryCharacters?: object[], modelId?: string }} args
 */
export async function runPass1Screenplay(llm, { prompt, shotCount, libraryCharacters = [], modelId } = {}) {
    const raw = await llm.callLLM(
        buildScreenplayPrompt(prompt, shotCount, libraryCharacters),
        llmOptions(SCREENPLAY_SYSTEM, 'director_screenplay', modelId)
    );
    const screenplay = parseScreenplay(raw);
    if (!screenplay.characters.length && libraryCharacters.length) {
        screenplay.characters = libraryCharacters.slice(0, 3).map((c, i) => ({
            id: `c${i + 1}`,
            name: c.name,
            appearance: c.appearance || '',
            role: 'supporting',
        }));
    }
    return { raw, screenplay };
}

/**
 * Run pass 2 — shot JSON.
 */
export async function runPass2Shots(llm, { screenplay, shotCount, modelId }) {
    const raw = await llm.callLLM(
        buildShotBreakdownPrompt(screenplay, shotCount),
        llmOptions(
            'You output strict JSON arrays for film shot breakdowns. No prose.',
            'director_shots',
            modelId
        )
    );
    const arr = extractJsonArray(raw);
    const shots = arr?.length
        ? normalizeShots(arr, shotCount)
        : fallbackShotsFromScreenplay(screenplay, shotCount);
    return { raw, shots, usedFallback: !arr?.length };
}

/**
 * Run pass 3 — model polish.
 */
export async function runPass3Polish(llm, { shots, screenplay, qualityTier, modelId }) {
    const models = resolveDirectorModels(qualityTier);
    const raw = await llm.callLLM(
        buildPolishPrompt(shots, models, screenplay),
        llmOptions(
            'You write precise image and video prompts. Output JSON only.',
            'director_polish',
            modelId
        )
    );
    const arr = extractJsonArray(raw);
    if (!arr?.length) {
        return { raw, shots: normalizeShots(shots, shots.length), usedFallback: true, models };
    }
    // Merge polish fields onto existing shots by index
    const polished = shots.map((shot, i) => {
        const p = arr[i] || {};
        return {
            ...shot,
            imagePrompt: String(p.imagePrompt || shot.imagePrompt || '').trim() || shot.imagePrompt,
            visualPrompt: String(p.visualPrompt || shot.visualPrompt || '').trim() || shot.visualPrompt,
            camera: String(p.camera || shot.camera).trim(),
            action: String(p.action || shot.action).trim(),
            dialogue: p.dialogue !== undefined ? String(p.dialogue) : shot.dialogue,
            continuity: String(p.continuity || shot.continuity).trim(),
            status: 'polished',
        };
    });
    return { raw, shots: polished, usedFallback: false, models };
}

/**
 * Full Auto planning: pass 1 → 2 → 3.
 */
export async function planShortFilm(llm, options) {
    const shotCount = Math.min(Math.max(options.shotCount || 4, 1), 8);
    const qualityTier = options.qualityTier || 'budget';
    const modelId = options.modelId || undefined;
    const pass1 = await runPass1Screenplay(llm, {
        prompt: options.prompt,
        shotCount,
        libraryCharacters: options.libraryCharacters || [],
        modelId,
    });
    const bindings = bindCharacters(pass1.screenplay);
    const pass2 = await runPass2Shots(llm, {
        screenplay: pass1.screenplay,
        shotCount,
        modelId,
    });
    // Remap characterIds to library names for prompts
    const shotsWithNames = pass2.shots.map((s) => ({
        ...s,
        characterIds: (s.characterIds || []).map((id) => {
            const b = bindings.find((x) => x.screenplayId === id || x.name === id);
            return b?.name || id;
        }),
    }));
    const pass3 = await runPass3Polish(llm, {
        shots: shotsWithNames,
        screenplay: pass1.screenplay,
        qualityTier,
        modelId,
    });
    return {
        screenplay: pass1.screenplay,
        screenplayRaw: pass1.raw,
        characterBindings: bindings,
        shots: pass3.shots,
        models: pass3.models,
        pass2Fallback: pass2.usedFallback,
        pass3Fallback: pass3.usedFallback,
    };
}
