import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    stubScene,
    validateScene,
    extractJsonObject,
    parseSceneResponse,
} from '../src/lib/blenderPlanParse.js';
import { planBlenderScene } from '../src/lib/blenderPlanClient.js';

test('stubScene returns version 2 with camera and light', () => {
    const scene = stubScene();
    assert.equal(scene.version, 2);
    assert.ok(scene.nodes.some((n) => n.type === 'camera'));
    assert.ok(scene.nodes.some((n) => n.type === 'light'));
    assert.notEqual(scene, stubScene());
});

test('validateScene rejects missing camera', () => {
    const scene = stubScene();
    scene.nodes = scene.nodes.filter((n) => n.type !== 'camera');
    assert.throws(() => validateScene(scene), /camera/);
});

test('extractJsonObject reads fenced JSON', () => {
    const scene = stubScene();
    const parsed = extractJsonObject(`Here:\n\`\`\`json\n${JSON.stringify(scene)}\n\`\`\``);
    assert.equal(parsed.version, 2);
});

test('parseSceneResponse accepts valid LLM JSON', () => {
    const scene = stubScene();
    const result = parseSceneResponse(JSON.stringify(scene));
    assert.equal(result.source, 'llm');
    assert.equal(result.scene.version, 2);
});

test('parseSceneResponse falls back on garbage', () => {
    const fallback = stubScene();
    const result = parseSceneResponse('not json at all', fallback);
    assert.equal(result.source, 'fallback');
    assert.equal(result.scene.version, 2);
    assert.ok(result.error);
});

test('planBlenderScene returns prompt-empty without calling LLM', async () => {
    let called = false;
    const result = await planBlenderScene('  ', {
        callLLM: async () => {
            called = true;
            return '{}';
        },
    });
    assert.equal(result.source, 'prompt-empty');
    assert.equal(called, false);
    assert.equal(result.scene.version, 2);
});

test('planBlenderScene uses mocked LLM JSON', async () => {
    const scene = stubScene();
    scene.nodes[0].materials[0].inputs.base_color = [0.9, 0.1, 0.1];
    const result = await planBlenderScene('red ball', {
        callLLM: async () => JSON.stringify(scene),
    });
    assert.equal(result.source, 'llm');
    assert.deepEqual(result.scene.nodes[0].materials[0].inputs.base_color, [0.9, 0.1, 0.1]);
});

test('planBlenderScene falls back when LLM throws', async () => {
    const fallback = stubScene();
    const result = await planBlenderScene('anything', {
        fallbackScene: fallback,
        callLLM: async () => {
            throw new Error('network down');
        },
    });
    assert.equal(result.source, 'fallback');
    assert.match(result.error, /network down/);
    assert.equal(result.scene.version, 2);
});

test('planBlenderScene falls back when LLM returns invalid mesh', async () => {
    const bad = {
        version: 2,
        nodes: [
            { type: 'mesh', geometry: { std: 'cube' } },
            { type: 'light', shape: 'rectangle', translation: [0, 5, 0], target: [0, 0, 0], energy: 100 },
            { type: 'camera', translation: [3, 2, 5], target: [0, 0, 0] },
        ],
    };
    const result = await planBlenderScene('cube please', {
        callLLM: async () => JSON.stringify(bad),
    });
    assert.equal(result.source, 'fallback');
    assert.match(result.error, /sphere or grid/);
});
