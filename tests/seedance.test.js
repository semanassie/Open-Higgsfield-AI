import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:5173';
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

async function exists(page, selector) {
    return (await page.$(selector)) !== null;
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
    await new Promise(r => setTimeout(r, 300));
}

async function screenshot(page, name) {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸 ${file}`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function testCharacterSwap(page) {
    console.log('\n── Tab 1: Character Swap ──────────────────────────────────────');

    // Should already be on Character Swap tab after navigation
    assert(await findByText(page, 'button', 'Character Swap'), 'Character Swap tab button exists');
    assert(await findByText(page, 'button', 'Generate Character Swap'), '"Generate Character Swap" button visible');
    assert(await exists(page, 'textarea'), 'Prompt textarea visible');
    assert(await findByText(page, 'p', 'Click to upload character reference image'), 'Upload zone visible');

    // Count select dropdowns (aspect ratio, duration, quality)
    const selectCount = await page.$$eval('select', els => els.length);
    assert(selectCount >= 3, `At least 3 selects rendered (got ${selectCount})`);

    await screenshot(page, 'seedance-01-character-swap');
}

async function testRemix(page) {
    console.log('\n── Tab 2: Remix ───────────────────────────────────────────────');

    await clickByText(page, 'button', 'Remix');

    // Tab label active
    assert(await findByText(page, 'button', 'Remix'), 'Remix tab button exists');

    // Request ID input
    const inputs = await page.$$('input[type="text"]');
    assert(inputs.length >= 1, `Request ID text input visible (found ${inputs.length})`);

    // Placeholder text
    const placeholder = await page.evaluate(() => {
        const inp = document.querySelector('input[type="text"]');
        return inp ? inp.placeholder : '';
    });
    assert(placeholder.includes('auto-filled'), `Request ID placeholder says "auto-filled" (got: "${placeholder}")`);

    assert(await exists(page, 'textarea'), 'Prompt textarea visible');
    assert(await findByText(page, 'button', 'Remix Video'), '"Remix Video" button visible');

    // Duration select
    const selectCount = await page.$$eval('select', els => els.length);
    assert(selectCount >= 1, `At least 1 select rendered (duration — got ${selectCount})`);

    await screenshot(page, 'seedance-02-remix');
}

async function testVariations(page) {
    console.log('\n── Tab 3: Variations ──────────────────────────────────────────');

    await clickByText(page, 'button', 'Variations');

    assert(await findByText(page, 'button', 'Variations'), 'Variations tab button exists');
    assert(await exists(page, 'textarea'), 'Prompt textarea visible');
    assert(await findByText(page, 'button', 'Generate Variations'), '"Generate Variations" button visible');

    // Count + aspect ratio + duration + quality
    const selectCount = await page.$$eval('select', els => els.length);
    assert(selectCount >= 4, `At least 4 selects rendered (count/aspect/duration/quality — got ${selectCount})`);

    // Verify count select has options 2, 3, 4
    const countOptions = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const countSel = selects[0];
        return countSel ? Array.from(countSel.options).map(o => o.value) : [];
    });
    assert(
        countOptions.includes('2') && countOptions.includes('3') && countOptions.includes('4'),
        `Count selector has options 2/3/4 (got: ${countOptions.join(', ')})`
    );

    await screenshot(page, 'seedance-03-variations');
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
    console.log('🚀 Seedance Studio — Puppeteer Smoke Tests');
    console.log(`   Target: ${BASE_URL}`);
    console.log('─'.repeat(60));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 800 });

    try {
        // Navigate to app
        console.log('\n── Setup ───────────────────────────────────────────────────');
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
        assert(await findByText(page, 'a', 'Seedance'), '"Seedance" nav item exists');

        // Navigate to Seedance page
        await clickByText(page, 'a', 'Seedance');
        await new Promise(r => setTimeout(r, 400));

        const hasTitle = await findByText(page, 'h1', 'Seedance 2.0 Studio');
        assert(hasTitle, 'Page title "Seedance 2.0 Studio" rendered');

        // Run tab tests
        await testCharacterSwap(page);
        await testRemix(page);
        await testVariations(page);

    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        failed++;
    } finally {
        await browser.close();
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('✅ All tests passed.');
    } else {
        console.log('❌ Some tests failed.');
    }
    process.exit(failed > 0 ? 1 : 0);
}

run();
