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
} from '../src/lib/directorPlanner.js';

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
