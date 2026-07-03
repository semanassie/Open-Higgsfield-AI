import fs from 'node:fs';
import path from 'node:path';

export const BASE_URL = process.env.TEST_URL || 'http://localhost:3006';
export const SCREENSHOTS_DIR = path.resolve('tests/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

export function createRunner(title) {
    let passed = 0;
    let failed = 0;

    const assert = (condition, description) => {
        if (condition) {
            console.log(`  ✓ ${description}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${description}`);
            failed++;
        }
    };

    const summary = () => {
        console.log('\n' + '─'.repeat(60));
        console.log(`Results: ${passed} passed, ${failed} failed`);
        if (failed === 0) console.log('✅ All smoke tests passed.');
        else console.log('❌ Some smoke tests failed.');
        return failed;
    };

    console.log(`🚀 ${title}`);
    console.log(`   Target: ${BASE_URL}`);
    console.log('─'.repeat(60));

    return { assert, summary, get counts() { return { passed, failed }; } };
}

export function attachErrorCollector(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    return {
        drain: (label, assert) => {
            const batch = errors.splice(0, errors.length);
            const fatal = batch.filter(e => !e.includes('API Key missing'));
            assert(fatal.length === 0, `No JS errors on ${label}${fatal.length ? ` (${fatal.join(' | ')})` : ''}`);
        },
        peek: () => [...errors],
    };
}

export async function findByText(page, tag, text) {
    return page.evaluate((tag, text) => {
        const els = Array.from(document.querySelectorAll(tag));
        return !!els.find(el => el.textContent.trim().includes(text));
    }, tag, text);
}

export async function clickByText(page, tag, text) {
    await page.evaluate((tag, text) => {
        const els = Array.from(document.querySelectorAll(tag));
        const el = els.find(e => e.textContent.trim().includes(text));
        if (el) el.click();
    }, tag, text);
}

export async function clickNav(page, label) {
    await clickByText(page, 'a', label);
    await new Promise(r => setTimeout(r, 700));
}

export async function screenshot(page, name) {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸 ${file}`);
}

export async function getTextContent(page, selector) {
    return page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : '';
    }, selector);
}

export async function countElements(page, selector) {
    return page.$$eval(selector, els => els.length);
}

export async function bodyIncludes(page, text) {
    return page.evaluate(t => document.body.innerText.toUpperCase().includes(t.toUpperCase()), text);
}

export async function openModelDropdown(page, btnId = 'model-btn', searchId = 'model-search') {
    await page.click(`#${btnId}`);
    await new Promise(r => setTimeout(r, 400));
    return page.$('#' + searchId) || page.$('#model-list-container');
}

export async function modelListIncludes(page, name, containerId = 'model-list-container') {
    return page.evaluate((name) => {
        const list = document.getElementById('model-list-container');
        return list ? list.innerText.includes(name) : document.body.innerText.includes(name);
    }, name);
}

export async function closeAppModal(page) {
    await page.evaluate(() => {
        document.getElementById('close-app-modal')?.click();
        document.getElementById('close-viral-modal')?.click();
    });
    await new Promise(r => setTimeout(r, 250));
}
