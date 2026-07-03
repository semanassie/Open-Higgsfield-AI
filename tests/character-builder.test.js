/**
 * Character Builder — pragmatic smoke
 *
 * Verifies module load, form UI, saved-character list, and localStorage round-trip
 * without live MuAPI calls (seeded character_library).
 */
import puppeteer from 'puppeteer';
import {
    BASE_URL,
    createRunner,
    attachErrorCollector,
    findByText,
    clickNav,
    screenshot,
    countElements,
} from './helpers/smoke.js';

const SAMPLE_IMAGE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grass.jpg';

const SEEDED_CHARACTER = {
    id: 'char_smoke_test',
    name: 'Smoke Test Hero',
    genre: 'Sci-Fi',
    era: 'Futuristic',
    archetype: 'Hero',
    gender: 'Female',
    age: '30s',
    appearance: 'Silver hair, green eyes, confident expression',
    outfit: 'Tactical jacket and dark jeans',
    details: 'Small neural implant scar on temple',
    referenceImageUrl: SAMPLE_IMAGE,
    backstory: 'A test character seeded for smoke coverage.',
    createdAt: new Date().toISOString(),
};

function isIgnorableConsole(msg) {
    return msg.includes('127.0.0.1:7293')
        || msg.includes('API Key missing')
        || msg.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED');
}

function attachCharacterErrorCollector(page) {
    const captured = [];
    const fatal = [];

    page.on('pageerror', (e) => {
        captured.push(`pageerror: ${e.message}`);
        if (!isIgnorableConsole(e.message)) fatal.push(e.message);
    });
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        captured.push(`console: ${text}`);
        if (!isIgnorableConsole(text) && (/403.*muapi-cdn|muapi-cdn.*403/i.test(text) || /HTTP 403/i.test(text))) {
            fatal.push(text);
        }
    });

    return {
        captured: () => [...captured],
        drain: (label, assert) => {
            const batch = fatal.splice(0, fatal.length);
            assert(batch.length === 0, `No fatal errors on ${label}${batch.length ? ` (${batch.join(' | ')})` : ''}`);
        },
    };
}

async function seedCharacterLibrary(page, characters = []) {
    await page.evaluate((chars) => {
        localStorage.setItem('muapi_key', 'character-builder-smoke-key');
        localStorage.setItem('character_library', JSON.stringify(chars));
    }, characters);
}

async function getSavedCharacterNames(page) {
    return page.evaluate(() => {
        try {
            return JSON.parse(localStorage.getItem('character_library') || '[]').map(c => c.name);
        } catch {
            return [];
        }
    });
}

async function testCharacterBuilderSmoke(page, errors, assert) {
    console.log('\n── Character Builder: UI smoke ───────────────────────────────');

    await seedCharacterLibrary(page, []);
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });

    await clickNav(page, 'Character');
    errors.drain('Character nav', assert);

    assert(await findByText(page, 'h1', 'Character Builder'), 'Character Builder page loaded');
    assert(await findByText(page, 'button', 'Generate Character'), 'Generate Character button visible');
    assert(await findByText(page, 'h3', 'Saved Characters'), 'Saved Characters panel visible');
    assert(await findByText(page, 'p', 'No characters yet'), 'Empty state shown when library is clear');

    const textInputs = await countElements(page, 'input[type="text"]');
    assert(textInputs >= 2, `Name + Age text inputs visible (got ${textInputs})`);

    const textareas = await countElements(page, 'textarea');
    assert(textareas >= 3, `Appearance/outfit/details textareas visible (got ${textareas})`);

    const selects = await countElements(page, 'select');
    assert(selects >= 4, `Genre/era/archetype/gender selects visible (got ${selects})`);

    await screenshot(page, 'character-builder-01-page');

    console.log('\n── Character Builder: seeded library ─────────────────────────');

    await seedCharacterLibrary(page, [SEEDED_CHARACTER]);
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await clickNav(page, 'Character');
    errors.drain('seeded reload', assert);

    assert(await findByText(page, 'div', 'Smoke Test Hero'), 'Seeded character name visible in list');
    assert(await findByText(page, 'div', 'Hero · Sci-Fi · Futuristic'), 'Seeded character metadata visible');

    const names = await getSavedCharacterNames(page);
    assert(names.includes('Smoke Test Hero'), `localStorage character_library contains seeded name (${names.join(', ')})`);

    await screenshot(page, 'character-builder-02-seeded-list');
}

async function run() {
    const { assert, summary } = createRunner('Character Builder — Smoke');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = attachCharacterErrorCollector(page);

    try {
        console.log('\n── Setup ───────────────────────────────────────────────────');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        assert(await findByText(page, 'a', 'Character'), 'Header nav includes Character');

        await testCharacterBuilderSmoke(page, errors, assert);
        errors.drain('final', assert);
    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'character-builder-error').catch(() => {});
        assert(false, `Unexpected crash: ${err.message}`);
    } finally {
        await browser.close();
    }

    const failCount = summary();
    process.exit(failCount > 0 ? 1 : 0);
}

run();
