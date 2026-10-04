import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    extractJsonArray,
    extractJsonObject,
    parseScreenplay,
    normalizeShots,
    fallbackShotsFromScreenplay,
    runPass1Screenplay,
    runPass2Shots,
    runPass3Polish,
    planShortFilm,
} from '../src/lib/directorPlanner.js';
import {
    llmModels,
    LLM_FAMILY_PRIORITY,
    LLM_FAMILY_DEFAULT_ID,
    getLlmModelById,
} from 'studio/src/llmModels.js';
import { getFamilies } from 'studio/src/modelFamilies.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('extractJsonArray parses fenced JSON array', () => {
    const text = 'Here you go:\n```json\n[{"id":"shot_1","action":"walk"}]\n```\n';
    const arr = extractJsonArray(text);
    assert.equal(arr.length, 1);
    assert.equal(arr[0].id, 'shot_1');
});

test('extractJsonArray returns null for invalid JSON', () => {
    assert.equal(extractJsonArray('no array here'), null);
    assert.equal(extractJsonArray('[{"id":'), null);
    assert.equal(extractJsonArray(''), null);
});

test('extractJsonObject parses embedded object', () => {
    const obj = extractJsonObject('Result: {"title":"Rain","logline":"A chase"} done');
    assert.equal(obj.title, 'Rain');
    assert.equal(obj.logline, 'A chase');
});

test('parseScreenplay accepts JSON screenplay', () => {
    const raw = JSON.stringify({
        title: 'Neon Letter',
        logline: 'A courier delivers a sealed letter.',
        characters: [
            { name: 'Kai', appearance: 'wet jacket, neon reflections', role: 'courier' },
        ],
        scenes: [{ heading: 'EXT. STREET', action: 'Kai runs.', dialogue: '' }],
    });
    const sp = parseScreenplay(raw);
    assert.equal(sp.title, 'Neon Letter');
    assert.equal(sp.characters.length, 1);
    assert.equal(sp.characters[0].name, 'Kai');
    assert.match(sp.scenesText, /EXT\. STREET/);
});

test('parseScreenplay free-text Title/Logline headers', () => {
    const text = `Title: Fog Harbor
Logline: A lighthouse keeper hears a radio that should be silent.
Characters:
- Mira — silver hair, oilskin coat
Scenes:
INT. LANTERN ROOM — NIGHT
Mira listens.`;
    const sp = parseScreenplay(text);
    assert.equal(sp.title, 'Fog Harbor');
    assert.match(sp.logline, /lighthouse/);
    assert.ok(sp.characters.some((c) => c.name.includes('Mira')));
});

test('normalizeShots pads and fills prompts up to shotCount', () => {
    const shots = normalizeShots([{ action: 'open on skyline' }], 4);
    assert.equal(shots.length, 4);
    assert.ok(shots[0].imagePrompt.includes('skyline'));
    assert.ok(shots[3].visualPrompt.length > 10);
    assert.equal(shots[0].id, 'shot_1');
});

test('normalizeShots clamps to max 8', () => {
    const shots = normalizeShots([], 99);
    assert.equal(shots.length, 8);
});

test('fallbackShotsFromScreenplay builds usable shots from bad LLM output', () => {
    const shots = fallbackShotsFromScreenplay(
        {
            title: 'Untitled Short',
            logline: 'two strangers share an umbrella',
            characters: [{ id: 'c1', name: 'Ava' }],
        },
        3
    );
    assert.equal(shots.length, 3);
    assert.match(shots[0].action, /umbrella|Untitled/i);
    assert.ok(shots.every((s) => s.imagePrompt && s.visualPrompt));
});

test('main.js routes page === director to DirectorStudio', () => {
    const main = readFileSync(join(root, 'src/main.js'), 'utf8');
    assert.match(main, /page === ['"]director['"]/);
    assert.match(main, /DirectorStudio/);
});

test('Header includes Director nav item', () => {
    const header = readFileSync(join(root, 'src/components/Header.js'), 'utf8');
    assert.match(header, /nav\.director/);
    assert.match(header, /page:\s*['"]director['"]/);
});

function installDomStub() {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };

    function el(tag) {
        const node = {
            tagName: String(tag).toUpperCase(),
            className: '',
            id: '',
            textContent: '',
            innerHTML: '',
            value: '',
            placeholder: '',
            type: '',
            rows: 0,
            disabled: false,
            checked: false,
            href: '',
            download: '',
            src: '',
            controls: false,
            dataset: {},
            style: {},
            children: [],
            classList: {
                _set: new Set(),
                add(...xs) { xs.forEach((x) => this._set.add(x)); },
                remove(...xs) { xs.forEach((x) => this._set.delete(x)); },
                contains(x) { return this._set.has(x); },
                toggle(x, force) {
                    if (force === true) { this._set.add(x); return true; }
                    if (force === false) { this._set.delete(x); return false; }
                    if (this._set.has(x)) { this._set.delete(x); return false; }
                    this._set.add(x); return true;
                },
            },
            appendChild(child) {
                this.children.push(child);
                return child;
            },
            append(...nodes) {
                nodes.forEach((n) => {
                    if (typeof n === 'string') this.children.push({ textContent: n });
                    else if (n) this.children.push(n);
                });
                return this;
            },
            prepend(child) {
                this.children.unshift(child);
                return child;
            },
            remove() {},
            addEventListener() {},
            removeEventListener() {},
            setAttribute(k, v) { this[k] = v; },
            getAttribute(k) { return this[k]; },
            querySelector() { return null; },
            querySelectorAll() { return []; },
            focus() {},
            click() {},
            onclick: null,
            onchange: null,
            oninput: null,
        };
        return node;
    }

    globalThis.document = {
        createElement: el,
        body: el('body'),
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    globalThis.window = globalThis;
    globalThis.alert = () => {};
    globalThis.confirm = () => false;
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, init = {}) {
            this.type = type;
            this.detail = init.detail;
        }
    };
}

test('DirectorStudio mounts with dataset.studio = director and restores session', async () => {
    installDomStub();
    const { DirectorStudio } = await import('../src/components/DirectorStudio.js');
    const rootEl = DirectorStudio();
    assert.equal(rootEl.dataset.studio, 'director');
    assert.ok(rootEl.children.length >= 1);

    const { loadDirectorProject, createEmptyDirectorProject, saveDirectorProject, clearDirectorProject } =
        await import('../src/lib/directorProject.js');
    clearDirectorProject();
    assert.equal(loadDirectorProject(), null);
    saveDirectorProject({ ...createEmptyDirectorProject(), prompt: 'test restore' });
    assert.equal(loadDirectorProject().prompt, 'test restore');
    clearDirectorProject();
});

const P1_SLUGS = [
    'gpt-6-astra',
    'gpt-6-1-sol',
    'gpt-6-sol',
    'gpt-6-luna',
    'gpt-5-6-sol',
    'gpt-5-6-terra',
    'gpt-5-6-luna',
    'gpt-5-5',
    'claude-fable-5',
    'claude-fable-5-1',
    'claude-opus-5-5',
    'claude-opus-5',
    'claude-sonnet-5-5',
    'claude-sonnet-5',
    'gemini-3-8-flash',
    'gemini-3-pro',
    'gemini-3-1-pro',
    'grok-4-7',
    'kimi-k3',
    'deepseek-v4-pro',
    'deepseek-v4-1-flash',
    'deepseek-v4-flash',
];

test('P1 llm catalog is 22 slug entries in 11 families', () => {
    assert.equal(llmModels.length, 22);
    assert.deepEqual(llmModels.map((m) => m.id), P1_SLUGS);
    for (const model of llmModels) {
        assert.equal(model.transport, 'slug');
        assert.equal(model.endpoint, model.id);
        assert.equal(model.id, getLlmModelById(model.id).id);
        assert.equal('model' in model, false);
        assert.ok(model.family);
        assert.ok(model.modeKey);
        assert.ok(model.modeLabel);
        assert.equal(/abliterated|llama-4|qwen3-vl|openrouter/i.test(model.id), false);
    }
    assert.deepEqual(Object.keys(LLM_FAMILY_DEFAULT_ID), LLM_FAMILY_PRIORITY);
    assert.equal(LLM_FAMILY_DEFAULT_ID['gpt-6'], 'gpt-6-astra');
    assert.equal(LLM_FAMILY_DEFAULT_ID['gpt-5.6'], 'gpt-5-6-sol');
    assert.equal(LLM_FAMILY_DEFAULT_ID['gpt-5.5'], 'gpt-5-5');
    assert.equal(LLM_FAMILY_DEFAULT_ID['claude-fable'], 'claude-fable-5-1');
    assert.equal(LLM_FAMILY_DEFAULT_ID['claude-opus'], 'claude-opus-5-5');
    assert.equal(LLM_FAMILY_DEFAULT_ID['claude-sonnet'], 'claude-sonnet-5-5');
    assert.equal(LLM_FAMILY_DEFAULT_ID['gemini-3.8'], 'gemini-3-8-flash');
    assert.equal(LLM_FAMILY_DEFAULT_ID['gemini-3-pro'], 'gemini-3-1-pro');
    assert.equal(LLM_FAMILY_DEFAULT_ID['grok-4'], 'grok-4-7');
    assert.equal(LLM_FAMILY_DEFAULT_ID.kimi, 'kimi-k3');
    assert.equal(LLM_FAMILY_DEFAULT_ID['deepseek-v4'], 'deepseek-v4-pro');
    for (const [family, id] of Object.entries(LLM_FAMILY_DEFAULT_ID)) {
        assert.equal(getLlmModelById(id).family, family);
    }

    const families = getFamilies(llmModels, { preferredOrder: LLM_FAMILY_PRIORITY });
    assert.deepEqual(families.map((f) => f.id), LLM_FAMILY_PRIORITY);
    const modeCount = Object.fromEntries(families.map((f) => [f.id, f.modes.length]));
    assert.equal(modeCount['gpt-6'], 4);
    assert.equal(modeCount['gpt-5.6'], 3);
    assert.equal(modeCount['claude-fable'], 2);
    assert.equal(modeCount['claude-opus'], 2);
    assert.equal(modeCount['claude-sonnet'], 2);
    assert.equal(modeCount['gemini-3-pro'], 2);
    assert.equal(modeCount['deepseek-v4'], 3);
    for (const id of ['gpt-5.5', 'gemini-3.8', 'grok-4', 'kimi']) {
        assert.equal(modeCount[id], 1);
    }
    assert.equal(families.find((f) => f.id === 'gemini-3-pro').name, 'Gemini 3 Pro');
    assert.equal(families.find((f) => f.id === 'grok-4').name, 'Grok 4.7');

    const modelsSrc = readFileSync(join(root, 'packages/studio/src/models.js'), 'utf8');
    assert.equal(modelsSrc.includes('gpt-6-astra'), false);
    assert.equal(modelsSrc.includes('claude-fable-5-1'), false);
    const indexSrc = readFileSync(join(root, 'packages/studio/src/index.js'), 'utf8');
    assert.equal(indexSrc.includes('llmModels'), false);
    const webMuapi = readFileSync(join(root, 'packages/studio/src/muapi.js'), 'utf8');
    assert.equal(webMuapi.includes('callLLM'), false);
});

function recordingLlm(payloads) {
    const calls = [];
    return {
        calls,
        async callLLM(prompt, options) {
            calls.push({ prompt, options: { ...options } });
            const next = payloads[calls.length - 1];
            return typeof next === 'string' ? next : JSON.stringify(next);
        },
    };
}

function assertNoGatewayModel(options) {
    assert.equal('model' in options, false);
    assert.equal('messages' in options, false);
}

test('director passes omit model when no catalog id is selected', async () => {
    const screenplay = {
        title: 'Rain',
        logline: 'A chase',
        characters: [],
        scenesText: 'Kai runs.',
    };
    const shots = [{ id: 'shot_1', action: 'run', camera: 'wide', imagePrompt: 'still', visualPrompt: 'move', dialogue: '', continuity: '' }];
    const llm = recordingLlm(['Title: Rain\n', [{ id: 'shot_1', action: 'run' }], [{ id: 'shot_1', imagePrompt: 'still', visualPrompt: 'move' }]]);
    await runPass1Screenplay(llm, { prompt: 'idea', shotCount: 1 });
    await runPass2Shots(llm, { screenplay, shotCount: 1 });
    await runPass3Polish(llm, { shots, screenplay, qualityTier: 'budget' });
    assert.equal(llm.calls.length, 3);
    for (const call of llm.calls) {
        assertNoGatewayModel(call.options);
        assert.equal('modelId' in call.options, false);
    }
});

test('director passes forward a P1 id and do not set model', async () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
    const llm = recordingLlm([
        {
            title: 'Rain',
            logline: 'A chase',
            characters: [{ id: 'c1', name: 'Kai', appearance: 'coat', role: 'protagonist' }],
            scenes: [{ heading: 'EXT. STREET', action: 'Kai runs.', dialogue: '' }],
        },
        [{ id: 'shot_1', action: 'Kai runs', camera: 'wide', durationSec: 5, characterIds: ['c1'] }],
        [{ id: 'shot_1', imagePrompt: 'still of Kai', visualPrompt: 'Kai runs forward' }],
    ]);
    await planShortFilm(llm, { prompt: 'idea', shotCount: 1, modelId: 'gpt-6-astra' });
    assert.equal(llm.calls.length, 3);
    for (const call of llm.calls) {
        assert.equal(call.options.modelId, 'gpt-6-astra');
        assertNoGatewayModel(call.options);
    }
});

test('callLLM keeps any-llm unless modelId is a slug catalog entry', async () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
    globalThis.window = globalThis;
    localStorage.setItem('muapi_key', 'test-key');
    const { MuapiClient } = await import('../src/lib/muapi.js');
    const client = new MuapiClient();
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), body: JSON.parse(init.body) });
        return {
            ok: true,
            json: async () => ({ output: { text: 'hello' } }),
            text: async () => '',
        };
    };
    try {
        const text = await client.callLLM('hi', { useCase: 'test' });
        assert.equal(text, 'hello');
        assert.match(calls[0].url, /\/api\/v1\/any-llm$/);
        assert.equal(calls[0].body.prompt, 'hi');
        assert.equal(calls[0].body.system_prompt, 'You are a helpful creative AI assistant.');
        assert.equal('model' in calls[0].body, false);
        assert.equal('messages' in calls[0].body, false);
        assert.equal('image_url' in calls[0].body, false);

        await client.callLLM('hi', { modelId: 'claude-fable-5-1', systemPrompt: 'sys' });
        assert.match(calls[1].url, /\/api\/v1\/claude-fable-5-1$/);
        assert.equal(calls[1].body.prompt, 'hi');
        assert.equal(calls[1].body.system_prompt, 'sys');
        assert.equal('model' in calls[1].body, false);
        assert.equal('messages' in calls[1].body, false);

        await client.callLLM('hi', { modelId: 'gpt-6-astra', model: 'openai/gpt-4o' });
        assert.match(calls[2].url, /\/api\/v1\/gpt-6-astra$/);
        assert.equal('model' in calls[2].body, false);

        await client.callLLM('hi', { model: 'openai/gpt-4o' });
        assert.match(calls[3].url, /\/api\/v1\/any-llm$/);
        assert.equal(calls[3].body.model, 'openai/gpt-4o');

        await client.callLLM('hi', { modelId: 'meta-llama/llama-4-maverick' });
        assert.match(calls[4].url, /\/api\/v1\/any-llm$/);
        assert.equal('model' in calls[4].body, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

function walk(node, acc = []) {
    if (!node || typeof node !== 'object') return acc;
    acc.push(node);
    for (const child of node.children || []) walk(child, acc);
    return acc;
}

test('Director LLM picker starts on Current and selects a family default slug', async () => {
    installDomStub();
    const { DirectorStudio } = await import('../src/components/DirectorStudio.js');
    const { saveDirectorProject, createEmptyDirectorProject, clearDirectorProject } =
        await import('../src/lib/directorProject.js');
    clearDirectorProject();
    const root = DirectorStudio();
    const picker = walk(root).find((n) => n.dataset?.testid === 'director-llm-picker');
    assert.ok(picker);
    assert.equal(picker.dataset.llmModel, '');
    const families = walk(picker).filter((n) => n.dataset?.family);
    assert.deepEqual(families.map((n) => n.dataset.family), LLM_FAMILY_PRIORITY);
    const current = walk(picker).find((n) => n.dataset?.llmChoice === 'current');
    assert.equal(current.getAttribute('aria-pressed'), 'true');
    assert.equal(walk(picker).some((n) => n.dataset?.testid === 'mode-chips'), false);

    families.find((n) => n.dataset.family === 'claude-fable').onclick();
    const afterFable = walk(picker);
    assert.equal(picker.dataset.llmModel, 'claude-fable-5-1');
    const fableChip = afterFable.find((n) => n.dataset?.modelId === 'claude-fable-5-1');
    assert.equal(fableChip.getAttribute('aria-pressed'), 'true');
    assert.equal(afterFable.filter((n) => n.dataset?.modeKey).length, 2);

    afterFable.find((n) => n.dataset?.modelId === 'claude-fable-5').onclick();
    assert.equal(picker.dataset.llmModel, 'claude-fable-5');

    walk(picker).find((n) => n.dataset?.family === 'grok-4').onclick();
    assert.equal(picker.dataset.llmModel, 'grok-4-7');
    assert.equal(walk(picker).some((n) => n.dataset?.testid === 'mode-chips'), false);

    walk(picker).find((n) => n.dataset?.family === 'gemini-3-pro').onclick();
    assert.equal(picker.dataset.llmModel, 'gemini-3-1-pro');

    walk(picker).find((n) => n.dataset?.llmChoice === 'current').onclick();
    assert.equal(picker.dataset.llmModel, '');
    assert.equal(walk(picker).find((n) => n.dataset?.llmChoice === 'current').getAttribute('aria-pressed'), 'true');

    saveDirectorProject({ ...createEmptyDirectorProject(), llmModelId: 'not-a-slug' });
    const restored = DirectorStudio();
    const restoredPicker = walk(restored).find((n) => n.dataset?.testid === 'director-llm-picker');
    assert.equal(restoredPicker.dataset.llmModel, '');
    clearDirectorProject();
});
