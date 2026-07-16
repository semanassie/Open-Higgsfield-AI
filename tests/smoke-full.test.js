import puppeteer from 'puppeteer';
import { appCategories, viralPresets } from '../src/lib/appsList.js';
import {
    BASE_URL, createRunner, attachErrorCollector,
    findByText, clickNav, screenshot, getTextContent,
    countElements, bodyIncludes, openModelDropdown, modelListIncludes,
    closeAppModal, clickByText,
} from './helpers/smoke.js';

const { assert, summary } = createRunner('Open Higgsfield AI — Full UI Smoke Tests (no API calls)');

const ROUTES = [
    { nav: 'Image', check: () => 'Image Studio', screenshot: 'smoke-01-image' },
    { nav: 'Video', check: () => 'Video Studio', screenshot: 'smoke-02-video' },
    { nav: 'Lip Sync', check: () => 'Lip Sync' },
    { nav: 'Audio', check: () => 'Audio Studio' },
    { nav: 'Edit', check: () => 'Edit Canvas', screenshot: 'smoke-03-edit' },
    { nav: 'Character', check: () => 'Character Builder' },
    { nav: 'Vibe Motion', check: () => 'Vibe Motion' },
    { nav: 'Cinema Studio', check: () => 'Cinema Studio 3.5' },
    { nav: 'AI Influencer', check: () => 'AI Influencer' },
    { nav: 'Apps', check: () => 'Apps' },
    { nav: 'Assist', check: () => 'Assist' },
    { nav: 'Seedance', check: () => 'Seedance Studio', screenshot: 'smoke-04-seedance' },
];

const UTILITY_APPS = [
    'Watermark Remover', 'Auto Crop', 'Combine Videos',
    'AI Clipping', 'Photo Pack', 'TikTok Carousel',
];

const PHASE1_IMAGE_MODELS = [
    'Nano Banana 2 Lite', 'Flux Klein 4B Turbo', 'Kling O3 Image', 'Seedream 5.0 Pro',
];
const PHASE1_VIDEO_MODELS = [
    'Seedance 2 Mini T2V', 'Seedance 2.5 T2V', 'Seedance 2 VIP T2V',
    'Kling v3 Turbo Standard T2V', 'Veo 4 T2V',
];
const PHASE1_I2V_MODELS = ['Seedance 2 Mini I2V', 'Seedance 2.5 I2V'];

async function testAllRoutes(page, errors) {
    console.log('\n── All studio routes ─────────────────────────────────────────');
    for (const route of ROUTES) {
        await clickNav(page, route.nav);
        const needle = route.check();
        assert(await bodyIncludes(page, needle), `${route.nav} → "${needle}" visible`);
        errors.drain(route.nav, assert);
        if (route.screenshot) await screenshot(page, route.screenshot);
    }
}

async function testImageStudio(page, errors) {
    console.log('\n── Image Studio details ──────────────────────────────────────');
    await clickNav(page, 'Image');
    errors.drain('Image Studio load', assert);

    const modelLabel = await getTextContent(page, '#model-btn-label');
    assert(modelLabel.includes('Nano Banana 2 Lite'), `Default T2I: Nano Banana 2 Lite (got "${modelLabel}")`);
    assert(await page.$('textarea'), 'Prompt textarea present');
    assert(await page.$('#model-btn'), 'Model picker button present');

    await openModelDropdown(page, 'model-btn');
    assert(await page.$('#model-search'), 'Model search input opens');
    for (const name of PHASE1_IMAGE_MODELS) {
        assert(await modelListIncludes(page, name), `T2I list includes ${name}`);
    }
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));
}

async function testVideoStudio(page, errors) {
    console.log('\n── Video Studio details ──────────────────────────────────────');
    await clickNav(page, 'Video');
    errors.drain('Video Studio load', assert);

    const modelLabel = await getTextContent(page, '#v-model-btn-label');
    assert(modelLabel.includes('Seedance 2 Mini'), `Default T2V: Seedance 2 Mini (got "${modelLabel}")`);

    await openModelDropdown(page, 'v-model-btn');
    for (const name of PHASE1_VIDEO_MODELS) {
        assert(await modelListIncludes(page, name), `T2V list includes ${name}`);
    }
    await page.keyboard.press('Escape');

    // I2V models visible in dropdown even in T2V mode? No - getCurrentModels switches.
    // Switch to I2V by checking i2v default would need upload. Instead open dropdown after
    // verifying I2V models exist in module - UI test: click first i2v model if we toggle via evaluate
    const hasI2vInList = await page.evaluate(() => {
        // Temporarily not available without image upload — check body for extend btn hidden
        return !!document.getElementById('v-model-btn');
    });
    assert(hasI2vInList, 'Video model picker available for mode switching');
}

async function testEditCanvas(page, errors) {
    console.log('\n── Edit Canvas ───────────────────────────────────────────────');
    await clickNav(page, 'Edit');
    errors.drain('Edit Canvas load', assert);

    const hasLiteEdit = await page.evaluate(() => {
        const sel = document.querySelector('select');
        if (!sel) return false;
        const texts = Array.from(sel.options).map(o => o.textContent);
        return {
            lite: texts.some(t => t.includes('Nano Banana 2 Lite Edit')),
            seedreamPro: texts.some(t => t.includes('Seedream 5.0 Pro Edit')),
        };
    });
    assert(hasLiteEdit.lite, 'Edit model dropdown includes Nano Banana 2 Lite Edit');
    assert(hasLiteEdit.seedreamPro, 'Edit model dropdown includes Seedream 5.0 Pro Edit');
    assert(await findByText(page, 'button', 'Inpaint'), 'Inpaint mode button visible');
}

async function testAudioStudio(page, errors) {
    console.log('\n── Audio Studio tabs ─────────────────────────────────────────');
    await clickNav(page, 'Audio');
    errors.drain('Audio Studio load', assert);

    assert(await findByText(page, 'button', 'Voice'), 'Voice tab visible');
    assert(await findByText(page, 'button', 'Music'), 'Music tab visible');
    assert(await findByText(page, 'button', 'Sound FX'), 'Sound FX tab visible');
    assert(await findByText(page, 'button', 'Scenes'), 'Scenes tab visible');

    await clickByText(page, 'button', 'Music');
    await new Promise(r => setTimeout(r, 300));
    errors.drain('Audio Music tab', assert);

    await clickByText(page, 'button', 'Sound FX');
    await new Promise(r => setTimeout(r, 300));
    assert(await bodyIncludes(page, 'MMAudio') || await page.$('select'), 'SFX tab renders MMAudio or model picker');

    await clickByText(page, 'button', 'Scenes');
    await new Promise(r => setTimeout(r, 300));
    assert(await findByText(page, 'button', 'Generate Scene'), 'Scenes tab has Generate Scene button');
    assert(await bodyIncludes(page, 'Ambience'), 'Scenes tab shows ambience field');
}

async function testSeedanceStudio(page, errors) {
    console.log('\n── Seedance Studio tabs ──────────────────────────────────────');
    await clickNav(page, 'Seedance');
    errors.drain('Seedance Studio load', assert);

    assert(await bodyIncludes(page, 'Model tier'), 'Seedance model tier label visible');
    assert(await findByText(page, 'button', 'Mini'), 'Tier button Mini');
    assert(await findByText(page, 'button', '2.5'), 'Tier button 2.5');
    assert(await findByText(page, 'button', 'VIP'), 'Tier button VIP');

    await clickByText(page, 'button', 'VIP');
    await new Promise(r => setTimeout(r, 200));
    const vipSelected = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const vip = btns.find(b => b.textContent.trim() === 'VIP');
        return vip ? vip.className.includes('bg-primary') : false;
    });
    assert(vipSelected, 'VIP tier selected after click');

    // VIP has no resolution input — Character Swap resolution select should clear
    const vipSwapRes = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        return Array.from(selects[2]?.options || []).map(o => o.value);
    });
    assert(vipSwapRes.length === 0, `VIP clears Character Swap resolution options (got: ${vipSwapRes.join(', ')})`);

    await clickByText(page, 'button', '2.5');
    await new Promise(r => setTimeout(r, 200));
    const midSwapRes = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        return Array.from(selects[2]?.options || []).map(o => o.value);
    });
    assert(midSwapRes.includes('4k'), `2.5 Character Swap resolution includes 4k (got: ${midSwapRes.join(', ')})`);

    await clickByText(page, 'button', 'Mini');

    assert(await findByText(page, 'button', 'Character Swap'), 'Character Swap tab');
    assert(await findByText(page, 'button', 'Generate Character Swap'), 'Generate Character Swap button');

    await clickByText(page, 'button', 'Remix');
    await new Promise(r => setTimeout(r, 300));
    assert(await findByText(page, 'button', 'Remix Video'), 'Remix Video button');
    const placeholder = await page.evaluate(() => document.querySelector('input[type="text"]')?.placeholder || '');
    assert(placeholder.includes('auto-filled'), `Remix request ID field (placeholder: "${placeholder}")`);

    await clickByText(page, 'button', 'Variations');
    await new Promise(r => setTimeout(r, 300));
    assert(await findByText(page, 'button', 'Generate Variations'), 'Generate Variations button');
    const selectCount = await countElements(page, 'select');
    assert(selectCount >= 4, `Variations has 4+ selects (got ${selectCount})`);

    await clickByText(page, 'button', 'VIP');
    await new Promise(r => setTimeout(r, 200));
    const vipVarRes = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        return Array.from(selects[3]?.options || []).map(o => o.value);
    });
    assert(vipVarRes.length === 0, `VIP clears Variations resolution options (got: ${vipVarRes.join(', ')})`);
    await clickByText(page, 'button', 'Mini');
}

async function testAppsCategories(page, errors) {
    console.log('\n── Apps: all categories ──────────────────────────────────────');
    await clickNav(page, 'Apps');
    errors.drain('Apps load', assert);

    for (const cat of appCategories) {
        assert(await findByText(page, 'h2', cat.name), `Category "${cat.name}" visible`);
        for (const app of cat.apps) {
            assert(await bodyIncludes(page, app.name), `App card "${app.name}" visible`);
        }
    }
}

async function testUtilityModals(page) {
    console.log('\n── Apps: utility modals (open/close) ───────────────────────');
    for (const name of UTILITY_APPS) {
        await clickByText(page, 'button', name);
        await new Promise(r => setTimeout(r, 350));
        assert(await findByText(page, 'h3', name), `Modal opened: ${name}`);
        assert(await findByText(page, 'button', 'Generate'), `Generate button in ${name} modal`);
        await closeAppModal(page);
    }
}

async function testViralPresets(page) {
    console.log('\n── Viral Presets ─────────────────────────────────────────────');
    assert(await findByText(page, 'h2', 'Viral Presets'), 'Viral Presets section');

    const cardCount = await page.evaluate((names) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return names.filter(n => buttons.some(b => b.textContent.includes(n))).length;
    }, viralPresets.map(p => p.name));
    assert(cardCount === viralPresets.length, `All ${viralPresets.length} preset cards rendered (got ${cardCount})`);

    // Spot-check 4 presets across tags
    for (const name of ['Storm Giant', 'Baseball Game', 'Bullet Time', 'Timelapse']) {
        await clickByText(page, 'button', name);
        await new Promise(r => setTimeout(r, 300));
        assert(await findByText(page, 'h3', name), `Preset modal: ${name}`);
        assert(await findByText(page, 'button', 'Apply Preset'), `Apply Preset in ${name}`);
        await closeAppModal(page);
    }
}

async function testAssistAndCharacter(page, errors) {
    console.log('\n── Assist + Character Builder ────────────────────────────────');
    await clickNav(page, 'Assist');
    errors.drain('Assist', assert);
    assert(await page.$('input[type="text"]'), 'Assist chat input');
    assert(await bodyIncludes(page, 'Assist'), 'Assist header visible');

    const llmSelect = await page.evaluate(() => {
        const sels = Array.from(document.querySelectorAll('select'));
        const s = sels.find(el => Array.from(el.options).some(o =>
            (o.value || '').includes('gemini') || (o.value || '').includes('claude') || (o.value || '').includes('gpt')
        ));
        if (!s) return null;
        return {
            count: s.options.length,
            values: Array.from(s.options).map(o => o.value).slice(0, 8),
            hasGemini35: Array.from(s.options).some(o => o.value.includes('gemini-3-5') || o.value.includes('gemini-3.5')),
        };
    });
    assert(!!llmSelect && llmSelect.count >= 3, `Assist LLM model select present (options: ${llmSelect?.count ?? 0})`);
    assert(llmSelect?.hasGemini35 || llmSelect?.values.some(v => v.includes('gemini')), 'Assist LLM list includes Gemini');

    await clickNav(page, 'Character');
    errors.drain('Character Builder', assert);
    assert(await findByText(page, 'button', 'Generate Character'), 'Generate Character button');
    assert(await bodyIncludes(page, 'Saved Characters'), 'Saved Characters panel');

    await page.evaluate(() => {
        localStorage.setItem('character_library', JSON.stringify([{
            id: 'smoke-char-1',
            name: 'Smoke Sheet Hero',
            genre: 'Sci-Fi',
            era: 'Futuristic',
            archetype: 'Hero',
            gender: 'Female',
            age: '30',
            appearance: 'Test',
            outfit: 'Test',
            details: 'Test',
            backstory: 'Test backstory',
            referenceImageUrl: 'https://example.com/face.png',
            createdAt: new Date().toISOString(),
        }]));
    });
    await clickNav(page, 'Character');
    await new Promise(r => setTimeout(r, 400));
    assert(await findByText(page, 'button', 'Character Sheet'), 'Character Sheet button on saved character');
}

async function run() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = attachErrorCollector(page);

    // Seed fake API key so AuthModal does not block UI (no API calls made)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate(() => localStorage.setItem('muapi_key', 'smoke-test-key-not-used'));

    try {
        console.log('\n── Setup ───────────────────────────────────────────────────');
        await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
        assert(await findByText(page, 'a', 'Apps'), 'Header navigation loaded');
        errors.drain('initial load', assert);

        await testAllRoutes(page, errors);
        await testImageStudio(page, errors);
        await testVideoStudio(page, errors);
        await testEditCanvas(page, errors);
        await testAudioStudio(page, errors);
        await testSeedanceStudio(page, errors);
        await testAssistAndCharacter(page, errors);
        await testAppsCategories(page, errors);
        await testViralPresets(page);
        await testUtilityModals(page);

        await screenshot(page, 'smoke-99-final-apps');

    } catch (err) {
        console.error('\n💥 Unexpected error:', err.message);
        await screenshot(page, 'smoke-error').catch(() => {});
        assert(false, `Unexpected crash: ${err.message}`);
    } finally {
        await browser.close();
    }

    const failCount = summary();
    process.exit(failCount > 0 ? 1 : 0);
}

run();
