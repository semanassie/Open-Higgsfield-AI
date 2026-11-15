// Pure Blender scene helpers. No Electron, no process spawn.
// Converts the shared VFX shot.json into a headless bpy build plan.

const fs = require('fs');
const path = require('path');
const { stubScene, validateScene, GLB_FILE, DEFAULT_SHOT_ID } = require('./vorkScene');

const DEFAULT_RESOLUTION = Object.freeze([1280, 720]);
const DEFAULT_SAMPLES = 64;
const DEFAULT_ENGINE = 'CYCLES';
const MIN_BLENDER_MAJOR = 4;
const MIN_BLENDER_MINOR = 5;
const LOCAL_BUILD_TIMEOUT_MS = 120 * 1000;
const REMOTE_JOB_TIMEOUT_MS = 10 * 60 * 1000;
const SUMMARY_PREFIX = '__BLENDER_SUMMARY__';
const RESULT_FILE = 'summary.json';
const BLEND_FILE = 'scene.blend';
const BUILD_SCRIPT = 'build.py';
const OUT_PNG = 'out.png';

function pathsFor(platform) {
    return platform === 'win32' ? path.win32 : path.posix;
}

function normalizeSettings(input = {}) {
    const width = Number(input.width ?? input.resolution?.[0] ?? DEFAULT_RESOLUTION[0]);
    const height = Number(input.height ?? input.resolution?.[1] ?? DEFAULT_RESOLUTION[1]);
    const samples = Number(input.samples ?? DEFAULT_SAMPLES);
    const safeWidth = Number.isFinite(width) && width >= 64 && width <= 4096
        ? Math.round(width)
        : DEFAULT_RESOLUTION[0];
    const safeHeight = Number.isFinite(height) && height >= 64 && height <= 4096
        ? Math.round(height)
        : DEFAULT_RESOLUTION[1];
    const safeSamples = Number.isFinite(samples) && samples >= 1 && samples <= 4096
        ? Math.round(samples)
        : DEFAULT_SAMPLES;
    return {
        resolution: [safeWidth, safeHeight],
        samples: safeSamples,
        engine: DEFAULT_ENGINE,
    };
}

function missingBinaryMessage({ platform = process.platform } = {}) {
    if (platform === 'win32') {
        return 'Blender was not found. Install Blender 4.5 or newer from https://www.blender.org/download/ so blender.exe is under Program Files\\Blender Foundation, or paste the path in VFX Studio. You can also set BLENDER_PATH.';
    }
    return 'Blender was not found. Install Blender 4.5 or newer from https://www.blender.org/download/, or paste the binary path in VFX Studio. You can also set BLENDER_PATH.';
}

function pathDirectories(env = {}, platform) {
    const raw = env.PATH || env.Path || '';
    const sep = platform === 'win32' ? ';' : ':';
    return raw.split(sep).map((entry) => entry.trim()).filter(Boolean);
}

function listFoundationCandidates({ platform, env = {}, existsSync, readdirSync }) {
    const p = pathsFor(platform);
    const list = [];
    if (platform === 'win32') {
        const programFiles = env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        for (const root of [programFiles, programFilesX86]) {
            const foundation = p.join(root, 'Blender Foundation');
            if (!existsSync(foundation)) continue;
            let entries = [];
            try {
                entries = readdirSync(foundation, { withFileTypes: true });
            } catch {
                continue;
            }
            for (const entry of entries) {
                const name = entry.name || entry;
                const isDir = typeof entry.isDirectory === 'function' ? entry.isDirectory() : true;
                if (!isDir) continue;
                list.push(p.join(foundation, name, 'blender.exe'));
            }
        }
        return list;
    }
    const roots = [
        '/Applications',
        '/usr/local',
        '/opt',
        '/opt/homebrew',
    ];
    for (const root of roots) {
        if (root === '/Applications') {
            list.push('/Applications/Blender.app/Contents/MacOS/Blender');
            continue;
        }
        list.push(p.join(root, 'bin', 'blender'));
        const foundation = p.join(root, 'blender');
        if (!existsSync(foundation)) continue;
        let entries = [];
        try {
            entries = readdirSync(foundation, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const name = entry.name || entry;
            list.push(p.join(foundation, name, 'blender'));
        }
    }
    return list;
}

function defaultBinaryCandidates({ platform, env = {}, homedir, existsSync, readdirSync }) {
    const p = pathsFor(platform);
    const list = [];
    list.push(...listFoundationCandidates({ platform, env, existsSync, readdirSync }));
    if (platform === 'win32') {
        const localAppData = env.LOCALAPPDATA || p.join(homedir, 'AppData', 'Local');
        list.push(p.join(localAppData, 'Programs', 'Blender Foundation', 'Blender', 'blender.exe'));
    } else {
        list.push(p.join(homedir, '.local', 'bin', 'blender'));
        list.push('/usr/bin/blender');
        list.push('/snap/bin/blender');
    }
    return list;
}

function discoverBinary({
    platform = process.platform,
    env = process.env,
    homedir,
    savedPath = '',
    existsSync,
    readdirSync = fs.readdirSync,
} = {}) {
    if (typeof existsSync !== 'function') throw new Error('existsSync is required');
    if (!homedir) throw new Error('homedir is required');
    const p = pathsFor(platform);
    const names = platform === 'win32' ? ['blender.exe', 'blender'] : ['blender'];
    const saved = typeof savedPath === 'string' ? savedPath.trim() : '';
    const fromEnv = typeof (env.BLENDER_PATH || env.BLENDER_BIN) === 'string'
        ? String(env.BLENDER_PATH || env.BLENDER_BIN).trim()
        : '';
    const candidates = [];
    if (saved) candidates.push(saved);
    if (fromEnv) candidates.push(fromEnv);
    candidates.push(...defaultBinaryCandidates({ platform, env, homedir, existsSync, readdirSync }));
    for (const dir of pathDirectories(env, platform)) {
        for (const name of names) candidates.push(p.join(dir, name));
    }

    const seen = new Set();
    const found = [];
    for (const candidate of candidates) {
        const resolved = p.resolve(candidate);
        if (seen.has(resolved)) continue;
        seen.add(resolved);
        if (existsSync(resolved)) found.push(resolved);
    }
    if (!found.length) return null;
    // Prefer the lexicographically last path so newer version folders win.
    found.sort();
    return found[found.length - 1];
}

function parseVersionText(text) {
    const match = String(text || '').match(/Blender\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
    if (!match) return null;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3] || 0),
        text: `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}`,
    };
}

function isSupportedVersion(version) {
    if (!version) return false;
    if (version.major > MIN_BLENDER_MAJOR) return true;
    if (version.major < MIN_BLENDER_MAJOR) return false;
    return version.minor >= MIN_BLENDER_MINOR;
}

function officialLinuxArchive(version) {
    const major = version?.major || MIN_BLENDER_MAJOR;
    const minor = version?.minor != null ? version.minor : MIN_BLENDER_MINOR;
    const patch = version?.patch != null ? version.patch : 0;
    const series = `${major}.${minor}`;
    const full = `${major}.${minor}.${patch}`;
    const file = `blender-${full}-linux-x64.tar.xz`;
    return {
        series,
        full,
        file,
        url: `https://download.blender.org/release/Blender${series}/${file}`,
    };
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

function planBuild({
    shotsRoot,
    scene,
    settings,
    shotId = DEFAULT_SHOT_ID,
} = {}) {
    if (!shotsRoot) throw new Error('shotsRoot is required');
    const validated = validateScene(scene || stubScene());
    const resolvedSettings = normalizeSettings(settings);
    const id = assertShotId(shotId);
    const shotDir = assertInside(shotsRoot, path.join(shotsRoot, id));
    const shotPath = assertInside(shotDir, path.join(shotDir, 'shot.json'));
    const blendPath = assertInside(shotDir, path.join(shotDir, BLEND_FILE));
    const scriptPath = assertInside(shotDir, path.join(shotDir, BUILD_SCRIPT));
    const summaryPath = assertInside(shotDir, path.join(shotDir, RESULT_FILE));
    const outPath = assertInside(shotDir, path.join(shotDir, OUT_PNG));
    const glbName = validated.nodes.find((node) => node && node.type === 'asset')?.file || '';
    const glbPath = glbName ? assertInside(shotDir, path.join(shotDir, path.basename(glbName))) : '';
    const args = [
        '--background',
        '--factory-startup',
        '--python-exit-code',
        '1',
        '--python',
        scriptPath,
    ];
    return {
        shotDir,
        shotPath,
        blendPath,
        scriptPath,
        summaryPath,
        outPath,
        glbPath,
        glbName: glbName ? path.basename(glbName) : '',
        args,
        scene: validated,
        settings: resolvedSettings,
    };
}

function planRemoteRender({
    shotsRoot,
    scene,
    settings,
    shotId = DEFAULT_SHOT_ID,
} = {}) {
    const plan = planBuild({ shotsRoot, scene, settings, shotId });
    return {
        ...plan,
        remoteBlend: '/tmp/scene.blend',
        remoteOut: '/tmp/frame0001.png',
        remoteOutPattern: '/tmp/frame####',
        remoteSamples: plan.settings.samples,
        remoteResolution: plan.settings.resolution,
    };
}

function buildScriptSource({ scene, settings, blendPath, summaryPath, glbPath }) {
    const payload = {
        scene,
        settings: normalizeSettings(settings),
        blendPath: String(blendPath).replace(/\\/g, '/'),
        summaryPath: String(summaryPath).replace(/\\/g, '/'),
        glbPath: glbPath ? String(glbPath).replace(/\\/g, '/') : '',
    };
    return `# Auto-generated by Open Generative AI. Data-API first; no interactive UI.
import bpy
import bmesh
import json
import math
from mathutils import Vector, Euler

PAYLOAD = json.loads(${JSON.stringify(JSON.stringify(payload))})
SUMMARY_PREFIX = ${JSON.stringify(SUMMARY_PREFIX)}

def clear_scene():
    data = bpy.data
    for collection in list(data.collections):
        data.collections.remove(collection)
    for obj in list(data.objects):
        data.objects.remove(obj, do_unlink=True)
    for block in list(data.meshes):
        data.meshes.remove(block)
    for block in list(data.lights):
        data.lights.remove(block)
    for block in list(data.cameras):
        data.cameras.remove(block)
    for block in list(data.materials):
        data.materials.remove(block)

def ensure_collection():
    col = bpy.data.collections.new("Shot")
    bpy.context.scene.collection.children.link(col)
    return col

def link(obj, collection):
    collection.objects.link(obj)
    return obj

def make_material(name, color, roughness=0.4):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (float(color[0]), float(color[1]), float(color[2]), 1.0)
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = float(roughness)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat

def mesh_from_bmesh(name, builder):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    builder(bm)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    return obj

def add_sphere(node, collection, index):
    radius = float((node.get("geometry") or {}).get("radius") or 1)
    obj = mesh_from_bmesh(f"Sphere_{index}", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=radius))
    color = ((node.get("materials") or [{}])[0].get("inputs") or {}).get("base_color") or [0.12, 0.35, 0.65]
    roughness = ((node.get("materials") or [{}])[0].get("inputs") or {}).get("specular_roughness") or 0.3
    obj.data.materials.append(make_material(f"Mat_Sphere_{index}", color, roughness))
    translation = node.get("translation") or [0, 0, 0]
    obj.location = Vector((float(translation[0]), float(translation[1]), float(translation[2])))
    return link(obj, collection)

def add_grid(node, collection, index):
    size = (node.get("geometry") or {}).get("size") or [10, 10]
    sx = float(size[0]) if isinstance(size, list) else float(size)
    sy = float(size[1]) if isinstance(size, list) and len(size) > 1 else sx
    obj = mesh_from_bmesh(f"Grid_{index}", lambda bm: bmesh.ops.create_grid(bm, x_segments=8, y_segments=8, size=max(sx, sy) * 0.5))
    if abs(sx - sy) > 1e-6:
        obj.scale = Vector((sx / max(sx, sy), sy / max(sx, sy), 1.0))
    color = ((node.get("materials") or [{}])[0].get("inputs") or {}).get("base_color") or [0.35, 0.35, 0.35]
    obj.data.materials.append(make_material(f"Mat_Grid_{index}", color, 0.8))
    translation = node.get("translation") or [0, 0, 0]
    obj.location = Vector((float(translation[0]), float(translation[1]), float(translation[2])))
    return link(obj, collection)

def look_at(obj, target):
    direction = Vector((float(target[0]), float(target[1]), float(target[2]))) - obj.location
    if direction.length < 1e-6:
        return
    quat = direction.to_track_quat('-Z', 'Y')
    obj.rotation_euler = quat.to_euler()

def add_light(node, collection, index):
    energy = float(node.get("energy") or 700)
    color = node.get("color") or [1, 0.92, 0.8]
    light = bpy.data.lights.new(name=f"Light_{index}", type='AREA')
    light.energy = energy
    light.color = (float(color[0]), float(color[1]), float(color[2]))
    size = float(node.get("size") or 4)
    light.size = size
    obj = bpy.data.objects.new(f"Light_{index}", light)
    translation = node.get("translation") or [-3, 5, 4]
    obj.location = Vector((float(translation[0]), float(translation[1]), float(translation[2])))
    target = node.get("target") or [0, 0, 0]
    look_at(obj, target)
    return link(obj, collection)

def add_camera(node, collection, index):
    cam = bpy.data.cameras.new(name=f"Camera_{index}")
    obj = bpy.data.objects.new(f"Camera_{index}", cam)
    translation = node.get("translation") or [3, 2, 5]
    obj.location = Vector((float(translation[0]), float(translation[1]), float(translation[2])))
    target = node.get("target") or [0, 0, 0]
    look_at(obj, target)
    link(obj, collection)
    bpy.context.scene.camera = obj
    return obj

def import_glb(path, collection):
    if not path:
        return []
    before = set(bpy.data.objects.keys())
    # glTF has no data-API importer; this operator works headless.
    if hasattr(bpy.ops.wm, "glb_import"):
        result = bpy.ops.wm.glb_import(filepath=path)
    else:
        result = bpy.ops.import_scene.gltf(filepath=path)
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF import failed: {result}")
    added = []
    for name in bpy.data.objects.keys():
        if name in before:
            continue
        obj = bpy.data.objects[name]
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        collection.objects.link(obj)
        added.append(name)
    return added

def apply_render_settings(settings):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = int(settings["samples"])
    scene.render.resolution_x = int(settings["resolution"][0])
    scene.render.resolution_y = int(settings["resolution"][1])
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = "/tmp/frame####"
    prefs = bpy.context.preferences.addons.get("cycles")
    if prefs:
        cprefs = prefs.preferences
        try:
            cprefs.compute_device_type = "OPTIX"
            for device in cprefs.get_devices_for_type("OPTIX"):
                device.use = True
            scene.cycles.device = "GPU"
        except Exception:
            try:
                cprefs.compute_device_type = "CUDA"
                for device in cprefs.get_devices_for_type("CUDA"):
                    device.use = True
                scene.cycles.device = "GPU"
            except Exception:
                scene.cycles.device = "CPU"

def missing_files():
    missing = []
    for image in bpy.data.images:
        if image.filepath and image.filepath.startswith("//") is False:
            # packed or generated images are fine
            pass
        if getattr(image, "is_dirty", False):
            continue
        fp = bpy.path.abspath(image.filepath) if image.filepath else ""
        if fp and not fp.startswith("<") and image.source == "FILE":
            import os
            if not os.path.exists(fp):
                missing.append(fp)
    return missing

def main():
    clear_scene()
    collection = ensure_collection()
    scene = PAYLOAD["scene"]
    settings = PAYLOAD["settings"]
    created = []
    for index, node in enumerate(scene.get("nodes") or []):
        ntype = node.get("type")
        if ntype == "mesh":
            geom = (node.get("geometry") or {}).get("std")
            if geom == "sphere":
                created.append(add_sphere(node, collection, index).name)
            elif geom == "grid":
                created.append(add_grid(node, collection, index).name)
        elif ntype == "light":
            created.append(add_light(node, collection, index).name)
        elif ntype == "camera":
            created.append(add_camera(node, collection, index).name)
        elif ntype == "asset":
            continue
    imported = import_glb(PAYLOAD.get("glbPath") or "", collection)
    created.extend(imported)
    if bpy.context.scene.camera is None:
        add_camera({"translation": [3, 2, 5], "target": [0, 0, 0]}, collection, 99)
    apply_render_settings(settings)
    blend_path = PAYLOAD["blendPath"]
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    summary = {
        "ok": True,
        "objectCount": len(bpy.data.objects),
        "objects": [obj.name for obj in bpy.data.objects],
        "engine": bpy.context.scene.render.engine,
        "resolution": [bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y],
        "samples": int(bpy.context.scene.cycles.samples),
        "missingFiles": missing_files(),
        "blendPath": blend_path,
        "blender": bpy.app.version_string,
    }
    with open(PAYLOAD["summaryPath"], "w", encoding="utf-8") as handle:
        json.dump(summary, handle)
    print(SUMMARY_PREFIX + json.dumps(summary))

if __name__ == "__main__":
    main()
`;
}

function parseSummaryOutput(text) {
    const lines = String(text || '').split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (!line.startsWith(SUMMARY_PREFIX)) continue;
        try {
            const parsed = JSON.parse(line.slice(SUMMARY_PREFIX.length));
            if (!parsed || typeof parsed !== 'object' || typeof parsed.objectCount !== 'number') {
                throw new Error('summary is missing objectCount');
            }
            return parsed;
        } catch (error) {
            throw new Error(`Blender summary was invalid: ${error.message}`);
        }
    }
    return null;
}

function readSummaryFile(summaryPath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || typeof parsed.objectCount !== 'number') {
            throw new Error('summary is missing objectCount');
        }
        return parsed;
    } catch (error) {
        if (error && error.code === 'ENOENT') return null;
        throw error;
    }
}

function formatAuditLine(summary) {
    if (!summary || typeof summary.objectCount !== 'number') return '';
    const missing = Array.isArray(summary.missingFiles) ? summary.missingFiles.length : 0;
    const res = Array.isArray(summary.resolution)
        ? `${summary.resolution[0]}×${summary.resolution[1]}`
        : '';
    const parts = [
        `${summary.objectCount} objects`,
        summary.engine || DEFAULT_ENGINE,
        res,
        missing ? `${missing} missing files` : 'no missing files',
    ].filter(Boolean);
    return parts.join(' · ');
}

module.exports = {
    DEFAULT_RESOLUTION,
    DEFAULT_SAMPLES,
    DEFAULT_ENGINE,
    MIN_BLENDER_MAJOR,
    MIN_BLENDER_MINOR,
    LOCAL_BUILD_TIMEOUT_MS,
    REMOTE_JOB_TIMEOUT_MS,
    SUMMARY_PREFIX,
    RESULT_FILE,
    BLEND_FILE,
    BUILD_SCRIPT,
    OUT_PNG,
    GLB_FILE,
    DEFAULT_SHOT_ID,
    stubScene,
    normalizeSettings,
    missingBinaryMessage,
    discoverBinary,
    defaultBinaryCandidates,
    parseVersionText,
    isSupportedVersion,
    officialLinuxArchive,
    planBuild,
    planRemoteRender,
    buildScriptSource,
    parseSummaryOutput,
    readSummaryFile,
    formatAuditLine,
};
