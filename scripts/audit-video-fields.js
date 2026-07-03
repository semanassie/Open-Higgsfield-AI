#!/usr/bin/env node
/**
 * Audit video model imageField/videoField metadata vs MuAPI error responses.
 * Static analysis — uses deprecated-models.json client errors + buildApiPayload.
 *
 * Usage: node scripts/audit-video-fields.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { i2vModels, t2vModels, v2vModels } from '../src/lib/models.js';
import { buildApiPayload } from '../src/lib/modelRequirements.js';
import { PHASE1_I2V, PHASE1_T2V } from '../src/lib/phase1Models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'test-results');
const DEPRECATED_PATH = path.join(OUT_DIR, 'deprecated-models.json');

const MEDIA_FIELDS = new Set([
    'image_url', 'images_list', 'video_url', 'videos_list',
    'reference_video_url', 'last_image', 'request_id',
    'model_image_url', 'person_image_url',
]);

/** Studio components that reference video models (static map). */
const STUDIO_BY_MODEL = {
    'seedance-2-mini-image-to-video': 'SeedanceStudio, ShortsStudio',
    'seedance-2-mini-text-to-video': 'SeedanceStudio, ShortsStudio, ExplainerStudio',
    'seedance-2-extend': 'SeedanceStudio',
    'seedance-2.5-image-to-video': 'SeedanceStudio',
    'seedance-2.1-image-to-video': 'SeedanceStudio',
    'seedance-2-i2v': 'SeedanceStudio',
    'seedance-2-omni-reference-no-video': 'SeedanceStudio',
    'seedance-2.0-omni-reference': 'SeedanceStudio',
    'seedance-2.0-omni-reference-480p': 'SeedanceStudio',
};

function defaultStudio(category) {
    if (category === 'i2v' || category === 't2v' || category === 'v2v') return 'VideoStudio';
    return '-';
}

function loadApiExpectations() {
    const map = new Map();
    if (!fs.existsSync(DEPRECATED_PATH)) return map;

    const data = JSON.parse(fs.readFileSync(DEPRECATED_PATH, 'utf8'));
    for (const items of Object.values(data.categories || {})) {
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            if (!item.id || !item.body) continue;
            const details = item.body?.detail;
            if (!Array.isArray(details)) continue;
            for (const d of details) {
                if (d.type !== 'missing' || !Array.isArray(d.loc)) continue;
                const field = d.loc[1] === 'body' ? d.loc[2] : d.loc[d.loc.length - 1];
                if (MEDIA_FIELDS.has(field)) {
                    map.set(item.id, { field, status: item.status, testedWith: d.input });
                }
            }
        }
    }
    return map;
}

function sampleI2VParams(model) {
    const field = model.imageField || 'image_url';
    const p = {
        prompt: 'audit test',
        aspect_ratio: model.inputs?.aspect_ratio?.default || '16:9',
        duration: model.inputs?.duration?.default ?? model.inputs?.duration?.enum?.[0] ?? 5,
        resolution: model.inputs?.resolution?.default || '720p',
    };
    if (field === 'images_list') p.images_list = ['https://example.com/img.jpg'];
    else if (field === 'videos_list') p.videos_list = ['https://example.com/v.mp4'];
    else if (field === 'reference_video_url') {
        p.image_url = 'https://example.com/img.jpg';
        p.reference_video_url = 'https://example.com/v.mp4';
    } else if (field === 'last_image' || model.startImageField) {
        p.image_url = 'https://example.com/start.jpg';
        p.last_image = 'https://example.com/end.jpg';
    } else p.image_url = 'https://example.com/img.jpg';
    if (model.inputs?.name) p.name = model.inputs.name.default || model.inputs.name.enum?.[0];
    if (model.inputs?.quality) p.quality = model.inputs.quality.default;
    return p;
}

function sampleV2VParams(model) {
    if (model.requiresRequestId) {
        return { prompt: 'audit', request_id: 'audit-request-id-000' };
    }
    if (model.videoField === 'image_url') {
        return { prompt: 'audit', image_url: 'https://example.com/img.jpg' };
    }
    return { prompt: 'audit', video_url: 'https://example.com/v.mp4' };
}

function payloadMediaField(category, modelId, model) {
    try {
        const params = category === 'i2v'
            ? sampleI2VParams(model)
            : category === 'v2v'
                ? sampleV2VParams(model)
                : { prompt: 'audit', aspect_ratio: '16:9', duration: 5 };
        const payload = buildApiPayload(category, modelId, params);
        if (payload.images_list) return 'images_list';
        if (payload.image_url) return 'image_url';
        if (payload.video_url) return 'video_url';
        if (payload.videos_list) return 'videos_list';
        if (payload.reference_video_url) return 'reference_video_url';
        if (payload.last_image) return 'last_image';
        if (payload.request_id) return 'request_id';
        return Object.keys(payload).find((k) => MEDIA_FIELDS.has(k)) || '(none)';
    } catch (e) {
        return `ERROR: ${e.message}`;
    }
}

function auditCategory(category, models, apiExpects) {
    return models.map((m) => {
        const metaField = category === 'i2v'
            ? (m.imageField || 'image_url')
            : category === 'v2v'
                ? (m.videoField || 'video_url')
                : '-';
        const apiInfo = apiExpects.get(m.id);
        const apiField = apiInfo?.field || '-';
        const payloadField = category === 'i2v' || category === 'v2v'
            ? payloadMediaField(category, m.id, m)
            : '-';

        let status = 'OK';
        if (apiField !== '-' && metaField !== apiField) {
            status = 'BROKEN';
        } else if (apiField === '-' && category === 'i2v' && metaField === 'image_url' && payloadField === 'images_list') {
            status = 'SUSPECT';
        } else if (String(payloadField).startsWith('ERROR')) {
            status = 'PAYLOAD_FAIL';
        } else if (apiField === '-' && category !== 't2v') {
            status = 'UNVERIFIED';
        }

        const inPhase1 = category === 'i2v'
            ? PHASE1_I2V.some((p) => p.id === m.id)
            : category === 't2v'
                ? PHASE1_T2V.some((p) => p.id === m.id)
                : false;

        return {
            id: m.id,
            category,
            currentField: metaField,
            apiExpects: apiField,
            payloadSends: payloadField,
            status,
            inPhase1,
            studio: STUDIO_BY_MODEL[m.id] || defaultStudio(category),
            endpoint: m.endpoint || m.id,
        };
    });
}

function main() {
    const apiExpects = loadApiExpectations();
    const i2vRows = auditCategory('i2v', i2vModels, apiExpects);
    const t2vRows = auditCategory('t2v', t2vModels, apiExpects);
    const v2vRows = auditCategory('v2v', v2vModels, apiExpects);

    const broken = [...i2vRows, ...v2vRows].filter((r) => r.status === 'BROKEN');
    const suspect = i2vRows.filter((r) => r.status === 'SUSPECT');
    const unverified = [...i2vRows, ...v2vRows].filter((r) => r.status === 'UNVERIFIED');

    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            i2v: i2vModels.length,
            t2v: t2vModels.length,
            v2v: v2vModels.length,
            apiTestHints: apiExpects.size,
            broken: broken.length,
            suspect: suspect.length,
            unverified: unverified.length,
        },
        broken,
        suspect,
        i2v: i2vRows,
        t2v: t2vRows,
        v2v: v2vRows,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const jsonPath = path.join(OUT_DIR, 'video-fields-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const mdLines = [
        '# Video Model Fields Audit',
        '',
        `Generated: ${report.generatedAt}`,
        '',
        '## Summary',
        `- I2V: ${report.summary.i2v} | T2V: ${report.summary.t2v} | V2V: ${report.summary.v2v}`,
        `- API test hints: ${report.summary.apiTestHints}`,
        `- **BROKEN**: ${report.summary.broken} | **SUSPECT**: ${report.summary.suspect} | **UNVERIFIED**: ${report.summary.unverified}`,
        '',
        '## BROKEN (metadata ≠ API)',
        ...(broken.length ? broken.map((r) => `| ${r.id} | ${r.currentField} | ${r.apiExpects} | ${r.studio} |`)
            : ['(none)']),
        '',
        '## I2V full table',
        '| Model | imageField | API expects | Payload | Status | Studio |',
        '|-------|------------|-------------|---------|--------|--------|',
        ...i2vRows.map((r) => `| ${r.id} | ${r.currentField} | ${r.apiExpects} | ${r.payloadSends} | ${r.status} | ${r.studio} |`),
    ];
    const mdPath = path.join(OUT_DIR, 'video-fields-audit.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'));

    return report;
}

export { main as auditVideoFields };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const report = main();
    console.log(`Video fields audit: ${report.summary.broken} BROKEN, ${report.summary.suspect} SUSPECT`);
    console.log(`Wrote ${path.join(OUT_DIR, 'video-fields-audit.json')}`);
    console.log(`Wrote ${path.join(OUT_DIR, 'video-fields-audit.md')}`);
    if (report.summary.broken > 0) {
        console.log('\nBROKEN models:');
        for (const r of report.broken) {
            console.log(`  ${r.id}: meta=${r.currentField} api=${r.apiExpects} payload=${r.payloadSends}`);
        }
        process.exit(1);
    }
}
