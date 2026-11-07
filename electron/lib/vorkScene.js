// Pure vork scene and launch planning. No Electron, no process spawn.
// The desktop provider writes this JSON and launches the official binary.
// MP4 frame ranges, glTF assets, and `vork setup` are intentionally absent.

const path = require('path');

const PROFILES = Object.freeze(['std/previs', 'std/final']);
const DEFAULT_SHOT_ID = 'current';
const MAX_SCENE_BYTES = 512 * 1024;

const STUB_SCENE = Object.freeze({
    version: 2,
    nodes: [
        {
            type: 'mesh',
            geometry: { std: 'sphere', radius: 1 },
            materials: [{ inputs: { base_color: [0.12, 0.35, 0.65], specular_roughness: 0.3 } }],
        },
        {
            type: 'mesh',
            translation: [0, -1, 0],
            geometry: { std: 'grid', size: [10, 10] },
            materials: [{ inputs: { base_color: [0.35, 0.35, 0.35] } }],
        },
        {
            type: 'light',
            shape: 'rectangle',
            translation: [-3, 5, 4],
            target: [0, 0, 0],
            energy: 700,
            size: 4,
            color: [1, 0.92, 0.8],
        },
        {
            type: 'camera',
            translation: [3, 2, 5],
            target: [0, 0, 0],
        },
    ],
    render: { resolution: [640, 480] },
});

function stubScene() {
    return JSON.parse(JSON.stringify(STUB_SCENE));
}

function pathsFor(platform) {
    return platform === 'win32' ? path.win32 : path.posix;
}

function defaultBinaryCandidates({ platform, env = {}, homedir }) {
    if (!homedir) throw new Error('homedir is required');
    const p = pathsFor(platform);
    if (platform === 'win32') {
        const localAppData = env.LOCALAPPDATA || p.join(homedir, 'AppData', 'Local');
        return [p.join(localAppData, 'Programs', 'vork', 'vork.exe')];
    }
    return [p.join(homedir, '.local', 'bin', 'vork')];
}

function pathDirectories(env = {}, platform) {
    const raw = env.PATH || env.Path || '';
    const sep = platform === 'win32' ? ';' : ':';
    return raw.split(sep).map((entry) => entry.trim()).filter(Boolean);
}

function discoverBinary({
    platform = process.platform,
    env = process.env,
    homedir,
    savedPath = '',
    existsSync,
} = {}) {
    if (typeof existsSync !== 'function') throw new Error('existsSync is required');
    const p = pathsFor(platform);
    const names = platform === 'win32' ? ['vork.exe'] : ['vork'];
    const saved = typeof savedPath === 'string' ? savedPath.trim() : '';
    const candidates = [];
    if (saved) candidates.push(saved);
    candidates.push(...defaultBinaryCandidates({ platform, env, homedir }));
    for (const dir of pathDirectories(env, platform)) {
        for (const name of names) candidates.push(p.join(dir, name));
    }

    const seen = new Set();
    for (const candidate of candidates) {
        const resolved = p.resolve(candidate);
        if (seen.has(resolved)) continue;
        seen.add(resolved);
        if (existsSync(resolved)) return resolved;
    }
    return null;
}

function rejectGltf(value) {
    if (Array.isArray(value)) {
        value.forEach(rejectGltf);
        return;
    }
    if (!value || typeof value !== 'object') return;
    if (value.type === 'asset') {
        throw new Error('glTF import is not part of this slice');
    }
    for (const entry of Object.values(value)) {
        if (typeof entry === 'string' && /\.gl(b|tf)$/i.test(entry.trim())) {
            throw new Error('glTF import is not part of this slice');
        }
        rejectGltf(entry);
    }
}

function validateScene(scene) {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
        throw new Error('scene must be a JSON object');
    }
    if (scene.version !== 2) throw new Error('scene.version must be 2');
    if (!Array.isArray(scene.nodes) || scene.nodes.length === 0) {
        throw new Error('scene.nodes must be a non-empty array');
    }
    rejectGltf(scene);
    const encoded = JSON.stringify(scene);
    if (Buffer.byteLength(encoded) > MAX_SCENE_BYTES) {
        throw new Error('scene JSON is too large');
    }
    return JSON.parse(encoded);
}

function assertShotId(shotId) {
    const id = shotId || DEFAULT_SHOT_ID;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
        throw new Error('invalid shot id');
    }
    return id;
}

function assertInside(root, target) {
    const base = path.resolve(root);
    const resolved = path.resolve(target);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
        throw new Error('path escapes the shot directory');
    }
    return resolved;
}

function planRender({ shotsRoot, scene, profile, shotId = DEFAULT_SHOT_ID } = {}) {
    if (!shotsRoot) throw new Error('shotsRoot is required');
    if (!PROFILES.includes(profile)) {
        throw new Error('profile must be std/previs or std/final');
    }
    const validated = validateScene(scene);
    const id = assertShotId(shotId);
    const shotDir = assertInside(shotsRoot, path.join(shotsRoot, id));
    const shotPath = assertInside(shotDir, path.join(shotDir, 'shot.json'));
    const outPath = assertInside(shotDir, path.join(shotDir, 'out.png'));
    return {
        shotDir,
        shotPath,
        outPath,
        args: ['render', shotPath, '--profile', profile, '--out', outPath],
        scene: validated,
    };
}

module.exports = {
    PROFILES,
    DEFAULT_SHOT_ID,
    MAX_SCENE_BYTES,
    STUB_SCENE,
    stubScene,
    pathsFor,
    defaultBinaryCandidates,
    discoverBinary,
    validateScene,
    planRender,
};
