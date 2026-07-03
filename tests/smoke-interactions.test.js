/**
 * Extended UI interaction smoke tests — no Muapi generate/upload/submit calls.
 */
import puppeteer from 'puppeteer';
import { appCategories, viralPresets } from '../src/lib/appsList.js';
import {
    BASE_URL, createRunner, attachErrorCollector,
    findByText, clickNav, screenshot, getTextContent,
    bodyIncludes, openModelDropdown, modelListIncludes,
    closeAppModal, clickByText,
} from './helpers/smoke.js';

const { assert, summary } = createRunner('Open Higgsfield AI — Extended Interaction Smoke (no API)');

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SAMPLE_IMAGE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332332.jpg';

async function setupPage(browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = attachErrorCollector(page);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate((sampleImage, sampleVideo) => {
        localStorage.setItem('muapi_key', 'smoke-test-key-not-used');
        localStorage.setItem('video_history', JSON.stringify([{
            id: 'smoke-seedance-request-id',
            url: sampleVideo,
            model: 'seedance-2-mini-text-to-video',
            prompt: 'smoke test clip',
            aspect_ratio: '16:9',
            duration: 5,
            timestamp: new Date().toISOString(),
        }]));
        localStorage.setItem('muapi_history', JSON.stringify([{
            id: 'smoke-img-1',
            url: sampleImage,
            model: 'nano-banana-2-lite',
            prompt: 'smoke',
            aspect_ratio: '1:1',
            timestamp: new Date().toISOString(),
        }]));
        localStorage.setItem('character_library', JSON.stringify([{
            id: 'smoke-char-1',
            name: 'Smoke Test Agent',
            genre: 'sci-fi',
            appearance: 'silver hair',
            referenceImageUrl: sampleImage,
            createdAt: new Date().toISOString(),
        }]));
        sessionStorage.setItem('seedance_last_request_id', 'smoke-seedance-request-id');
    }, SAMPLE_IMAGE, SAMPLE_VIDEO);
    await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
    return { page, errors };
}

async function testSettingsModal(page, errors) {
    console.log('\n── Settings modal ────────────────────────────────────────────');
    await page.evaluate(() => {
        document.querySelector('header button[title="Update API Key"]')?.click();
    });
    await new Promise(r => setTimeout(r, 400));
    assert(await findByText(page, 'h2', 'API Keys'), 'Settings modal title');
    assert(await page.$('input[placeholder*="Muapi"]'), 'Muapi key input');
    assert(await page.$('input[placeholder*="Kling"]'), 'Kling key input');
    await page.evaluate(() => document.querySelector('.fixed.inset-0')?.click());
    await new Promise(r => setTimeout(r, 200));
    errors.drain('Settings modal', assert);
}

async function testImageInteractions(page, errors) {
    console.log('\n── Image Studio interactions ─────────────────────────────────');
    await clickNav(page, 'Image');
    errors.drain('Image Studio', assert);

    // History sidebar from seeded data
    const histCount = await page.evaluate(() =>
        document.querySelectorAll('[class*="history"] img, .fixed.right-0 img').length
    );
    assert(histCount >= 1 || await bodyIncludes(page, 'History'), 'Image history area present');

    // Aspect ratio picker
    await page.click('#ar-btn');
    await new Promise(r => setTimeout(r, 300));
    assert(await bodyIncludes(page, '16:9') || await bodyIncludes(page, 'Aspect'), 'Aspect ratio dropdown opens');
    await page.keyboard.press('Escape');

    // Model search
    await openModelDropdown(page, 'model-btn');
    await page.type('#model-search', 'klein', { delay: 20 });
    await new Promise(r => setTimeout(r, 300));
    assert(await modelListIncludes(page, 'Klein'), 'Model search filters to Klein');
    await page.keyboard.press('Escape');

    // Upload/reference control visible in prompt area
    const hasUpload = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => /upload|reference/i.test(b.textContent) || /upload|reference/i.test(b.title || ''));
    });
    assert(hasUpload, 'Upload/reference control visible');
}

async function testVideoInteractions(page, errors) {
    console.log('\n── Video Studio interactions ─────────────────────────────────');
    await clickNav(page, 'Video');
    await new Promise(r => setTimeout(r, 800));
    errors.drain('Video Studio', assert);

    // Click history thumbnail → canvas + extend for Seedance
    const clicked = await page.evaluate(() => {
        const thumb = document.querySelector('.fixed.right-0 video, [class*="history"] video');
        if (thumb?.parentElement) { thumb.parentElement.click(); return true; }
        return false;
    });
    assert(clicked, 'Video history thumbnail clickable');
    await new Promise(r => setTimeout(r, 1200));

    const extendVisible = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const ext = btns.find(b => b.textContent.includes('Extend'));
        return ext && !ext.classList.contains('hidden') && ext.offsetParent !== null;
    });
    assert(extendVisible, 'Extend button visible for Seedance history item');

    await clickByText(page, 'button', 'New');
    await new Promise(r => setTimeout(r, 400));

    // V2V models section in dropdown
    await openModelDropdown(page, 'v-model-btn', 'v-model-search');
    await page.type('#v-model-search', 'watermark', { delay: 20 });
    await new Promise(r => setTimeout(r, 300));
    const hasV2vHint = await bodyIncludes(page, 'Upload a video');
    assert(hasV2vHint || await modelListIncludes(page, 'Watermark', 'v-model-list-container'), 'V2V models discoverable in picker');
    await page.keyboard.press('Escape');
}

async function testLipSync(page, errors) {
    console.log('\n── Lip Sync Studio ───────────────────────────────────────────');
    await clickNav(page, 'Lip Sync');
    errors.drain('Lip Sync', assert);

    assert(await findByText(page, 'button', 'Portrait Image'), 'Portrait mode button');
    assert(await findByText(page, 'button', 'Video'), 'Video input mode button');

    await clickByText(page, 'button', 'Video');
    await new Promise(r => setTimeout(r, 400));
    errors.drain('Lip Sync video mode', assert);

    await clickByText(page, 'button', 'Portrait');
    await new Promise(r => setTimeout(r, 300));
    assert(await bodyIncludes(page, 'Portrait'), 'Back to portrait mode');
}

async function testCinemaStudio(page, errors) {
    console.log('\n── Cinema Studio camera overlay ──────────────────────────────');
    await clickNav(page, 'Cinema Studio');
    errors.drain('Cinema Studio', assert);

    assert(await bodyIncludes(page, 'infinite budget'), 'Cinema hero tagline');
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="cursor-pointer"]'));
        const cam = cards.find(c => c.textContent.includes('mm') || c.querySelector('span'));
        (cam || cards[cards.length - 1])?.click();
    });
    await new Promise(r => setTimeout(r, 500));
    assert(await page.$('#close-overlay-btn'), 'Camera controls overlay opened');
    await page.click('#close-overlay-btn');
    await new Promise(r => setTimeout(r, 300));
}

async function testVibeMotion(page, errors) {
    console.log('\n── Vibe Motion ───────────────────────────────────────────────');
    await clickNav(page, 'Vibe Motion');
    errors.drain('Vibe Motion', assert);

    assert(await bodyIncludes(page, 'Motion Style'), 'Motion presets section');
    assert(await bodyIncludes(page, 'Audio Pairing'), 'Audio pairing section');
    assert(await findByText(page, 'button', 'Chill'), 'Chill audio mood option');
    assert(await findByText(page, 'button', 'Upbeat'), 'Upbeat audio mood option');
    assert(await findByText(page, 'button', 'Generate Vibe Motion'), 'Generate button (not clicked)');

    await clickByText(page, 'button', 'Chill');
    await new Promise(r => setTimeout(r, 200));
    await clickByText(page, 'button', 'Cinematic Orbit');
    await new Promise(r => setTimeout(r, 200));
    errors.drain('Vibe Motion preset select', assert);
}

async function testAIInfluencer(page, errors) {
    console.log('\n── AI Influencer ─────────────────────────────────────────────');
    await clickNav(page, 'AI Influencer');
    errors.drain('AI Influencer', assert);

    assert(await bodyIncludes(page, 'Smoke Test Agent'), 'Seeded character visible');
    await clickByText(page, 'button', 'Instagram Reels');
    await new Promise(r => setTimeout(r, 200));
    await clickByText(page, 'button', 'Fashion Look');
    await new Promise(r => setTimeout(r, 200));
    assert(await findByText(page, 'button', 'Generate Content'), 'Generate Content button present');
}

async function testEditCanvasModes(page, errors) {
    console.log('\n── Edit Canvas modes ─────────────────────────────────────────');
    await clickNav(page, 'Edit');
    errors.drain('Edit Canvas', assert);

    await clickByText(page, 'button', 'Erase');
    await new Promise(r => setTimeout(r, 250));
    assert(await bodyIncludes(page, 'Erase Selection'), 'Erase mode active');

    await clickByText(page, 'button', 'Outpaint');
    await new Promise(r => setTimeout(r, 250));
    assert(await bodyIncludes(page, 'Expand Image'), 'Outpaint mode active');

    await clickByText(page, 'button', 'Inpaint');
    await new Promise(r => setTimeout(r, 250));
    assert(await bodyIncludes(page, 'Generate Inpaint'), 'Inpaint mode active');
}

async function testCharacterBuilder(page, errors) {
    console.log('\n── Character Builder form ────────────────────────────────────');
    await clickNav(page, 'Character');
    errors.drain('Character Builder', assert);

    const fields = await page.$$('input');
    assert(fields.length >= 2, `Character form inputs (got ${fields.length})`);
    assert(await bodyIncludes(page, 'Smoke Test Agent'), 'Saved character listed');
}

async function testAssistUI(page, errors) {
    console.log('\n── Assist chat UI ────────────────────────────────────────────');
    await clickNav(page, 'Assist');
    errors.drain('Assist', assert);

    assert(await bodyIncludes(page, 'Suggest a model for cinematic video'), 'Quick prompt chip visible');
    await page.type('input[type="text"]', 'Test prompt only, do not send');
    const val = await page.$eval('input[type="text"]', el => el.value);
    assert(val.includes('Test prompt'), 'Assist input accepts text (not sent)');
}

async function testAllAppModals(page, errors) {
    console.log('\n── All Apps modals (open/close, no Generate) ─────────────────');
    await clickNav(page, 'Apps');
    errors.drain('Apps', assert);

    let opened = 0;
    for (const cat of appCategories) {
        for (const app of cat.apps) {
            await clickByText(page, 'button', app.name);
            await new Promise(r => setTimeout(r, 250));
            const ok = await findByText(page, 'h3', app.name);
            if (ok) opened++;
            await closeAppModal(page);
        }
    }
    const expected = appCategories.reduce((n, c) => n + c.apps.length, 0);
    assert(opened === expected, `Opened all ${expected} app modals (got ${opened})`);
}

async function testViralPresetSample(page) {
    console.log('\n── Viral presets sample modals ───────────────────────────────');
    const sample = viralPresets.filter((_, i) => i % 6 === 0); // 4 presets
    for (const p of sample) {
        await clickByText(page, 'button', p.name);
        await new Promise(r => setTimeout(r, 200));
        assert(await findByText(page, 'h3', p.name), `Preset modal: ${p.name}`);
        await closeAppModal(page);
    }
}

async function testSeedanceSession(page, errors) {
    console.log('\n── Seedance remix session ID ─────────────────────────────────');
    await clickNav(page, 'Seedance');
    await clickByText(page, 'button', 'Remix');
    await new Promise(r => setTimeout(r, 400));
    const reqVal = await page.evaluate(() => document.querySelector('input[type="text"]')?.value || '');
    assert(reqVal === 'smoke-seedance-request-id', `Remix prefilled request ID (got "${reqVal}")`);
    errors.drain('Seedance remix', assert);
}

async function run() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const { page, errors } = await setupPage(browser);

    try {
        console.log('\n── Setup with seeded localStorage ────────────────────────────');
        assert(await findByText(page, 'a', 'Image'), 'App loaded with seed data');

        await testSettingsModal(page, errors);
        await testImageInteractions(page, errors);
        await testVideoInteractions(page, errors);
        await testLipSync(page, errors);
        await testCinemaStudio(page, errors);
        await testVibeMotion(page, errors);
        await testAIInfluencer(page, errors);
        await testEditCanvasModes(page, errors);
        await testCharacterBuilder(page, errors);
        await testAssistUI(page, errors);
        await testAllAppModals(page, errors);
        await testViralPresetSample(page);
        await testSeedanceSession(page, errors);

        await screenshot(page, 'smoke-ext-99-done');

    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'smoke-ext-error').catch(() => {});
        assert(false, `Crash: ${err.message}`);
    } finally {
        await browser.close();
    }

    const failCount = summary();
    process.exit(failCount > 0 ? 1 : 0);
}

run();
