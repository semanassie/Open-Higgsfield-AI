/**
 * Character Builder — human-like GUI E2E (Puppeteer)
 *
 * Real clicks + keyboard typing through the character form.
 * MuAPI face/LLM/Omni calls are mocked via request interception.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {
    BASE_URL,
    createRunner,
    findByText,
    screenshot,
} from './helpers/smoke.js';

const GENERATE_TIMEOUT_MS = parseInt(process.env.CHARACTER_GENERATE_TIMEOUT || '45000', 10);
const OMNI_TIMEOUT_MS = parseInt(process.env.CHARACTER_OMNI_TIMEOUT || '15000', 10);

const SAMPLE_IMAGE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grass.jpg';
const MOCK_BACKSTORY = 'Agent Nova is a cybernetic detective from Neo-Tokyo. She hunts rogue AI in rain-soaked streets. Her past remains classified.';
const MOCK_OMNI_ID = 'human-mock-omni-char-42';

const CHARACTER = {
    name: 'Agent Nova',
    genre: 'Sci-Fi',
    era: 'Futuristic',
    archetype: 'Explorer',
    gender: 'Female',
    age: 'early 30s',
    appearance: 'Tall athletic build, sharp jawline, dark brown eyes, short black hair',
    outfit: 'Black leather jacket, white t-shirt, combat boots',
    details: 'Scar across left eyebrow, subtle smile',
};

function readMuapiKeyFromEnv() {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^VITE_MUAPI_KEY=(.*)$/m);
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function isIgnorableConsole(msg) {
    return msg.includes('127.0.0.1:7293')
        || msg.includes('API Key missing')
        || msg.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED');
}

function isFatalConsole(msg) {
    if (isIgnorableConsole(msg)) return false;
    if (/403.*muapi-cdn|muapi-cdn.*403/i.test(msg)) return true;
    if (/403.*cdn\.muapi\.ai|cdn\.muapi\.ai.*403/i.test(msg)) return true;
    if (/HTTP 403/i.test(msg) && /muapi-cdn|cdn\.muapi\.ai/i.test(msg)) return true;
    return false;
}

function attachCharacterHumanErrorCollector(page) {
    const captured = [];
    const fatal = [];

    page.on('pageerror', (e) => {
        captured.push(`pageerror: ${e.message}`);
        if (isFatalConsole(e.message)) fatal.push(e.message);
    });
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        captured.push(`console: ${text}`);
        if (isFatalConsole(text)) fatal.push(text);
    });
    page.on('requestfailed', (req) => {
        const url = req.url();
        const failure = req.failure()?.errorText || 'failed';
        const line = `requestfailed: ${url} (${failure})`;
        captured.push(line);
        if (isFatalConsole(line) || (url.includes('muapi-cdn') && failure.includes('403'))) {
            fatal.push(line);
        }
    });

    return {
        captured: () => [...captured],
        drainFatal: (label, assert) => {
            const batch = fatal.splice(0, fatal.length);
            assert(batch.length === 0, `No fatal CDN/API errors on ${label}${batch.length ? ` (${batch.join(' | ')})` : ''}`);
        },
    };
}

function logStep(n, message) {
    console.log(`\n  👤 Step ${n}: ${message}`);
}

async function clickNavHuman(page, label) {
    const handle = await page.evaluateHandle((label) => {
        return Array.from(document.querySelectorAll('a'))
            .find(a => a.textContent.trim().includes(label)) || null;
    }, label);
    const el = handle.asElement();
    if (!el) throw new Error(`Nav link not found: ${label}`);
    await el.click();
    await new Promise(r => setTimeout(r, 700));
}

async function clickButtonHuman(page, text) {
    const handle = await page.evaluateHandle((text) => {
        return Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes(text)) || null;
    }, text);
    const el = handle.asElement();
    if (!el) throw new Error(`Button not found: ${text}`);
    await el.click();
}

async function setupApiMocks(page) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const url = req.url();
        const method = req.method();

        const mockJson = (body) => {
            req.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(body),
            });
        };

        if ((url.includes('/api/v1/kling-o3-image') || url.includes('/api/v1/flux-pulid')) && method === 'POST') {
            mockJson({ request_id: 'human-mock-face' });
            return;
        }

        if (url.includes('/api/v1/predictions/human-mock-face/result') && method === 'GET') {
            mockJson({ status: 'completed', outputs: [SAMPLE_IMAGE] });
            return;
        }

        if (url.includes('/api/v1/any-llm-models') && method === 'POST') {
            mockJson({ request_id: 'human-mock-llm-char' });
            return;
        }

        if (url.includes('/api/v1/predictions/human-mock-llm-char/result') && method === 'GET') {
            mockJson({ status: 'completed', outputs: [MOCK_BACKSTORY] });
            return;
        }

        if (url.includes('/api/v1/seedance-2-omni-reference-train') && method === 'POST') {
            mockJson({ request_id: 'human-mock-omni' });
            return;
        }

        if (url.includes('/api/v1/predictions/human-mock-omni/result') && method === 'GET') {
            mockJson({ status: 'completed', character_id: MOCK_OMNI_ID, outputs: [MOCK_OMNI_ID] });
            return;
        }

        req.continue();
    });
}

async function waitForBodyText(page, snippet, timeoutMs) {
    try {
        await page.waitForFunction(
            (text) => document.body.innerText.includes(text),
            { timeout: timeoutMs },
            snippet,
        );
        return true;
    } catch {
        return false;
    }
}

async function getLocalCharacterCount(page) {
    return page.evaluate(() => {
        try {
            return JSON.parse(localStorage.getItem('character_library') || '[]').length;
        } catch {
            return 0;
        }
    });
}

async function testCharacterBuilderHumanGui(page, errors, assert) {
    const envKey = readMuapiKeyFromEnv();
    const apiKey = envKey || 'character-builder-human-test-key';
    if (envKey) {
        console.log('  ℹ Using VITE_MUAPI_KEY from .env (MuAPI still mocked via route)');
    } else {
        console.log('  ℹ No .env VITE_MUAPI_KEY — using test key + mocked MuAPI responses');
    }

    await setupApiMocks(page);

    page.on('dialog', async (dialog) => {
        console.log(`  🔔 Dialog: "${dialog.message()}" → accept`);
        await dialog.accept();
    });

    logStep(1, `Open ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate((key) => {
        localStorage.setItem('muapi_key', key);
        localStorage.removeItem('character_library');
    }, apiKey);
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await screenshot(page, 'character-builder-human-01-home');

    logStep(2, 'Click "Character" in header nav');
    await clickNavHuman(page, 'Character');
    errors.drainFatal('Character nav', assert);
    assert(await findByText(page, 'h1', 'Character Builder'), 'Character Builder page loaded');
    await screenshot(page, 'character-builder-human-02-character-page');

    logStep(3, 'Type character name (keyboard)');
    const nameSel = 'input[placeholder="e.g. Agent Nova"]';
    await page.waitForSelector(nameSel, { visible: true });
    await page.click(nameSel, { clickCount: 3 });
    await page.type(nameSel, CHARACTER.name, { delay: 20 });
    const typedName = await page.$eval(nameSel, el => el.value);
    assert(typedName === CHARACTER.name, `Name typed in GUI: "${typedName}"`);

    logStep(4, 'Select genre, era, archetype, gender from dropdowns');
    const selects = await page.$$('select');
    assert(selects.length >= 4, `At least 4 selects found (got ${selects.length})`);
    await selects[0].select(CHARACTER.genre);
    await selects[1].select(CHARACTER.era);
    await selects[2].select(CHARACTER.archetype);
    await selects[3].select(CHARACTER.gender);
    const selectedGenre = await page.$eval('select', el => el.value);
    assert(selectedGenre === CHARACTER.genre, `Genre set to ${CHARACTER.genre} (got ${selectedGenre})`);

    logStep(5, 'Type age, appearance, outfit, and unique details');
    const ageSel = 'input[placeholder="e.g. 30s"]';
    await page.click(ageSel, { clickCount: 3 });
    await page.type(ageSel, CHARACTER.age, { delay: 15 });

    const textareas = await page.$$('textarea');
    assert(textareas.length >= 3, `At least 3 textareas found (got ${textareas.length})`);
    await textareas[0].click({ clickCount: 3 });
    await page.keyboard.type(CHARACTER.appearance, { delay: 10 });
    await textareas[1].click({ clickCount: 3 });
    await page.keyboard.type(CHARACTER.outfit, { delay: 10 });
    await textareas[2].click({ clickCount: 3 });
    await page.keyboard.type(CHARACTER.details, { delay: 10 });

    const appearanceVal = await page.evaluate(() => document.querySelectorAll('textarea')[0]?.value || '');
    assert(appearanceVal.includes('athletic'), `Appearance typed in GUI (${appearanceVal.slice(0, 40)}...)`);
    await screenshot(page, 'character-builder-human-03-form-filled');

    logStep(6, 'Click "Generate Character" (mocked face + LLM)');
    await clickButtonHuman(page, 'Generate Character');
    const generated = await waitForBodyText(page, 'Character saved!', GENERATE_TIMEOUT_MS);
    assert(generated, `Character generated and saved within ${GENERATE_TIMEOUT_MS}ms`);
    assert(await findByText(page, 'p', MOCK_BACKSTORY.slice(0, 30)), 'Backstory visible in result area');
    assert(await findByText(page, 'div', CHARACTER.name), `${CHARACTER.name} visible in saved list`);

    const charCount = await getLocalCharacterCount(page);
    assert(charCount === 1, `localStorage has 1 character (got ${charCount})`);
    errors.drainFatal('generate', assert);
    await screenshot(page, 'character-builder-human-04-generated');

    logStep(7, 'Click "Seedance Omni ID" on saved card');
    await clickButtonHuman(page, 'Seedance Omni ID');
    const omniRegistered = await waitForBodyText(
        page,
        `@omni-character:${MOCK_OMNI_ID}`,
        OMNI_TIMEOUT_MS,
    );
    assert(omniRegistered, `Seedance Omni ID registered (@omni-character:${MOCK_OMNI_ID})`);
    errors.drainFatal('omni register', assert);
    await screenshot(page, 'character-builder-human-05-omni-registered');

    logStep(8, 'Delete character via ✕ button');
    const deleteHandle = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.trim() === '✕') || null;
    });
    const deleteBtn = deleteHandle.asElement();
    assert(!!deleteBtn, 'Delete (✕) button found on character card');
    await deleteBtn.click();
    await new Promise(r => setTimeout(r, 400));

    const afterDelete = await getLocalCharacterCount(page);
    assert(afterDelete === 0, `Character deleted from library (count ${afterDelete})`);
    assert(await findByText(page, 'p', 'No characters yet'), 'Empty state restored after delete');
    await screenshot(page, 'character-builder-human-06-deleted');

    return { outcome: 'success', character: CHARACTER.name };
}

async function run() {
    const { assert, summary } = createRunner('Character Builder — Human GUI E2E');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = attachCharacterHumanErrorCollector(page);

    let result = { outcome: 'unknown' };

    try {
        result = await testCharacterBuilderHumanGui(page, errors, assert);
        errors.drainFatal('final', assert);
    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'character-builder-human-error').catch(() => {});
        assert(false, `Unexpected crash: ${err.message}`);
        result = { outcome: 'crash', error: err.message };
    } finally {
        await browser.close();
    }

    console.log('\n── Evidence ──────────────────────────────────────────────────');
    console.log(`  Outcome: ${result.outcome}`);
    console.log('  Screenshots: tests/screenshots/character-builder-human-*.png');

    const failCount = summary();
    process.exit(failCount > 0 ? 1 : 0);
}

run();
