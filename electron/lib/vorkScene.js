// Pure vork scene and launch planning. No Electron, no process spawn.
// The desktop provider writes this JSON and launches the official binary.
// Stills and frame-range MP4 share one scene. glTF is a .glb beside that JSON.

const path = require('path');

const PROFILES = Object.freeze(['std/previs', 'std/final']);
const OUTPUTS = Object.freeze(['png', 'mp4']);
const DEFAULT_SHOT_ID = 'current';
const DEFAULT_FRAME_START = 0;
const DEFAULT_FRAME_END = 47;
const MAX_FRAME = 10000;
const MAX_FRAME_SPAN = 600;
const MAX_SCENE_BYTES = 512 * 1024;
const GLB_FILE = 'model.glb';

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
    const prefix = typeof env.PREFIX === 'string' ? env.PREFIX.trim() : '';
    if (platform === 'win32') {
        const localAppData = env.LOCALAPPDATA || p.join(homedir, 'AppData', 'Local');
        const programFiles = env.ProgramFiles || p.join('C:', 'Program Files');
        const list = [
            p.join(localAppData, 'Programs', 'vork', 'vork.exe'),
            p.join(homedir, '.local', 'bin', 'vork.exe'),
            p.join(homedir, '.local', 'lib', 'vork', 'vork.exe'),
            p.join(programFiles, 'vork', 'vork.exe'),
        ];
        if (prefix) {
            list.push(p.join(prefix, 'bin', 'vork.exe'));
            list.push(p.join(prefix, 'lib', 'vork', 'vork.exe'));
        }
        return list;
    }
    const list = [
        p.join(homedir, '.local', 'bin', 'vork'),
        p.join(homedir, '.local', 'lib', 'vork', 'vork'),
        p.join(homedir, 'bin', 'vork'),
        '/usr/local/bin/vork',
        '/usr/bin/vork',
        '/opt/vork/vork',
        '/opt/homebrew/bin/vork',
    ];
    if (prefix) {
        list.push(p.join(prefix, 'bin', 'vork'));
        list.push(p.join(prefix, 'lib', 'vork', 'vork'));
    }
    return list;
}

function missingBinaryMessage({ platform = process.platform } = {}) {
    if (platform === 'win32') {
        return 'vork was not found. Install the official release from https://github.com/voyager-so/vork/releases so vork.exe is at %LOCALAPPDATA%\\Programs\\vork\\vork.exe, or paste that path in VFX Studio. You can also set the VORK_BIN environment variable.';
    }
    return 'vork was not found. Install the official release from https://github.com/voyager-so/vork/releases so the binary is at ~/.local/bin/vork or ~/.local/lib/vork/vork, or paste that path in VFX Studio. You can also set the VORK_BIN environment variable.';
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
    const names = platform === 'win32' ? ['vork.exe', 'vork'] : ['vork'];
    const saved = typeof savedPath === 'string' ? savedPath.trim() : '';
    const fromEnv = typeof env.VORK_BIN === 'string' ? env.VORK_BIN.trim() : '';
    const candidates = [];
    if (saved) candidates.push(saved);
    if (fromEnv) candidates.push(fromEnv);
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

function assertGlbBasename(file) {
    if (typeof file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.glb$/i.test(file)) {
        throw new Error('glTF file must be a .glb in the shot folder');
    }
    return file;
}

function glbFiles(scene) {
    return scene.nodes
        .filter((node) => node && node.type === 'asset')
        .map((node) => assertGlbBasename(node.file));
}

function validateScene(scene) {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
        throw new Error('scene must be a JSON object');
    }
    if (scene.version !== 2) throw new Error('scene.version must be 2');
    if (!Array.isArray(scene.nodes) || scene.nodes.length === 0) {
        throw new Error('scene.nodes must be a non-empty array');
    }
    glbFiles(scene);
    const encoded = JSON.stringify(scene);
    if (Buffer.byteLength(encoded) > MAX_SCENE_BYTES) {
        throw new Error('scene JSON is too large');
    }
    return JSON.parse(encoded);
}

function upsertAsset(scene, file = GLB_FILE) {
    const name = assertGlbBasename(file);
    const nodes = (scene.nodes || []).filter((node) => !(node && node.type === 'asset' && node.file === name));
    nodes.push({ type: 'asset', file: name });
    return validateScene({ ...scene, nodes });
}

function normalizeFrames(frameStart, frameEnd) {
    const start = frameStart == null ? DEFAULT_FRAME_START : frameStart;
    const end = frameEnd == null ? DEFAULT_FRAME_END : frameEnd;
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error('frame range must be integers');
    }
    if (start < 0 || end > MAX_FRAME || end < start) {
        throw new Error('frame range is out of bounds');
    }
    if ((end - start + 1) > MAX_FRAME_SPAN) {
        throw new Error(`frame range is longer than ${MAX_FRAME_SPAN} frames`);
    }
    return { frameStart: start, frameEnd: end };
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

function planRender({
    shotsRoot,
    scene,
    profile,
    shotId = DEFAULT_SHOT_ID,
    output = 'png',
    frameStart,
    frameEnd,
} = {}) {
    if (!shotsRoot) throw new Error('shotsRoot is required');
    if (!PROFILES.includes(profile)) {
        throw new Error('profile must be std/previs or std/final');
    }
    if (!OUTPUTS.includes(output)) throw new Error('output must be png or mp4');
    const validated = validateScene(scene);
    const id = assertShotId(shotId);
    const shotDir = assertInside(shotsRoot, path.join(shotsRoot, id));
    const shotPath = assertInside(shotDir, path.join(shotDir, 'shot.json'));
    const frames = output === 'mp4' ? normalizeFrames(frameStart, frameEnd) : null;
    if (output === 'png' && (frameStart != null || frameEnd != null)) {
        throw new Error('frame range is only for mp4');
    }
    const outPath = assertInside(shotDir, path.join(shotDir, output === 'mp4' ? 'clip.mp4' : 'out.png'));
    for (const file of glbFiles(validated)) {
        assertInside(shotDir, path.join(shotDir, file));
    }
    const args = ['render', shotPath, '--profile', profile];
    if (frames) {
        args.push('--frame-start', String(frames.frameStart), '--frame-end', String(frames.frameEnd));
    }
    args.push('--out', outPath);
    return {
        shotDir,
        shotPath,
        outPath,
        kind: output === 'mp4' ? 'video' : 'image',
        output,
        frameStart: frames ? frames.frameStart : null,
        frameEnd: frames ? frames.frameEnd : null,
        args,
        scene: validated,
    };
}

module.exports = {
    PROFILES,
    OUTPUTS,
    DEFAULT_SHOT_ID,
    DEFAULT_FRAME_START,
    DEFAULT_FRAME_END,
    MAX_FRAME_SPAN,
    MAX_SCENE_BYTES,
    GLB_FILE,
    STUB_SCENE,
    stubScene,
    pathsFor,
    defaultBinaryCandidates,
    discoverBinary,
    missingBinaryMessage,
    validateScene,
    upsertAsset,
    glbFiles,
    planRender,
};
