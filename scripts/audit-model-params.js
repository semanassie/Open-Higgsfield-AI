#!/usr/bin/env node
/**
 * Compare models.js metadata vs models_dump.json and studio usage.
 * No API calls — static analysis only.
 *
 * Usage: node scripts/audit-model-params.js
 * Output: scripts/test-results/model-params-audit.json
 *         scripts/test-results/model-params-audit.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    t2iModels, t2vModels, i2iModels, i2vModels, v2vModels, lipsyncModels,
    ttsModels, musicModels, sfxModels,
} from '../src/lib/models.js';
import { appCategories } from '../src/lib/appsList.js';
import { validateModelParams, buildApiPayload, validateAudioParams, validateAppParams, buildAppPayload } from '../src/lib/modelRequirements.js';
import { auditVideoFields } from './audit-video-fields.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'test-results');

const CATALOG = {
    t2i: t2iModels,
    t2v: t2vModels,
    i2i: i2iModels,
    i2v: i2vModels,
    v2v: v2vModels,
    lipsync: lipsyncModels,
    tts: ttsModels,
    music: musicModels,
    sfx: sfxModels,
};

/** Hard-coded model IDs referenced in studio/components (static scan). */
const STUDIO_USAGE = {
    SeedanceStudio: [
        'seedance-2-mini-image-to-video',
        'seedance-2-extend',
        'seedance-2-mini-text-to-video',
    ],
    CinemaStudio: ['nano-banana-pro'],
    EditCanvas: ['ai-object-eraser', 'ai-image-extension'],
    AppsGallery: appCategories.flatMap((c) => c.apps.map((a) => a.id)),
};

const dump = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'models_dump.json'), 'utf8'));
const dumpByCat = {};
for (const [cat, arr] of Object.entries(dump)) {
    if (!Array.isArray(arr)) continue;
    dumpByCat[cat] = new Map(arr.map((m) => [m.id, m]));
}

function compareEnums(field, appSpec, dumpSpec) {
    if (!appSpec?.enum || !dumpSpec?.enum) return null;
    const a = [...appSpec.enum].map(String).sort();
    const b = [...dumpSpec.enum].map(String).sort();
    if (a.join('|') === b.join('|')) return null;
    return { field, inModelsJs: appSpec.enum, inDump: dumpSpec.enum };
}

function sampleParams(category, model) {
    const inputs = model.inputs || {};
    const p = { prompt: 'audit test prompt' };
    if (model.requiresRequestId) p.request_id = 'audit-request-id-000';
    if (category === 'i2i' || category === 'i2v') {
        const field = model.imageField || 'image_url';
        if (field === 'images_list') p.images_list = ['https://example.com/img.jpg'];
        else if (field === 'videos_list') p.videos_list = ['https://example.com/v.mp4'];
        else if (field === 'reference_video_url') {
            p.image_url = 'https://example.com/img.jpg';
            p.reference_video_url = 'https://example.com/v.mp4';
        } else if (field === 'last_image' || model.startImageField) {
            p.image_url = 'https://example.com/start.jpg';
            p.last_image = 'https://example.com/end.jpg';
        } else p.image_url = 'https://example.com/img.jpg';
    }
    if (category === 'v2v' || (category === 'lipsync' && model.category === 'video')) {
        if (model.requiresRequestId) {
            // request_id set above
        } else if (model.videoField === 'image_url') {
            p.image_url = p.image_url || 'https://example.com/img.jpg';
        } else {
            p.video_url = 'https://example.com/vid.mp4';
        }
    }
    if (category === 'lipsync') {
        p.audio_url = 'https://example.com/audio.mp3';
        if (model.category !== 'video') p.image_url = p.image_url || 'https://example.com/img.jpg';
    }
    if (inputs.aspect_ratio?.enum) p.aspect_ratio = inputs.aspect_ratio.default || inputs.aspect_ratio.enum[0];
    if (inputs.duration) {
        p.duration = inputs.duration.default ?? inputs.duration.enum?.[0] ?? 5;
    }
    if (inputs.resolution?.enum) p.resolution = inputs.resolution.default || inputs.resolution.enum[0];
    if (inputs.quality?.enum) p.quality = inputs.quality.default || inputs.quality.enum[0];
    if (inputs.mode?.enum) p.mode = inputs.mode.default || inputs.mode.enum[0];
    if (inputs.style?.enum) p.style = inputs.style.default || inputs.style.enum[0];
    if (inputs.width) p.width = inputs.width.default || 1024;
    if (inputs.height) p.height = inputs.height.default || 1024;
    if (inputs.num_images) p.num_images = inputs.num_images.default || 1;
    return p;
}

const report = {
    generatedAt: new Date().toISOString(),
    counts: {},
    missingInDump: [],
    enumMismatches: [],
    missingEndpoint: [],
    emptyInputs: [],
    payloadTests: { pass: 0, fail: [] },
    audioTests: { pass: 0, fail: [] },
    appTests: { pass: 0, fail: [] },
    studioUnknownModels: [],
    studioParamWarnings: [],
    videoFields: null,
};

for (const [cat, models] of Object.entries(CATALOG)) {
    report.counts[cat] = models.length;
    const dumpMap = dumpByCat[cat];

    for (const m of models) {
        const endpoint = m.endpoint || m.id;
        if (!m.endpoint) report.missingEndpoint.push({ category: cat, id: m.id });

        if (['t2i', 't2v', 'i2i', 'i2v'].includes(cat) && (!m.inputs || !Object.keys(m.inputs).length)) {
            report.emptyInputs.push({ category: cat, id: m.id });
        }

        if (dumpMap) {
            const d = dumpMap.get(m.id);
            if (!d) {
                report.missingInDump.push({ category: cat, id: m.id, endpoint });
            } else if (m.inputs) {
                for (const [field, spec] of Object.entries(m.inputs)) {
                    const diff = compareEnums(field, spec, d.inputs?.[field]);
                    if (diff) report.enumMismatches.push({ category: cat, id: m.id, ...diff });
                }
            }
        } else if (cat === 't2i') {
            report.missingInDump.push({ category: cat, id: m.id, endpoint, note: 'dump has no category' });
        }

        if (['t2i', 't2v', 'i2i', 'i2v', 'v2v', 'lipsync'].includes(cat)) {
            try {
                const params = sampleParams(cat, m);
                buildApiPayload(cat, m.id, params);
                report.payloadTests.pass++;
            } catch (e) {
                report.payloadTests.fail.push({ category: cat, id: m.id, error: e.message });
            }
        }
    }
}

// Cross-check studio hard-coded model IDs exist in catalog
const allIds = new Map();
for (const [cat, models] of Object.entries(CATALOG)) {
    for (const m of models) allIds.set(m.id, cat);
}
for (const [studio, ids] of Object.entries(STUDIO_USAGE)) {
    for (const id of ids) {
        if (!allIds.has(id)) {
            report.studioUnknownModels.push({ studio, id, note: 'not in models.js arrays (may be app endpoint)' });
        }
    }
}

// Audio validation
for (const m of ttsModels) {
    try {
        const r = validateAudioParams('tts', m.id, {
            prompt: 'audit test',
            voice_id: m.inputs?.voice_id?.default || m.inputs?.voice_id?.enum?.[0],
        });
        if (!r.valid) throw new Error(r.errors.join('; '));
        report.audioTests.pass++;
    } catch (e) {
        report.audioTests.fail.push({ id: m.id, error: e.message });
    }
}
for (const m of musicModels) {
    try {
        const r = validateAudioParams('music', m.id, { prompt: 'audit test music' });
        if (!r.valid) throw new Error(r.errors.join('; '));
        report.audioTests.pass++;
    } catch (e) {
        report.audioTests.fail.push({ id: m.id, error: e.message });
    }
}

// App validation
for (const cat of appCategories) {
    for (const app of cat.apps) {
        try {
            const sample = {};
            for (const [key, spec] of Object.entries(app.inputs || {})) {
                if (spec.type === 'image' || spec.type === 'video') {
                    if (spec.required) sample[key] = `https://example.com/${key}.test`;
                } else if (spec.type === 'select' && spec.enum) {
                    sample[key] = spec.default || spec.enum[0];
                } else if (spec.required) {
                    sample[key] = key === 'prompt' ? 'audit test' : 'test';
                }
            }
            const r = validateAppParams(app.id, sample);
            if (!r.valid) throw new Error(r.errors.join('; '));
            buildAppPayload(app.id, sample);
            report.appTests.pass++;
        } catch (e) {
            report.appTests.fail.push({ id: app.id, error: e.message });
        }
    }
}

// Detect stale studio param mismatches by scanning component source
const seedanceSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'SeedanceStudio.js'), 'utf8');
for (const id of STUDIO_USAGE.SeedanceStudio) {
    const cat = allIds.get(id);
    if (!cat) continue;
    const model = CATALOG[cat].find((m) => m.id === id);
    if (model?.inputs?.resolution && !model?.inputs?.quality && /quality:\s*/.test(seedanceSrc)) {
        report.studioParamWarnings.push({
            studio: 'SeedanceStudio',
            model: id,
            issue: 'UI sends quality but model schema uses resolution',
        });
    }
}

// Video model imageField / videoField vs MuAPI error responses
report.videoFields = auditVideoFields();

fs.mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = path.join(OUT_DIR, 'model-params-audit.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const md = [
    '# Model Parameters Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Model counts',
    ...Object.entries(report.counts).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    `## Payload build tests: ${report.payloadTests.pass} pass, ${report.payloadTests.fail.length} fail`,
    ...(report.payloadTests.fail.length
        ? report.payloadTests.fail.map((f) => `- \`${f.category}/${f.id}\`: ${f.error}`)
        : ['- (none)']),
    '',
    `## Audio validation: ${report.audioTests.pass} pass, ${report.audioTests.fail.length} fail`,
    ...(report.audioTests.fail.length
        ? report.audioTests.fail.map((f) => `- \`${f.id}\`: ${f.error}`)
        : ['- (none)']),
    '',
    `## App validation: ${report.appTests.pass} pass, ${report.appTests.fail.length} fail`,
    ...(report.appTests.fail.length
        ? report.appTests.fail.map((f) => `- \`${f.id}\`: ${f.error}`)
        : ['- (none)']),
    '',
    `## Missing in models_dump.json: ${report.missingInDump.length}`,
    ...(report.missingInDump.slice(0, 20).map((x) => `- \`${x.category}/${x.id}\` → endpoint \`${x.endpoint}\``)),
    report.missingInDump.length > 20 ? `- … and ${report.missingInDump.length - 20} more` : '',
    '',
    `## Enum mismatches (models.js vs dump): ${report.enumMismatches.length}`,
    ...(report.enumMismatches.slice(0, 10).map((x) => `- \`${x.id}.${x.field}\``)),
    '',
    `## Studio warnings: ${report.studioParamWarnings.length}`,
    ...report.studioParamWarnings.map((w) => `- **${w.studio}** / \`${w.model}\`: ${w.issue}`),
    '',
    `## Studio unknown model IDs: ${report.studioUnknownModels.length}`,
    ...report.studioUnknownModels.map((x) => `- ${x.studio}: \`${x.id}\` (${x.note})`),
    '',
    `## Video field mismatches: ${report.videoFields?.summary?.broken ?? 0} BROKEN`,
    ...(report.videoFields?.broken?.length
        ? report.videoFields.broken.map((r) => `- \`${r.id}\`: meta \`${r.currentField}\` → API \`${r.apiExpects}\` (${r.studio})`)
        : ['- (none)']),
    '',
    'See `video-fields-audit.md` for full I2V/T2V/V2V table.',
].filter(Boolean).join('\n');

const mdPath = path.join(OUT_DIR, 'model-params-audit.md');
fs.writeFileSync(mdPath, md);

console.log(`Audit complete. ${report.payloadTests.pass} payload, ${report.audioTests.pass} audio, ${report.appTests.pass} app tests passed.`);
console.log(`Failures: payload ${report.payloadTests.fail.length}, audio ${report.audioTests.fail.length}, app ${report.appTests.fail.length}`);
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

const totalFail = report.payloadTests.fail.length + report.audioTests.fail.length + report.appTests.fail.length
    + (report.videoFields?.summary?.broken ?? 0);
if (totalFail > 0) process.exit(1);
