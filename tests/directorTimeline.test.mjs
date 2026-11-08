import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    timelineFromShots,
    validateTimeline,
} from '../src/lib/directorTimeline.js';
import { layoutClipsWithOpacityFade } from '../src/lib/directorFade.js';
import {
    createEmptyDirectorProject,
    loadDirectorProject,
    saveDirectorProject,
    clearDirectorProject,
} from '../src/lib/directorProject.js';

function installLocalStorage() {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

test('timelineFromShots skips empty URLs and keeps shotId', () => {
    const shots = [
        { id: 'shot_a' },
        { id: 'shot_b' },
        { id: 'shot_c' },
    ];
    const urls = ['https://cdn.example/a.mp4', null, 'https://cdn.example/c.mp4'];
    const tl = timelineFromShots(shots, urls);
    assert.equal(tl.version, 1);
    assert.equal(tl.tracks.length, 2);
    assert.equal(tl.tracks[0].type, 'video');
    assert.equal(tl.tracks[1].type, 'audio');
    assert.equal(tl.tracks[1].clips.length, 0);
    assert.equal(tl.tracks[0].clips.length, 2);
    assert.deepEqual(
        tl.tracks[0].clips.map((c) => c.shotId),
        ['shot_a', 'shot_c'],
    );
    for (const clip of tl.tracks[0].clips) {
        assert.equal(clip.sourceRange.startSec, 0);
        assert.equal(clip.sourceRange.durationSec, null);
        assert.equal(clip.transition.type, 'cut');
    }
    assert.equal(validateTimeline(tl), true);
});

test('validateTimeline rejects wrong track counts and bad sourceRange', () => {
    assert.equal(validateTimeline(null), false);
    assert.equal(validateTimeline({ version: 1, tracks: [] }), false);
    const base = timelineFromShots([{ id: 's1' }, { id: 's2' }], ['u1', 'u2']);
    const badRange = structuredClone(base);
    badRange.tracks[0].clips[0].sourceRange.startSec = 1;
    assert.equal(validateTimeline(badRange), false);
    const badVersion = { ...base, version: 2 };
    assert.equal(validateTimeline(badVersion), false);
});

test('layoutClipsWithOpacityFade: cut does not overlap; fade overlaps', () => {
    const cutLayout = layoutClipsWithOpacityFade([
        { durationSec: 5, transition: { type: 'cut' } },
        { durationSec: 4, transition: { type: 'cut' } },
    ]);
    assert.equal(cutLayout[0].offsetSec, 0);
    assert.equal(cutLayout[0].fadeOutSec, 0);
    assert.equal(cutLayout[1].offsetSec, 5);
    assert.equal(cutLayout[1].fadeInSec, 0);

    const fadeLayout = layoutClipsWithOpacityFade([
        { durationSec: 5, transition: { type: 'fade', durationSec: 1 } },
        { durationSec: 4, transition: { type: 'cut' } },
    ]);
    assert.equal(fadeLayout[0].offsetSec, 0);
    assert.equal(fadeLayout[0].fadeOutSec, 1);
    assert.equal(fadeLayout[1].offsetSec, 4);
    assert.equal(fadeLayout[1].fadeInSec, 1);
});

test('directorProject empty has timeline null; legacy JSON loads; invalid timeline cleared', () => {
    installLocalStorage();
    clearDirectorProject();
    const empty = createEmptyDirectorProject();
    assert.equal(empty.timeline, null);

    localStorage.setItem('director_project', JSON.stringify({
        prompt: 'legacy',
        shots: [{ id: 'shot_1' }],
        combinedVideoUrl: 'blob:http://local/x',
    }));
    const legacy = loadDirectorProject();
    assert.equal(legacy.prompt, 'legacy');
    assert.equal(legacy.timeline, null);
    assert.equal(legacy.combinedVideoUrl, null);
    assert.equal(legacy.shots[0].id, 'shot_1');

    const good = timelineFromShots(
        [{ id: 'a' }, { id: 'b' }],
        ['https://a', 'https://b'],
    );
    saveDirectorProject({ ...createEmptyDirectorProject(), prompt: 'with-tl', timeline: good, shots: [{ id: 'a' }] });
    assert.deepEqual(loadDirectorProject().timeline.tracks[0].clips.map((c) => c.shotId), ['a', 'b']);

    localStorage.setItem('director_project', JSON.stringify({
        prompt: 'bad-tl',
        shots: [{ id: 'keep' }],
        timeline: { version: 1, tracks: [{ type: 'video', clips: [] }] },
    }));
    const cleared = loadDirectorProject();
    assert.equal(cleared.timeline, null);
    assert.equal(cleared.shots[0].id, 'keep');
    clearDirectorProject();
});

test('directorTimelineExport uses dynamic WebAV import (not loaded by this test)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const src = readFileSync(join(root, 'src/lib/directorTimelineExport.js'), 'utf8');
    assert.match(src, /import\('@webav\/av-cliper'\)/);
    assert.match(src, /Combinator\.isSupported/);
    assert.match(src, /exportTimelineLocally/);
});
