const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const {
    discoverBinary,
    missingBinaryMessage,
    normalizeSettings,
    planBuild,
    planRemoteRender,
    buildScriptSource,
    parseSummaryOutput,
    formatAuditLine,
    parseVersionText,
    isSupportedVersion,
    officialLinuxArchive,
    DEFAULT_RESOLUTION,
    DEFAULT_SAMPLES,
    stubScene,
} = require('../electron/lib/blenderScene');
const { prepareShot, blenderPaths } = require('../electron/lib/blenderProvider');
const { renderCommand, installScript } = require('../electron/lib/blenderRemote');

function exists(paths, resolver = path.resolve) {
    const set = new Set(paths.map((entry) => resolver(entry)));
    return (candidate) => set.has(resolver(candidate));
}

test('discoverBinary prefers a saved path that exists', () => {
    const saved = path.posix.join('/opt', 'blender');
    const found = discoverBinary({
        platform: 'linux',
        env: {},
        homedir: '/home/ada',
        savedPath: saved,
        existsSync: exists([saved], path.posix.resolve),
        readdirSync: () => [],
    });
    assert.equal(found, path.posix.resolve(saved));
});

test('discoverBinary finds Windows Blender Foundation installs', () => {
    const expected = path.win32.join('C:\\Program Files', 'Blender Foundation', 'Blender 4.5', 'blender.exe');
    const found = discoverBinary({
        platform: 'win32',
        env: { ProgramFiles: 'C:\\Program Files', Path: '' },
        homedir: 'C:\\Users\\ada',
        existsSync: (candidate) => {
            const resolved = path.win32.resolve(candidate);
            if (resolved === path.win32.resolve('C:\\Program Files\\Blender Foundation')) return true;
            return resolved === path.win32.resolve(expected);
        },
        readdirSync: (dir) => {
            if (path.win32.resolve(dir) === path.win32.resolve('C:\\Program Files\\Blender Foundation')) {
                return [{ name: 'Blender 4.5', isDirectory: () => true }];
            }
            return [];
        },
    });
    assert.equal(found, path.win32.resolve(expected));
});

test('discoverBinary searches PATH after defaults', () => {
    const fromPath = path.posix.join('/opt', 'bin', 'blender');
    const found = discoverBinary({
        platform: 'linux',
        env: { PATH: '/usr/bin:/opt/bin' },
        homedir: '/home/ada',
        existsSync: exists([fromPath], path.posix.resolve),
        readdirSync: () => [],
    });
    assert.equal(found, path.posix.resolve(fromPath));
});

test('missing binary message points at blender.org', () => {
    const message = missingBinaryMessage({ platform: 'win32' });
    assert.match(message, /blender\.org\/download/);
    assert.match(message, /BLENDER_PATH/);
});

test('normalizeSettings restores defaults for empty or invalid input', () => {
    assert.deepEqual(normalizeSettings({}), {
        resolution: DEFAULT_RESOLUTION.slice(),
        samples: DEFAULT_SAMPLES,
        engine: 'CYCLES',
    });
    assert.deepEqual(normalizeSettings({ width: -1, height: 99999, samples: 0 }), {
        resolution: DEFAULT_RESOLUTION.slice(),
        samples: DEFAULT_SAMPLES,
        engine: 'CYCLES',
    });
    assert.deepEqual(normalizeSettings({ width: 1920, height: 1080, samples: 128 }), {
        resolution: [1920, 1080],
        samples: 128,
        engine: 'CYCLES',
    });
});

test('planBuild local argv has factory-startup and python-exit-code without render flags', () => {
    const root = path.join('/tmp', 'blender-shots');
    const plan = planBuild({ shotsRoot: root, scene: stubScene() });
    assert.deepEqual(plan.args, [
        '--background',
        '--factory-startup',
        '--python-exit-code',
        '1',
        '--python',
        plan.scriptPath,
    ]);
    assert.ok(!plan.args.includes('--render-frame'));
    assert.ok(!plan.args.includes('--render-output'));
    assert.deepEqual(plan.settings.resolution, [1280, 720]);
    assert.equal(plan.settings.samples, 64);
});

test('planRemoteRender keeps default resolution and samples for the pod', () => {
    const root = path.join('/tmp', 'blender-shots');
    const plan = planRemoteRender({ shotsRoot: root, scene: stubScene() });
    assert.deepEqual(plan.remoteResolution, [1280, 720]);
    assert.equal(plan.remoteSamples, 64);
    assert.equal(plan.remoteBlend, '/tmp/scene.blend');
});

test('planRemoteRender accepts overrides only for resolution and samples', () => {
    const root = path.join('/tmp', 'blender-shots');
    const plan = planRemoteRender({
        shotsRoot: root,
        scene: stubScene(),
        settings: { width: 960, height: 540, samples: 32 },
    });
    assert.deepEqual(plan.remoteResolution, [960, 540]);
    assert.equal(plan.remoteSamples, 32);
});

test('buildScriptSource requires a summary with objectCount and avoids bpy.ops mesh primitives', () => {
    const source = buildScriptSource({
        scene: stubScene(),
        settings: normalizeSettings({}),
        blendPath: '/tmp/scene.blend',
        summaryPath: '/tmp/summary.json',
        glbPath: '',
    });
    assert.match(source, /objectCount/);
    assert.match(source, /bmesh\.ops\.create_uvsphere/);
    assert.match(source, /SUMMARY_PREFIX/);
    assert.doesNotMatch(source, /primitive_uv_sphere_add/);
    assert.doesNotMatch(source, /--render-frame/);
});

test('parseSummaryOutput requires objectCount', () => {
    const ok = parseSummaryOutput('noise\n__BLENDER_SUMMARY__{"ok":true,"objectCount":4}\n');
    assert.equal(ok.objectCount, 4);
    assert.throws(
        () => parseSummaryOutput('__BLENDER_SUMMARY__{"ok":true}'),
        /objectCount/,
    );
});

test('formatAuditLine summarizes the Blender Lab-style audit', () => {
    const line = formatAuditLine({
        objectCount: 4,
        engine: 'CYCLES',
        resolution: [1280, 720],
        missingFiles: [],
    });
    assert.match(line, /4 objects/);
    assert.match(line, /CYCLES/);
    assert.match(line, /1280×720/);
    assert.match(line, /no missing files/);
});

test('parseVersionText and support gate accept 4.5+', () => {
    assert.deepEqual(parseVersionText('Blender 4.5.1'), { major: 4, minor: 5, patch: 1, text: '4.5.1' });
    assert.equal(isSupportedVersion(parseVersionText('Blender 4.4.0')), false);
    assert.equal(isSupportedVersion(parseVersionText('Blender 4.5.0')), true);
    assert.equal(isSupportedVersion(parseVersionText('Blender 5.0.0')), true);
});

test('officialLinuxArchive points at download.blender.org', () => {
    const archive = officialLinuxArchive({ major: 4, minor: 5, patch: 0 });
    assert.equal(archive.file, 'blender-4.5.0-linux-x64.tar.xz');
    assert.match(archive.url, /download\.blender\.org\/release\/Blender4\.5\//);
});

test('remote install and render commands download official Blender and render one frame', () => {
    const install = installScript({ major: 4, minor: 5, patch: 0 });
    assert.match(install, /download\.blender\.org/);
    assert.match(install, /blender --version/);
    const render = renderCommand();
    assert.match(render, /--background/);
    assert.match(render, /--factory-startup/);
    assert.match(render, /--render-frame 1/);
    assert.match(render, /enable_gpu\.py/);
});

test('prepareShot writes shot.json, build.py, and keeps argv render-free', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blender-prep-'));
    try {
        const paths = {
            dataDir: root,
            root: path.join(root, 'blender'),
            configPath: path.join(root, 'blender.json'),
            shotsRoot: path.join(root, 'blender', 'shots'),
        };
        const plan = prepareShot({
            paths,
            scene: stubScene(),
            settings: {},
        });
        assert.ok(fs.existsSync(plan.shotPath));
        assert.ok(fs.existsSync(plan.scriptPath));
        const script = fs.readFileSync(plan.scriptPath, 'utf8');
        assert.match(script, /objectCount/);
        assert.deepEqual(plan.args.slice(0, 4), ['--background', '--factory-startup', '--python-exit-code', '1']);
        assert.ok(!plan.args.includes('--render-frame'));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('runLocalBuild argv is render-free when spawning a fake blender', async () => {
    const { runLocalBuild } = require('../electron/lib/blenderProvider');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blender-run-'));
    const fakeBin = path.join(root, 'blender');
    fs.writeFileSync(fakeBin, '#!/bin/sh\n');
    try {
        const paths = blenderPaths(root);
        fs.mkdirSync(paths.shotsRoot, { recursive: true });
        let seenArgs = null;
        const spawnImpl = (bin, args) => {
            seenArgs = args;
            const child = new EventEmitter();
            child.stdout = new EventEmitter();
            child.stderr = new EventEmitter();
            child.kill = () => {};
            queueMicrotask(() => {
                const summary = {
                    ok: true,
                    objectCount: 3,
                    engine: 'CYCLES',
                    resolution: [1280, 720],
                    samples: 64,
                    missingFiles: [],
                    blendPath: path.join(paths.shotsRoot, 'current', 'scene.blend'),
                };
                fs.mkdirSync(path.join(paths.shotsRoot, 'current'), { recursive: true });
                fs.writeFileSync(summary.blendPath, 'BLEND');
                fs.writeFileSync(
                    path.join(paths.shotsRoot, 'current', 'summary.json'),
                    JSON.stringify(summary),
                );
                child.stdout.emit('data', Buffer.from(`__BLENDER_SUMMARY__${JSON.stringify(summary)}\n`));
                child.emit('close', 0);
            });
            return child;
        };
        const result = await runLocalBuild({
            binaryPath: fakeBin,
            paths,
            scene: stubScene(),
            settings: {},
            spawnImpl,
        });
        assert.ok(seenArgs.includes('--factory-startup'));
        assert.ok(seenArgs.includes('--python-exit-code'));
        assert.ok(!seenArgs.includes('--render-frame'));
        assert.equal(result.summary.objectCount, 3);
        assert.match(result.audit, /3 objects/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
