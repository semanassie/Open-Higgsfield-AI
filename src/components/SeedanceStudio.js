import { muapi } from '../lib/muapi.js';
import {
    getI2VModelById, getVideoModelById,
    getAspectRatiosForI2VModel, getDurationsForI2VModel, getResolutionsForI2VModel,
    getAspectRatiosForVideoModel, getDurationsForModel, getResolutionsForVideoModel,
} from '../lib/models.js';
import { OMNI_I2V_MODELS, OMNI_T2V_MODELS } from '../lib/phase2Models.js';

const TABS = ['Character Swap', 'Remix', 'Variations', 'Omni Reference'];
const I2V_MODEL = 'seedance-2-mini-image-to-video';
const T2V_MODEL = 'seedance-2-mini-text-to-video';
const EXTEND_MODEL = 'seedance-2-extend';

const i2vMeta = getI2VModelById(I2V_MODEL);
const t2vMeta = getVideoModelById(T2V_MODEL);
const extendMeta = getVideoModelById(EXTEND_MODEL);

const I2V_ASPECTS = getAspectRatiosForI2VModel(I2V_MODEL);
const I2V_DURATIONS = getDurationsForI2VModel(I2V_MODEL).filter((d) => [5, 10, 15].includes(d));
const I2V_RESOLUTIONS = getResolutionsForI2VModel(I2V_MODEL);

const T2V_ASPECTS = getAspectRatiosForVideoModel(T2V_MODEL);
const T2V_DURATIONS = getDurationsForModel(T2V_MODEL).filter((d) => [5, 10, 15].includes(d));
const T2V_RESOLUTIONS = getResolutionsForVideoModel(T2V_MODEL);

const EXTEND_DURATIONS = getDurationsForModel(EXTEND_MODEL).filter((d) => [5, 10, 15].includes(d));
const SESSION_KEY = 'seedance_last_request_id';

function s(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') el.className = v;
        else if (k === 'style') Object.assign(el.style, v);
        else if (k.startsWith('on')) el[k] = v;
        else el.setAttribute(k, v);
    });
    children.forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
}

function labeledSelect(labelText, options, defaultVal) {
    const wrap = s('div', { className: 'flex flex-col gap-1' });
    const lbl = s('label', { className: 'text-xs text-secondary uppercase tracking-wider' }, labelText);
    const sel = s('select', { className: 'bg-input border border-border-color rounded px-2 py-1 text-sm' });
    options.forEach(o => {
        const opt = s('option', { value: String(o) }, String(o));
        if (String(o) === String(defaultVal)) opt.selected = true;
        sel.appendChild(opt);
    });
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    return { wrap, sel };
}

function videoCard(videoUrl, requestId, onRemix) {
    const card = s('div', { className: 'rounded-xl overflow-hidden border border-border-color bg-card' });
    const vid = s('video', { src: videoUrl, controls: '', className: 'w-full', style: { maxHeight: '320px' } });
    vid.setAttribute('playsinline', '');
    const btns = s('div', { className: 'flex gap-2 p-3' });

    const dl = s('a', { href: videoUrl, download: 'seedance.mp4', className: 'flex-1 text-center py-2 rounded bg-primary text-black text-sm font-medium' }, '⬇ Download');

    const copy = s('button', {
        className: 'flex-1 py-2 rounded border border-border-color text-sm hover:bg-white/5',
        onclick: () => { navigator.clipboard.writeText(requestId); copy.textContent = 'Copied!'; setTimeout(() => { copy.textContent = '📋 Copy ID'; }, 2000); }
    }, '📋 Copy ID');

    if (onRemix) {
        const remix = s('button', {
            className: 'flex-1 py-2 rounded border border-primary text-primary text-sm hover:bg-primary/10',
            onclick: () => onRemix(requestId)
        }, '🔁 Remix');
        btns.appendChild(remix);
    }

    btns.appendChild(dl);
    btns.appendChild(copy);
    card.appendChild(vid);
    card.appendChild(btns);
    return card;
}

function statusBox() {
    const box = s('div', { className: 'text-sm text-secondary mt-2 hidden' });
    return {
        el: box,
        set(msg, isError = false) {
            box.textContent = msg;
            box.className = `text-sm mt-2 ${isError ? 'text-red-400' : 'text-secondary'}`;
            box.classList.remove('hidden');
        },
        hide() { box.classList.add('hidden'); }
    };
}

function generateBtn(label) {
    const btn = s('button', {
        className: 'w-full py-3 rounded-xl bg-primary text-black font-bold text-sm mt-4 disabled:opacity-50'
    }, label);
    return btn;
}

// ── Tab 1: Character Swap ───────────────────────────────────────────────────
function buildCharacterSwap(onResult) {
    const wrap = s('div', { className: 'flex flex-col gap-4' });

    // Upload zone
    let uploadedUrl = null;
    const uploadZone = s('div', {
        className: 'border-2 border-dashed border-border-color rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors',
        onclick: () => fileInput.click()
    });
    const uploadLabel = s('p', { className: 'text-secondary text-sm' }, '🖼 Click to upload character reference image');
    const previewImg = s('img', { className: 'mx-auto mt-2 rounded max-h-40 hidden' });
    uploadZone.appendChild(uploadLabel);
    uploadZone.appendChild(previewImg);

    const fileInput = s('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        uploadLabel.textContent = `⏳ Uploading ${file.name}…`;
        try {
            uploadedUrl = await muapi.uploadFile(file);
            previewImg.src = uploadedUrl;
            previewImg.classList.remove('hidden');
            uploadLabel.textContent = '✓ Image ready';
        } catch (e) {
            uploadLabel.textContent = `✗ Upload failed: ${e.message}`;
        }
    };

    const prompt = s('textarea', {
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm resize-none',
        placeholder: 'Describe the scene — e.g. "Walking confidently through a neon-lit Tokyo street"',
        rows: '3'
    });

    const controlRow = s('div', { className: 'grid grid-cols-3 gap-3' });
    const { wrap: arW, sel: arSel } = labeledSelect('Aspect Ratio', I2V_ASPECTS, i2vMeta?.inputs?.aspect_ratio?.default || '16:9');
    const { wrap: durW, sel: durSel } = labeledSelect('Duration (s)', I2V_DURATIONS.length ? I2V_DURATIONS : [5, 10, 15], 5);
    const { wrap: resW, sel: resSel } = labeledSelect('Resolution', I2V_RESOLUTIONS, i2vMeta?.inputs?.resolution?.default || '720p');
    controlRow.appendChild(arW);
    controlRow.appendChild(durW);
    controlRow.appendChild(resW);

    const status = statusBox();
    const btn = generateBtn('🎬 Generate Character Swap');
    const results = s('div', { className: 'flex flex-col gap-4 mt-4' });

    btn.onclick = async () => {
        if (!uploadedUrl) { status.set('Please upload a character reference image first.', true); return; }
        if (!prompt.value.trim()) { status.set('Please enter a scene prompt.', true); return; }
        btn.disabled = true;
        status.set('⏳ Submitting to Seedance 2.0 I2V…');
        try {
            let reqId = null;
            const result = await muapi.generateI2V({
                model: I2V_MODEL,
                image_url: uploadedUrl,
                prompt: prompt.value.trim(),
                aspect_ratio: arSel.value,
                duration: parseInt(durSel.value, 10),
                resolution: resSel.value,
                onRequestId: id => {
                    reqId = id;
                    sessionStorage.setItem(SESSION_KEY, id);
                    status.set(`⏳ Generating… request_id: ${id}`);
                }
            });
            const url = result.url || result.outputs?.[0];
            if (url) {
                status.set('✓ Done!');
                results.prepend(videoCard(url, reqId, onResult));
            } else {
                status.set('Generation complete but no video URL returned.', true);
            }
        } catch (e) {
            status.set(`✗ ${e.message}`, true);
        } finally {
            btn.disabled = false;
        }
    };

    wrap.appendChild(fileInput);
    wrap.appendChild(uploadZone);
    wrap.appendChild(prompt);
    wrap.appendChild(controlRow);
    wrap.appendChild(status.el);
    wrap.appendChild(btn);
    wrap.appendChild(results);
    return wrap;
}

// ── Tab 2: Remix ────────────────────────────────────────────────────────────
function buildRemix() {
    const wrap = s('div', { className: 'flex flex-col gap-4' });

    const savedId = sessionStorage.getItem(SESSION_KEY) || '';
    const idLabel = s('label', { className: 'text-xs text-secondary uppercase tracking-wider' }, 'Seedance 2.0 Request ID');
    const idInput = s('input', {
        type: 'text',
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm font-mono',
        placeholder: 'auto-filled from last generation, or paste one',
        value: savedId
    });

    const prompt = s('textarea', {
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm resize-none',
        placeholder: 'New direction — e.g. "Same scene but at sunset, slow motion"',
        rows: '3'
    });

    const controlRow = s('div', { className: 'grid grid-cols-2 gap-3' });
    const { wrap: durW, sel: durSel } = labeledSelect('Duration (s)', EXTEND_DURATIONS.length ? EXTEND_DURATIONS : [5, 10, 15], 5);
    controlRow.appendChild(durW);

    const status = statusBox();
    const btn = generateBtn('🔁 Remix Video');
    const results = s('div', { className: 'flex flex-col gap-4 mt-4' });

    btn.onclick = async () => {
        const rid = idInput.value.trim();
        if (!rid) { status.set('Please enter or generate a request ID first.', true); return; }
        btn.disabled = true;
        status.set('⏳ Submitting remix to Seedance 2.0 Extend…');
        try {
            let newReqId = null;
            const result = await muapi.generateVideo({
                model: EXTEND_MODEL,
                request_id: rid,
                prompt: prompt.value.trim() || undefined,
                duration: parseInt(durSel.value, 10),
                onRequestId: id => {
                    newReqId = id;
                    sessionStorage.setItem(SESSION_KEY, id);
                    status.set(`⏳ Remixing… request_id: ${id}`);
                }
            });
            const url = result.url || result.outputs?.[0];
            if (url) {
                status.set('✓ Remix ready!');
                results.prepend(videoCard(url, newReqId || rid, null));
                idInput.value = newReqId || rid;
            } else {
                status.set('Remix complete but no video URL returned.', true);
            }
        } catch (e) {
            status.set(`✗ ${e.message}`, true);
        } finally {
            btn.disabled = false;
        }
    };

    wrap.appendChild(idLabel);
    wrap.appendChild(idInput);
    wrap.appendChild(prompt);
    wrap.appendChild(controlRow);
    wrap.appendChild(status.el);
    wrap.appendChild(btn);
    wrap.appendChild(results);
    return wrap;
}

// ── Tab 3: Variations ───────────────────────────────────────────────────────
function buildVariations() {
    const wrap = s('div', { className: 'flex flex-col gap-4' });

    const prompt = s('textarea', {
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm resize-none',
        placeholder: 'Describe your scene — all variations share this prompt',
        rows: '3'
    });

    const controlRow = s('div', { className: 'grid grid-cols-4 gap-3' });
    const { wrap: countW, sel: countSel } = labeledSelect('Count', [2, 3, 4], 2);
    const { wrap: arW, sel: arSel } = labeledSelect('Aspect Ratio', T2V_ASPECTS, t2vMeta?.inputs?.aspect_ratio?.default || '16:9');
    const { wrap: durW, sel: durSel } = labeledSelect('Duration (s)', T2V_DURATIONS.length ? T2V_DURATIONS : [5, 10, 15], 5);
    const { wrap: resW, sel: resSel } = labeledSelect('Resolution', T2V_RESOLUTIONS, t2vMeta?.inputs?.resolution?.default || '720p');
    controlRow.appendChild(countW);
    controlRow.appendChild(arW);
    controlRow.appendChild(durW);
    controlRow.appendChild(resW);

    const status = statusBox();
    const btn = generateBtn('✨ Generate Variations');
    const grid = s('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4' });

    btn.onclick = async () => {
        if (!prompt.value.trim()) { status.set('Please enter a prompt.', true); return; }
        const count = parseInt(countSel.value);
        btn.disabled = true;
        grid.innerHTML = '';
        status.set(`⏳ Generating ${count} variations in parallel…`);

        const placeholders = [];
        for (let i = 0; i < count; i++) {
            const ph = s('div', { className: 'rounded-xl border border-border-color bg-card p-6 text-center text-secondary text-sm animate-pulse' }, `Variation ${i + 1}…`);
            grid.appendChild(ph);
            placeholders.push(ph);
        }

        let done = 0;
        const tasks = Array.from({ length: count }, (_, i) =>
            muapi.generateVideo({
                model: T2V_MODEL,
                prompt: prompt.value.trim(),
                aspect_ratio: arSel.value,
                duration: parseInt(durSel.value, 10),
                resolution: resSel.value,
            }).then(result => {
                const url = result.url || result.outputs?.[0];
                done++;
                status.set(`⏳ ${done}/${count} done…`);
                if (url) {
                    const card = videoCard(url, result.request_id || '', null);
                    grid.replaceChild(card, placeholders[i]);
                } else {
                    placeholders[i].textContent = `Variation ${i + 1}: no URL returned`;
                }
            }).catch(e => {
                done++;
                placeholders[i].textContent = `Variation ${i + 1} failed: ${e.message}`;
            })
        );

        await Promise.allSettled(tasks);
        status.set(`✓ All ${count} variations complete.`);
        btn.disabled = false;
    };

    wrap.appendChild(prompt);
    wrap.appendChild(controlRow);
    wrap.appendChild(status.el);
    wrap.appendChild(btn);
    wrap.appendChild(grid);
    return wrap;
}

// ── Tab 4: Omni Reference ─────────────────────────────────────────────────────
function buildOmniReference() {
    const OMNI_I2V = OMNI_I2V_MODELS[0];
    const OMNI_T2V = OMNI_T2V_MODELS[0];
    const i2vMeta = getI2VModelById(OMNI_I2V);
    const t2vMeta = getVideoModelById(OMNI_T2V);
    const aspects = getAspectRatiosForI2VModel(OMNI_I2V).length
        ? getAspectRatiosForI2VModel(OMNI_I2V)
        : getAspectRatiosForVideoModel(OMNI_T2V);
    const durations = getDurationsForI2VModel(OMNI_I2V).filter(d => [5, 8, 10, 15].includes(d));
    const resolutions = getResolutionsForI2VModel(OMNI_I2V).length
        ? getResolutionsForI2VModel(OMNI_I2V)
        : getResolutionsForVideoModel(OMNI_T2V);

    const wrap = s('div', { className: 'flex flex-col gap-4' });
    wrap.appendChild(s('p', { className: 'text-secondary text-sm' },
        'Multi-reference video with @omni-character:<id> in prompt. Register characters in Character Builder first.'));

    const refs = [];
    const refGrid = s('div', { className: 'grid grid-cols-2 gap-2' });
    for (let i = 0; i < 4; i++) {
        const slot = s('div', {
            className: 'border border-dashed border-border-color rounded-lg p-4 text-center text-xs text-secondary cursor-pointer hover:border-primary/40',
            onclick: () => inputs[i].click()
        }, `+ Ref ${i + 1}`);
        const img = s('img', { className: 'hidden max-h-24 mx-auto rounded mt-1' });
        slot.appendChild(img);
        refGrid.appendChild(slot);
        refs.push({ slot, img, url: null });
    }
    const inputs = refs.map(() => s('input', { type: 'file', accept: 'image/*', style: { display: 'none' } }));
    inputs.forEach((inp, i) => {
        inp.onchange = async () => {
            const file = inp.files?.[0];
            if (!file) return;
            refs[i].slot.childNodes[0].textContent = '⏳…';
            try {
                refs[i].url = await muapi.uploadFile(file);
                refs[i].img.src = refs[i].url;
                refs[i].img.classList.remove('hidden');
                refs[i].slot.childNodes[0].textContent = `✓ Ref ${i + 1}`;
            } catch (e) {
                refs[i].slot.childNodes[0].textContent = `✗ ${e.message}`;
            }
        };
        wrap.appendChild(inp);
    });
    wrap.appendChild(refGrid);

    const prompt = s('textarea', {
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm resize-none',
        placeholder: '@omni-character:YOUR_ID walks through a neon city at night, cinematic',
        rows: '3'
    });

    const modeRow = s('div', { className: 'flex gap-2' });
    let useI2V = true;
    const i2vBtn = s('button', { className: 'px-3 py-1 rounded-lg text-xs font-bold border border-primary bg-primary/10 text-primary', type: 'button' }, 'Image → Video');
    const t2vBtn = s('button', { className: 'px-3 py-1 rounded-lg text-xs font-bold border border-white/10 text-secondary', type: 'button' }, 'Text → Video');
    i2vBtn.onclick = () => { useI2V = true; i2vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold border border-primary bg-primary/10 text-primary'; t2vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold border border-white/10 text-secondary'; };
    t2vBtn.onclick = () => { useI2V = false; t2vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold border border-primary bg-primary/10 text-primary'; i2vBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold border border-white/10 text-secondary'; };
    modeRow.appendChild(i2vBtn);
    modeRow.appendChild(t2vBtn);

    const controlRow = s('div', { className: 'grid grid-cols-3 gap-3' });
    const { wrap: arW, sel: arSel } = labeledSelect('Aspect', aspects, '16:9');
    const { wrap: durW, sel: durSel } = labeledSelect('Duration', durations.length ? durations : [5, 8], 5);
    const { wrap: resW, sel: resSel } = labeledSelect('Resolution', resolutions, '720p');
    controlRow.appendChild(arW);
    controlRow.appendChild(durW);
    controlRow.appendChild(resW);

    const status = statusBox();
    const btn = generateBtn('🌐 Generate Omni Reference');
    const results = s('div', { className: 'mt-4' });

    btn.onclick = async () => {
        if (!prompt.value.trim()) { status.set('Enter a prompt (use @omni-character:id for trained characters).', true); return; }
        const imageUrls = refs.map(r => r.url).filter(Boolean);
        if (useI2V && !imageUrls.length) { status.set('Upload at least one reference image for I2V mode.', true); return; }

        btn.disabled = true;
        status.set('⏳ Submitting Omni Reference…');
        try {
            let result;
            if (useI2V) {
                result = await muapi.generateI2V({
                    model: OMNI_I2V,
                    image_url: imageUrls[0],
                    images_list: imageUrls.length > 1 ? imageUrls : undefined,
                    prompt: prompt.value.trim(),
                    aspect_ratio: arSel.value,
                    duration: parseInt(durSel.value, 10),
                    resolution: resSel.value,
                });
            } else {
                result = await muapi.generateVideo({
                    model: OMNI_T2V,
                    prompt: prompt.value.trim(),
                    aspect_ratio: arSel.value,
                    duration: parseInt(durSel.value, 10),
                    resolution: resSel.value,
                });
            }
            const url = result.url || result.outputs?.[0];
            if (url) {
                status.set('✓ Done!');
                results.prepend(videoCard(url, result.request_id || '', null));
            } else {
                status.set('No video URL returned.', true);
            }
        } catch (e) {
            status.set(`✗ ${e.message}`, true);
        } finally {
            btn.disabled = false;
        }
    };

    wrap.appendChild(modeRow);
    wrap.appendChild(prompt);
    wrap.appendChild(controlRow);
    wrap.appendChild(status.el);
    wrap.appendChild(btn);
    wrap.appendChild(results);
    return wrap;
}

// ── Main export ─────────────────────────────────────────────────────────────
export function SeedanceStudio() {
    const root = s('div', { className: 'flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full' });

    // Header
    const hdr = s('div', { className: 'flex items-center gap-3 mb-2' });
    const icon = s('div', { className: 'w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl' }, '🎬');
    const hdrText = s('div');
    const title = s('h1', { className: 'text-2xl font-bold' }, 'Seedance 2.0 Studio');
    const sub = s('p', { className: 'text-secondary text-sm' }, 'Swap characters · Remix outputs · Infinite variations');
    hdrText.appendChild(title);
    hdrText.appendChild(sub);
    hdr.appendChild(icon);
    hdr.appendChild(hdrText);
    root.appendChild(hdr);

    // Tabs
    const tabBar = s('div', { className: 'flex gap-1 bg-input rounded-xl p-1' });
    const panels = [];
    let activeTab = 0;

    // Build tab panels
    let remixPanel = null;

    function onCharacterSwapResult(requestId) {
        // Switch to remix tab and populate request_id
        activateTab(1);
        if (remixPanel) {
            const inp = remixPanel.querySelector('input[type="text"]');
            if (inp) inp.value = requestId;
        }
    }

    const tabPanels = [
        buildCharacterSwap(onCharacterSwapResult),
        buildRemix(),
        buildVariations(),
        buildOmniReference(),
    ];
    remixPanel = tabPanels[1];

    const tabBtns = TABS.map((label, i) => {
        const btn = s('button', {
            className: `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${i === 0 ? 'bg-card text-primary' : 'text-secondary hover:text-primary'}`,
            onclick: () => activateTab(i)
        }, label);
        tabBar.appendChild(btn);
        return btn;
    });

    const panelWrap = s('div', { className: 'bg-card rounded-xl border border-border-color p-5' });
    panelWrap.appendChild(tabPanels[0]);

    function activateTab(i) {
        activeTab = i;
        tabBtns.forEach((b, j) => {
            b.className = `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${j === i ? 'bg-card text-primary' : 'text-secondary hover:text-primary'}`;
        });
        panelWrap.innerHTML = '';
        panelWrap.appendChild(tabPanels[i]);
    }

    root.appendChild(tabBar);
    root.appendChild(panelWrap);
    return root;
}
