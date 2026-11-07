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
const { runRender, vorkPaths } = require('../electron/lib/vorkProvider');

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

test('planRender rejects video profiles and glTF scenes', () => {
    const root = path.join('/tmp', 'shots');
    assert.throws(
        () => planRender({ shotsRoot: root, scene: stubScene(), profile: 'std/path' }),
        /std\/previs or std\/final/
    );
    const gltf = stubScene();
    gltf.nodes.push({ type: 'asset', file: 'model.glb' });
    assert.throws(() => validateScene(gltf), /glTF/);
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
});
