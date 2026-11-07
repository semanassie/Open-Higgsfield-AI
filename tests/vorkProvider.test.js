const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const {
    discoverBinary,
    planRender,
    stubScene,
    validateScene,
} = require('../electron/lib/vorkScene');
const { importGltf, runRender, runSetup, vorkPaths } = require('../electron/lib/vorkProvider');

function exists(paths, resolver = path.resolve) {
    const set = new Set(paths.map((entry) => resolver(entry)));
    return (candidate) => set.has(resolver(candidate));
}

test('discoverBinary prefers a saved path that exists', () => {
    const saved = path.join('/opt', 'vork');
    const found = discoverBinary({
        platform: 'linux',
        env: {},
        homedir: '/home/ada',
        savedPath: saved,
        existsSync: exists([saved]),
    });
    assert.equal(found, path.resolve(saved));
});

test('discoverBinary falls through a missing saved path to the default install', () => {
    const home = '/home/ada';
    const def = path.join(home, '.local', 'bin', 'vork');
    const found = discoverBinary({
        platform: 'linux',
        env: { PATH: '/usr/bin' },
        homedir: home,
        savedPath: '/missing/vork',
        existsSync: exists([def]),
    });
    assert.equal(found, path.resolve(def));
});

test('discoverBinary uses the Windows default install path', () => {
    const expected = path.win32.join('C:\\Users\\ada\\AppData\\Local', 'Programs', 'vork', 'vork.exe');
    const found = discoverBinary({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\ada\\AppData\\Local', Path: '' },
        homedir: 'C:\\Users\\ada',
        existsSync: exists([expected], path.win32.resolve),
    });
    assert.equal(found, path.win32.resolve(expected));
});

test('discoverBinary searches PATH after the default location', () => {
    const fromPath = path.join('/opt', 'bin', 'vork');
    const found = discoverBinary({
        platform: 'linux',
        env: { PATH: `/usr/bin${path.delimiter}/opt/bin` },
        homedir: '/home/ada',
        existsSync: exists([fromPath]),
    });
    assert.equal(found, path.resolve(fromPath));
});

test('discoverBinary returns null when nothing is installed', () => {
    const found = discoverBinary({
        platform: 'linux',
        env: { PATH: '/usr/bin' },
        homedir: '/home/ada',
        existsSync: () => false,
    });
    assert.equal(found, null);
});

test('planRender builds a still-image command for both profiles', () => {
    const root = path.join('/tmp', 'shots');
    for (const profile of ['std/previs', 'std/final']) {
        const plan = planRender({ shotsRoot: root, scene: stubScene(), profile });
        assert.deepEqual(plan.args, [
            'render',
            path.join(root, 'current', 'shot.json'),
            '--profile',
            profile,
            '--out',
            path.join(root, 'current', 'out.png'),
        ]);
    }
});

test('planRender rejects unknown profiles and frame ranges on stills', () => {
    const root = path.join('/tmp', 'shots');
    assert.throws(
        () => planRender({ shotsRoot: root, scene: stubScene(), profile: 'std/path' }),
        /std\/previs or std\/final/
    );
    assert.throws(
        () => planRender({ shotsRoot: root, scene: stubScene(), profile: 'std/final', frameStart: 0, frameEnd: 10 }),
        /only for mp4/
    );
});

test('planRender builds a frame-range mp4 command from the same scene', () => {
    const root = path.join('/tmp', 'shots');
    const scene = stubScene();
    scene.nodes.push({ type: 'asset', file: 'model.glb' });
    const plan = planRender({
        shotsRoot: root,
        scene,
        profile: 'std/final',
        output: 'mp4',
        frameStart: 0,
        frameEnd: 47,
    });
    assert.deepEqual(plan.args, [
        'render',
        path.join(root, 'current', 'shot.json'),
        '--profile',
        'std/final',
        '--frame-start',
        '0',
        '--frame-end',
        '47',
        '--out',
        path.join(root, 'current', 'clip.mp4'),
    ]);
    assert.equal(plan.scene.nodes.length, 5);
});

test('validateScene accepts a shot-local glb and rejects paths outside it', () => {
    const scene = stubScene();
    scene.nodes.push({ type: 'asset', file: 'model.glb' });
    assert.equal(validateScene(scene).nodes.at(-1).file, 'model.glb');
    const escaped = stubScene();
    escaped.nodes.push({ type: 'asset', file: '../model.glb' });
    assert.throws(() => validateScene(escaped), /shot folder/);
    const sidecar = stubScene();
    sidecar.nodes.push({ type: 'asset', file: 'model.gltf' });
    assert.throws(() => validateScene(sidecar), /shot folder/);
});

test('planRender keeps the output inside the shot directory', () => {
    assert.throws(
        () => planRender({
            shotsRoot: path.join('/tmp', 'shots'),
            scene: stubScene(),
            profile: 'std/previs',
            shotId: '..',
        }),
        /shot id/
    );
});

test('runRender writes the stub scene and launches the binary without a shell', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vork-slice-'));
    const paths = vorkPaths(path.join(dir, 'user-data'), {});
    const binary = path.join(dir, 'vork');
    fs.writeFileSync(binary, '');
    let spawned = null;
    const result = await runRender({
        binaryPath: binary,
        paths,
        scene: stubScene(),
        profile: 'std/previs',
        spawnImpl(file, args, options) {
            spawned = { file, args, options };
            const child = new EventEmitter();
            child.stdout = new EventEmitter();
            child.stderr = new EventEmitter();
            child.kill = () => {};
            fs.mkdirSync(path.dirname(args[1]), { recursive: true });
            fs.writeFileSync(args[args.indexOf('--out') + 1], Buffer.from([0x89, 0x50, 0x4e, 0x47]));
            process.nextTick(() => child.emit('close', 0));
            return child;
        },
    });

    assert.equal(spawned.file, binary);
    assert.equal(spawned.options.shell, false);
    assert.equal(spawned.args[0], 'render');
    assert.equal(spawned.args[3], 'std/previs');
    assert.equal(spawned.options.env.VORK_CACHE_DIR, paths.cacheDir);
    const written = JSON.parse(fs.readFileSync(path.join(paths.shotsRoot, 'current', 'shot.json'), 'utf8'));
    assert.equal(written.version, 2);
    assert.equal(written.nodes.length, 4);
    assert.match(result.url, /^data:image\/png;base64,/);
    assert.equal(result.kind, 'image');
});

function fakeSpawn(onSpawn) {
    return (file, args, options) => {
        onSpawn({ file, args, options });
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = () => {};
        const outIndex = args.indexOf('--out');
        if (outIndex !== -1) {
            fs.mkdirSync(path.dirname(args[outIndex + 1]), { recursive: true });
            fs.writeFileSync(args[outIndex + 1], Buffer.from('clip'));
        }
        process.nextTick(() => child.emit('close', 0));
        return child;
    };
}

test('runRender launches an mp4 with the default frame range and does not inline the file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vork-mp4-'));
    const paths = vorkPaths(path.join(dir, 'user-data'), {});
    const binary = path.join(dir, 'vork');
    fs.writeFileSync(binary, '');
    let spawned = null;
    const result = await runRender({
        binaryPath: binary,
        paths,
        scene: stubScene(),
        profile: 'std/final',
        output: 'mp4',
        spawnImpl: fakeSpawn((info) => { spawned = info; }),
    });
    assert.equal(spawned.options.shell, false);
    assert.deepEqual(spawned.args.slice(2, 8), ['--profile', 'std/final', '--frame-start', '0', '--frame-end', '47']);
    assert.equal(result.kind, 'video');
    assert.equal(result.url, undefined);
    assert.equal(result.outPath, path.join(paths.shotsRoot, 'current', 'clip.mp4'));
    assert.match(result.fileUrl, /^file:/);
});

test('runSetup launches vork setup and records completion', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vork-setup-'));
    const paths = vorkPaths(path.join(dir, 'user-data'), {});
    const binary = path.join(dir, 'vork');
    fs.writeFileSync(binary, '');
    let args = null;
    const result = await runSetup({
        binaryPath: binary,
        paths,
        spawnImpl: fakeSpawn((info) => { args = info.args; }),
    });
    assert.deepEqual(args, ['setup']);
    assert.equal(result.ok, true);
    const saved = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
    assert.equal(saved.setupComplete, true);
});

test('importGltf copies model.glb into the shot and adds an asset node', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vork-glb-'));
    const paths = vorkPaths(path.join(dir, 'user-data'), {});
    const source = path.join(dir, 'hero.glb');
    fs.writeFileSync(source, Buffer.from('glb-bytes'));
    const imported = importGltf({ paths, sourcePath: source, scene: stubScene() });
    const copied = fs.readFileSync(path.join(paths.shotsRoot, 'current', 'model.glb'));
    assert.equal(copied.toString(), 'glb-bytes');
    assert.equal(imported.scene.nodes.at(-1).type, 'asset');
    assert.equal(imported.scene.nodes.at(-1).file, 'model.glb');
    assert.throws(() => importGltf({ paths, sourcePath: path.join(dir, 'notes.gltf'), scene: stubScene() }), /only \.glb/);
});
