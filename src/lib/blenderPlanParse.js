// Pure shot.json planning helpers for Blender VFX (no MuAPI, no Electron).

export const STUB_SCENE = Object.freeze({
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
    render: { resolution: [1280, 720] },
});

export const SCENE_SYSTEM_PROMPT = `You plan a simple 3D still for Blender as JSON only.
Return one JSON object, no markdown fences, no prose.
Schema:
{
  "version": 2,
  "nodes": [
    { "type": "mesh", "translation": [x,y,z], "geometry": { "std": "sphere"|"grid", "radius"?: number, "size"?: [w,h] },
      "materials": [{ "inputs": { "base_color": [r,g,b], "specular_roughness"?: number } }] },
    { "type": "light", "shape": "rectangle", "translation": [x,y,z], "target": [x,y,z], "energy": number, "size": number, "color": [r,g,b] },
    { "type": "camera", "translation": [x,y,z], "target": [x,y,z] }
  ],
  "render": { "resolution": [1280, 720] }
}
Rules:
- version must be 2
- include at least one camera and one light
- mesh geometry.std is only "sphere" or "grid"
- optional asset node: { "type": "asset", "file": "model.glb" } only if a glb is clearly needed
- keep the scene small (at most 8 nodes)
- colors are 0..1 RGB`;

export function stubScene() {
    return JSON.parse(JSON.stringify(STUB_SCENE));
}

function assertGlbBasename(file) {
    if (typeof file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.glb$/i.test(file)) {
        throw new Error('glTF file must be a .glb basename');
    }
    return file;
}

function byteLength(encoded) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
        return Buffer.byteLength(encoded);
    }
    return new TextEncoder().encode(encoded).length;
}

export function validateScene(scene) {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
        throw new Error('scene must be a JSON object');
    }
    if (scene.version !== 2) throw new Error('scene.version must be 2');
    if (!Array.isArray(scene.nodes) || scene.nodes.length === 0) {
        throw new Error('scene.nodes must be a non-empty array');
    }
    let hasCamera = false;
    let hasLight = false;
    for (const node of scene.nodes) {
        if (!node || typeof node !== 'object') throw new Error('invalid node');
        if (node.type === 'camera') hasCamera = true;
        if (node.type === 'light') hasLight = true;
        if (node.type === 'asset') assertGlbBasename(node.file);
        if (node.type === 'mesh') {
            const std = node.geometry?.std;
            if (std !== 'sphere' && std !== 'grid') {
                throw new Error('mesh geometry.std must be sphere or grid');
            }
        }
    }
    if (!hasCamera) throw new Error('scene needs a camera');
    if (!hasLight) throw new Error('scene needs a light');
    const encoded = JSON.stringify(scene);
    if (byteLength(encoded) > 512 * 1024) {
        throw new Error('scene JSON is too large');
    }
    return JSON.parse(encoded);
}

export function extractJsonObject(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('empty LLM response');
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : raw;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('no JSON object in LLM response');
    return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Parse LLM text into a valid scene, or return fallback.
 * @returns {{ scene: object, source: 'llm'|'fallback', error?: string }}
 */
export function parseSceneResponse(text, fallback = stubScene()) {
    try {
        const parsed = extractJsonObject(text);
        const scene = validateScene(parsed);
        return { scene, source: 'llm' };
    } catch (error) {
        return {
            scene: fallback && typeof fallback === 'object'
                ? JSON.parse(JSON.stringify(fallback))
                : stubScene(),
            source: 'fallback',
            error: error.message || String(error),
        };
    }
}
