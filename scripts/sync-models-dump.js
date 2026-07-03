#!/usr/bin/env node
/**
 * Sync models_dump.json with models.js schemas, validated against live MuAPI catalog.
 * Fetches GET https://api.muapi.ai/api/v1/models (no API key required).
 *
 * Usage: node scripts/sync-models-dump.js
 *        npm run sync:models-dump
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    t2iModels, t2vModels, i2iModels, i2vModels,
} from '../src/lib/models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUMP_PATH = path.join(__dirname, '..', 'models_dump.json');
const REPORT_PATH = path.join(__dirname, 'test-results', 'models-dump-sync.json');

const CATEGORIES = [
    { key: 't2i', models: t2iModels },
    { key: 't2v', models: t2vModels },
    { key: 'i2i', models: i2iModels },
    { key: 'i2v', models: i2vModels },
];

function toDumpEntry(model) {
    return {
        id: model.id,
        name: model.name,
        ...(model.endpoint && model.endpoint !== model.id ? { endpoint: model.endpoint } : {}),
        inputs: model.inputs || {},
    };
}

async function fetchCatalog() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch('https://api.muapi.ai/api/v1/models', { signal: controller.signal });
        if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
        const data = await res.json();
        return data.models || [];
    } finally {
        clearTimeout(timer);
    }
}

function catalogNames(catalog) {
    const set = new Set();
    for (const m of catalog) {
        set.add(m.name);
        const ep = (m.endpoint || '').replace(/^\/api\/v1\//, '');
        if (ep) set.add(ep);
    }
    return set;
}

function isInCatalog(model, names) {
    const ep = model.endpoint || model.id;
    return names.has(model.id) || names.has(ep);
}

async function main() {
    console.log('Fetching MuAPI catalog...');
    const catalog = await fetchCatalog();
    const names = catalogNames(catalog);
    console.log(`Catalog: ${catalog.length} endpoints`);

    const existing = fs.existsSync(DUMP_PATH)
        ? JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'))
        : {};

    const dump = { ...existing };
    const report = {
        syncedAt: new Date().toISOString(),
        catalogSize: catalog.length,
        categories: {},
        notInCatalog: [],
    };

    for (const { key, models } of CATEGORIES) {
        dump[key] = models.map(toDumpEntry);
        const missing = models.filter((m) => !isInCatalog(m, names));
        report.categories[key] = { count: models.length, missingInCatalog: missing.length };
        for (const m of missing) {
            report.notInCatalog.push({ category: key, id: m.id, endpoint: m.endpoint || m.id });
        }
        console.log(`  ${key}: ${models.length} models (${missing.length} not in live catalog)`);
    }

    dump._meta = {
        syncedAt: report.syncedAt,
        source: 'models.js + MuAPI catalog validation',
        catalogUrl: 'https://api.muapi.ai/api/v1/models',
    };

    fs.writeFileSync(DUMP_PATH, JSON.stringify(dump, null, 2) + '\n');
    console.log(`Wrote ${DUMP_PATH}`);

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Report: ${REPORT_PATH}`);
}

main().catch((err) => {
    console.error('Sync failed:', err.message);
    process.exit(1);
});
