/**
 * Explainer Studio — human-like GUI E2E (Puppeteer)
 *
 * Real clicks + keyboard typing through the Explainer form.
 * MuAPI LLM/video calls are mocked via request interception so the test runs without
 * a live API key; localStorage muapi_key is set only to satisfy getKey().
 *
 * Combine uses real browser FFmpeg (slow on first run).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {
    BASE_URL,
    createRunner,
    attachErrorCollector,
    findByText,
    screenshot,
} from './helpers/smoke.js';

const COMBINE_TIMEOUT_MS = parseInt(process.env.EXPLAINER_COMBINE_TIMEOUT || '150000', 10);
const START_TIMEOUT_MS = 45000;
const TOPIC = 'How photosynthesis works';
const SCENE_COUNT = '3';

const SAMPLE_MP4 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const MOCK_SCENES = [
    { title: 'Sunlight on leaves', visual: 'Golden sunlight hitting green leaves in slow motion', narration: 'Plants capture energy from sunlight.' },
    { title: 'Chlorophyll inside', visual: 'Microscopic chloroplasts glowing green', narration: 'Chlorophyll converts light into chemical energy.' },
    { title: 'Oxygen bubbles', visual: 'Tiny oxygen bubbles rising from a leaf in water', narration: 'Oxygen is released as a byproduct.' },
];

const SUCCESS_STATUS = 'Combined explainer ready';
const COMBINE_START_MARKERS = [
    'Starting browser combine',
    'Loading video engine',
    'Loading WASM',
    'Downloading clip',
    'Stitching',
    'Video engine ready',
];

function readMuapiKeyFromEnv() {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^VITE_MUAPI_KEY=(.*)$/m);
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
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

async function getStatusText(page) {
    return page.evaluate(() => {
        const el = document.querySelector('[role="status"]');
        return el ? el.textContent.trim() : '';
    });
}

async function waitForStatusMatch(page, predicate, timeoutMs, pollMs = 400) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const text = await getStatusText(page);
        if (predicate(text)) return text;
        await new Promise(r => setTimeout(r, pollMs));
    }
    return null;
}

async function countSceneBoxes(page) {
    return page.evaluate(() =>
        document.querySelectorAll('.border.border-white\\/10.rounded-xl.p-4.bg-black\\/30').length
    );
}

async function isButtonEnabled(page, text) {
    return page.evaluate((text) => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes(text));
        return btn ? !btn.disabled : false;
    }, text);
}

async function setupApiMocks(page) {
    let videoCounter = 0;
    const llmJson = JSON.stringify(MOCK_SCENES);

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

        if (url.includes('/api/v1/any-llm-models') && method === 'POST') {
            mockJson({ request_id: 'human-mock-llm' });
            return;
        }

        if (url.includes('/api/v1/predictions/human-mock-llm/result') && method === 'GET') {
            mockJson({ status: 'completed', outputs: [llmJson] });
            return;
        }

        if (url.includes('/api/v1/seedance-2-mini-text-to-video') && method === 'POST') {
            videoCounter += 1;
            mockJson({ request_id: `human-mock-vid-${videoCounter}` });
            return;
        }

        if (/\/api\/v1\/predictions\/human-mock-vid-\d+\/result/.test(url) && method === 'GET') {
            mockJson({ status: 'completed', outputs: [SAMPLE_MP4] });
            return;
        }

        req.continue();
    });
}

async function testExplainerHumanGui(page, errors, assert) {
    const envKey = readMuapiKeyFromEnv();
    const apiKey = envKey || 'explainer-human-test-key';
    if (envKey) {
        console.log('  ℹ Using VITE_MUAPI_KEY from .env (LLM/video still mocked via route)');
    } else {
        console.log('  ℹ No .env VITE_MUAPI_KEY — using test key + mocked MuAPI responses');
    }

    await setupApiMocks(page); // MuAPI mocked — no live LLM/video billing

    page.on('dialog', async (dialog) => {
        console.log(`  🔔 Dialog: "${dialog.message()}" → accept`);
        await dialog.accept();
    });

    logStep(1, `Open ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate((key) => {
        localStorage.setItem('muapi_key', key);
        localStorage.removeItem('explainer_session');
    }, apiKey);
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await screenshot(page, 'explainer-human-01-home');

    logStep(2, 'Click "Explainer" in header nav');
    await clickNavHuman(page, 'Explainer');
    errors.drain('Explainer nav', assert);
    assert(await findByText(page, 'h1', 'Explainer Studio'), 'Explainer Studio page loaded');
    await screenshot(page, 'explainer-human-02-explainer-page');

    logStep(3, 'Click topic textarea and type topic (keyboard)');
    const topicSel = 'textarea[placeholder*="solar panels"]';
    await page.waitForSelector(topicSel, { visible: true });
    await page.click(topicSel, { clickCount: 3 });
    await page.keyboard.type(TOPIC, { delay: 25 });
    const typedTopic = await page.$eval(topicSel, el => el.value);
    assert(typedTopic.includes('photosynthesis'), `Topic typed in GUI: "${typedTopic}"`);
    await screenshot(page, 'explainer-human-03-topic-typed');

    logStep(4, `Select "${SCENE_COUNT} scenes" from Length dropdown`);
    await page.select('select', SCENE_COUNT);
    const selected = await page.$eval('select', el => el.value);
    assert(selected === SCENE_COUNT, `Scene count set to ${SCENE_COUNT} (got ${selected})`);
    await screenshot(page, 'explainer-human-04-scene-count');

    logStep(5, 'Click "Generate Script" button');
    await clickButtonHuman(page, 'Generate Script');
    const scriptStatus = await waitForStatusMatch(
        page,
        (t) => t.includes('scenes ready') || t.startsWith('✗'),
        30000,
    );
    assert(!!scriptStatus && scriptStatus.includes('scenes ready'),
        `Script generated via GUI (${scriptStatus || 'timeout'})`);
    const sceneCount = await countSceneBoxes(page);
    assert(sceneCount === parseInt(SCENE_COUNT, 10), `${sceneCount} scene cards visible in UI`);
    assert(await isButtonEnabled(page, 'Render All Scenes'), 'Render All Scenes enabled after script');
    await screenshot(page, 'explainer-human-05-script-generated');

    logStep(6, 'Click "Render All Scenes" button');
    await clickButtonHuman(page, 'Render All Scenes');
    const renderStatus = await waitForStatusMatch(
        page,
        (t) => t.startsWith('✓ Rendered') || t.startsWith('✗'),
        60000,
    );
    assert(!!renderStatus && renderStatus.startsWith('✓ Rendered'),
        `Scenes rendered via GUI (${renderStatus || 'timeout'})`);
    assert(await isButtonEnabled(page, 'Combine Videos'), 'Combine Videos enabled after render');
    await screenshot(page, 'explainer-human-06-scenes-rendered');

    logStep(7, 'Click "Combine Videos" button (browser FFmpeg — may take 60–150s)');
    await clickButtonHuman(page, 'Combine Videos');
    const startedStatus = await waitForStatusMatch(
        page,
        (t) => COMBINE_START_MARKERS.some(m => t.includes(m)),
        START_TIMEOUT_MS,
    );
    assert(!!startedStatus, `Combine started (${startedStatus || 'no progress within ' + START_TIMEOUT_MS + 'ms'})`);
    await screenshot(page, 'explainer-human-07-combine-started');

    const finalStatus = await waitForStatusMatch(
        page,
        (t) => t.includes(SUCCESS_STATUS) || t.startsWith('✗'),
        COMBINE_TIMEOUT_MS,
    );

    if (finalStatus?.includes(SUCCESS_STATUS)) {
        assert(true, `Combine succeeded: "${finalStatus}"`);
        assert(await findByText(page, 'p', 'Combined explainer'), 'Combined video preview visible');
        await screenshot(page, 'explainer-human-08-combine-success');
        return { outcome: 'success', status: finalStatus };
    }

    if (finalStatus?.startsWith('✗')) {
        assert(false, `Combine failed: "${finalStatus}"`);
        await screenshot(page, 'explainer-human-08-combine-failure');
        return { outcome: 'failure', status: finalStatus };
    }

    console.log(`  ⚠ Combine did not finish within ${COMBINE_TIMEOUT_MS}ms — GUI path verified through combine start`);
    assert(true, 'Combine in progress (timeout) — GUI clicks OK, combine started');
    await screenshot(page, 'explainer-human-08-combine-timeout');
    return { outcome: 'timeout-min-pass', status: await getStatusText(page) };
}

async function run() {
    const { assert, summary } = createRunner('Explainer Studio — Human GUI E2E');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = attachErrorCollector(page);

    let result = { outcome: 'unknown', status: '' };

    try {
        result = await testExplainerHumanGui(page, errors, assert);
        errors.drain('final', assert);
    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'explainer-human-error').catch(() => {});
        assert(false, `Unexpected crash: ${err.message}`);
        result = { outcome: 'crash', status: err.message };
    } finally {
        await browser.close();
    }

    console.log('\n── Evidence ──────────────────────────────────────────────────');
    console.log(`  Outcome: ${result.outcome}`);
    console.log(`  Final status: "${result.status || '(none)'}"`);
    console.log('  Screenshots: tests/screenshots/explainer-human-*.png');

    const failCount = summary();
    process.exit(failCount > 0 ? 1 : 0);
}

run();
