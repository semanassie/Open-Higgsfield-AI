import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const SCREENSHOTS_DIR = path.resolve('tests/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let passed = 0;
let failed = 0;

function assert(condition, description) {
    if (condition) {
        console.log(`  ✓ ${description}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${description}`);
        failed++;
    }
}

async function findByText(page, tag, text) {
    return page.evaluate((tag, text) => {
        const els = Array.from(document.querySelectorAll(tag));
        return !!els.find(el => el.textContent.trim().includes(text));
    }, tag, text);
}

async function clickByText(page, tag, text) {
    await page.evaluate((tag, text) => {
        const els = Array.from(document.querySelectorAll(tag));
        const el = els.find(e => e.textContent.trim().includes(text));
        if (el) el.click();
    }, tag, text);
    await new Promise(r => setTimeout(r, 500));
}

async function screenshot(page, name) {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸 ${file}`);
}

async function getTextContent(page, selector) {
    return page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : '';
    }, selector);
}

async function testImageStudioDefaults(page) {
    console.log('\n── Image Studio (Phase 1 models) ─────────────────────────────');

    await clickByText(page, 'a', 'Image');
    await new Promise(r => setTimeout(r, 600));

    const modelLabel = await getTextContent(page, '#model-btn-label');
    assert(modelLabel.includes('Nano Banana 2 Lite'), `Default T2I model is Nano Banana 2 Lite (got: "${modelLabel}")`);

    await screenshot(page, 'phase1-01-image-studio');
}

async function testVideoStudioDefaults(page) {
    console.log('\n── Video Studio (Phase 1 models) ─────────────────────────────');

    await clickByText(page, 'a', 'Video');
    await new Promise(r => setTimeout(r, 600));

    const modelLabel = await getTextContent(page, '#v-model-btn-label');
    assert(modelLabel.includes('Seedance 2 Mini'), `Default T2V model is Seedance 2 Mini (got: "${modelLabel}")`);

    await screenshot(page, 'phase1-02-video-studio');
}

async function testAppsUtilities(page) {
    console.log('\n── Apps: Utilities category ────────────────────────────────');

    await clickByText(page, 'a', 'Apps');
    await new Promise(r => setTimeout(r, 800));

    assert(await findByText(page, 'h2', 'Utilities'), 'Utilities section heading visible');
    assert(await findByText(page, 'div', 'Watermark Remover'), 'Watermark Remover app card visible');
    assert(await findByText(page, 'div', 'TikTok Carousel'), 'TikTok Carousel app card visible');
    assert(await findByText(page, 'div', 'Combine Videos'), 'Combine Videos app card visible');

    await screenshot(page, 'phase1-03-apps-utilities');
}

async function testViralPresets(page) {
    console.log('\n── Apps: Viral Presets ─────────────────────────────────────');

    assert(await findByText(page, 'h2', 'Viral Presets'), 'Viral Presets section heading visible');
    assert(await findByText(page, 'div', 'Storm Giant'), 'Storm Giant preset card visible');
    assert(await findByText(page, 'div', 'Baseball Game'), 'Baseball Game preset card visible');
    assert(await findByText(page, 'div', 'Drift Racing'), 'Drift Racing preset card visible');

    // Open preset modal
    await clickByText(page, 'button', 'Storm Giant');
    await new Promise(r => setTimeout(r, 400));

    assert(await findByText(page, 'h3', 'Storm Giant'), 'Storm Giant modal opened');
    assert(await findByText(page, 'button', 'Apply Preset'), 'Apply Preset button in modal');

    const hasFileInput = await page.$('input[type="file"]');
    assert(!!hasFileInput, 'Photo upload input in viral preset modal');

    await screenshot(page, 'phase1-04-viral-preset-modal');

    // Close modal
    await page.evaluate(() => {
        const btn = document.getElementById('close-viral-modal');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 300));
}

async function testUtilityAppModal(page) {
    console.log('\n── Apps: Utility modal smoke ───────────────────────────────');

    await clickByText(page, 'button', 'Auto Crop');
    await new Promise(r => setTimeout(r, 400));

    assert(await findByText(page, 'h3', 'Auto Crop'), 'Auto Crop modal opened');
    assert(await findByText(page, 'button', 'Generate'), 'Generate button in utility modal');

    await screenshot(page, 'phase1-05-autocrop-modal');

    await page.evaluate(() => {
        const btn = document.getElementById('close-app-modal');
        if (btn) btn.click();
    });
}

async function run() {
    console.log('🚀 Phase 1 — Puppeteer Smoke Tests');
    console.log(`   Target: ${BASE_URL}`);
    console.log('─'.repeat(60));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('\n── Setup ───────────────────────────────────────────────────');
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 20000 });
        assert(await findByText(page, 'a', 'Apps'), 'Apps nav item exists');

        await testImageStudioDefaults(page);
        await testVideoStudioDefaults(page);
        await testAppsUtilities(page);
        await testViralPresets(page);
        await testUtilityAppModal(page);

    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'phase1-error').catch(() => {});
        failed++;
    } finally {
        await browser.close();
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('✅ All Phase 1 smoke tests passed.');
    } else {
        console.log('❌ Some tests failed.');
    }
    process.exit(failed > 0 ? 1 : 0);
}

run();
