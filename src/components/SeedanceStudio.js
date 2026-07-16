import { muapi } from '../lib/muapi.js';
import {
    getI2VModelById, getVideoModelById,
    getAspectRatiosForI2VModel, getDurationsForI2VModel, getResolutionsForI2VModel,
    getAspectRatiosForVideoModel, getDurationsForModel, getResolutionsForVideoModel,
} from '../lib/models.js';
import { OMNI_I2V_MODELS, OMNI_T2V_MODELS } from '../lib/phase2Models.js';

const TABS = ['Character Swap', 'Remix', 'Variations', 'Omni Reference'];
const EXTEND_MODEL = 'seedance-2-extend';
const TIER_PREF_KEY = 'seedance_tier';

const SEEDANCE_TIERS = [
    {
        id: 'mini',
        label: 'Mini',
        i2v: 'seedance-2-mini-image-to-video',
        t2v: 'seedance-2-mini-text-to-video',
    },
    {
        id: '2.5',
        label: '2.5',
        i2v: 'seedance-2.5-image-to-video',
        t2v: 'seedance-2.5-text-to-video',
    },
    {
        id: 'vip',
        label: 'VIP',
        i2v: 'seedance-2-vip-image-to-video',
        t2v: 'seedance-2-vip-text-to-video',
    },
];

function getSavedTierId() {
    try {
        const saved = localStorage.getItem(TIER_PREF_KEY);
        if (SEEDANCE_TIERS.some((t) => t.id === saved)) return saved;
    } catch { /* ignore */ }
    return 'mini';
}

function tierById(id) {
    return SEEDANCE_TIERS.find((t) => t.id === id) || SEEDANCE_TIERS[0];
}

function modelControls(modelId, kind) {
    const meta = kind === 'i2v' ? getI2VModelById(modelId) : getVideoModelById(modelId);
    const aspects = kind === 'i2v'
        ? getAspectRatiosForI2VModel(modelId)
        : getAspectRatiosForVideoModel(modelId);
    const durations = (kind === 'i2v'
        ? getDurationsForI2VModel(modelId)
        : getDurationsForModel(modelId)
    ).filter((d) => [5, 8, 10, 15].includes(d));
    const resolutions = kind === 'i2v'
        ? getResolutionsForI2VModel(modelId)
        : getResolutionsForVideoModel(modelId);
    return {
        meta,
        aspects: aspects.length ? aspects : ['16:9', '9:16', '1:1'],
        durations: durations.length ? durations : [5, 10, 15],
        resolutions: resolutions.length ? resolutions : ['720p', '1080p'],
    };
}

const extendMeta = getVideoModelById(EXTEND_MODEL);
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
function buildCharacterSwap(onResult, getTier) {
    const wrap = s('div', { className: 'flex flex-col gap-4' });
    const initial = modelControls(getTier().i2v, 'i2v');

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
    const { wrap: arW, sel: arSel } = labeledSelect('Aspect Ratio', initial.aspects, initial.meta?.inputs?.aspect_ratio?.default || '16:9');
    const { wrap: durW, sel: durSel } = labeledSelect('Duration (s)', initial.durations, 5);
    const { wrap: resW, sel: resSel } = labeledSelect('Resolution', initial.resolutions, initial.meta?.inputs?.resolution?.default || '720p');
    controlRow.appendChild(arW);
    controlRow.appendChild(durW);
    controlRow.appendChild(resW);

    const status = statusBox();
    const btn = generateBtn('🎬 Generate Character Swap');
    const results = s('div', { className: 'flex flex-col gap-4 mt-4' });

    btn.onclick = async () => {
        if (!uploadedUrl) { status.set('Please upload a character reference image first.', true); return; }
        if (!prompt.value.trim()) { status.set('Please enter a scene prompt.', true); return; }
        const tier = getTier();
        const i2vModel = tier.i2v;
        btn.disabled = true;
        status.set(`⏳ Submitting to ${tier.label} I2V…`);
        try {
            let reqId = null;
            const payload = {
                model: i2vModel,
                image_url: uploadedUrl,
                prompt: prompt.value.trim(),
                aspect_ratio: arSel.value,
                duration: parseInt(durSel.value, 10),
                onRequestId: id => {
                    reqId = id;
                    sessionStorage.setItem(SESSION_KEY, id);
                    status.set(`⏳ Generating… request_id: ${id}`);
                }
            };
            if (resSel.options.length) payload.resolution = resSel.value;
            const result = await muapi.generateI2V(payload);
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
function buildVariations(getTier) {
    const wrap = s('div', { className: 'flex flex-col gap-4' });
    const initial = modelControls(getTier().t2v, 't2v');

    const prompt = s('textarea', {
        className: 'w-full bg-input border border-border-color rounded-xl p-3 text-sm resize-none',
        placeholder: 'Describe your scene — all variations share this prompt',
        rows: '3'
    });

    const controlRow = s('div', { className: 'grid grid-cols-4 gap-3' });
    const { wrap: countW, sel: countSel } = labeledSelect('Count', [2, 3, 4], 2);
    const { wrap: arW, sel: arSel } = labeledSelect('Aspect Ratio', initial.aspects, initial.meta?.inputs?.aspect_ratio?.default || '16:9');
    const { wrap: durW, sel: durSel } = labeledSelect('Duration (s)', initial.durations, 5);
    const { wrap: resW, sel: resSel } = labeledSelect('Resolution', initial.resolutions, initial.meta?.inputs?.resolution?.default || '720p');
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
        const tier = getTier();
        btn.disabled = true;
        grid.innerHTML = '';
        status.set(`⏳ Generating ${count} ${tier.label} variations in parallel…`);

        const placeholders = [];
        for (let i = 0; i < count; i++) {
            const ph = s('div', { className: 'rounded-xl border border-border-color bg-card p-6 text-center text-secondary text-sm animate-pulse' }, `Variation ${i + 1}…`);
            grid.appendChild(ph);
            placeholders.push(ph);
        }

        let done = 0;
        const tasks = Array.from({ length: count }, (_, i) => {
            const payload = {
                model: tier.t2v,
                prompt: prompt.value.trim(),
                aspect_ratio: arSel.value,
                duration: parseInt(durSel.value, 10),
            };
            if (resSel.options.length) payload.resolution = resSel.value;
            return muapi.generateVideo(payload).then(result => {
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
            });
        });

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
    let currentTierId = getSavedTierId();
    const getTier = () => tierById(currentTierId);

    const hdr = s('div', { className: 'flex items-center justify-between gap-3 mb-2 flex-wrap' });
    const left = s('div', { className: 'flex items-center gap-3' });
    const icon = s('div', { className: 'w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl' }, '🎬');
    const hdrText = s('div');
    const title = s('h1', { className: 'text-2xl font-bold' }, 'Seedance Studio');
    const sub = s('p', { className: 'text-secondary text-sm' }, 'Swap characters · Remix outputs · Infinite variations');
    hdrText.appendChild(title);
    hdrText.appendChild(sub);
    left.appendChild(icon);
    left.appendChild(hdrText);

    const tierWrap = s('div', { className: 'flex flex-col gap-1' });
    const tierLbl = s('label', { className: 'text-xs text-secondary uppercase tracking-wider' }, 'Model tier');
    const tierRow = s('div', { className: 'flex gap-1 bg-input rounded-lg p-1' });
    const tierBtns = SEEDANCE_TIERS.map((tier) => {
        const btn = s('button', {
            type: 'button',
            className: `px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${tier.id === currentTierId ? 'bg-primary text-black' : 'text-secondary hover:text-primary'}`,
            onclick: () => {
                currentTierId = tier.id;
                try { localStorage.setItem(TIER_PREF_KEY, tier.id); } catch { /* ignore */ }
                tierBtns.forEach((b, j) => {
                    const t = SEEDANCE_TIERS[j];
                    b.className = `px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${t.id === currentTierId ? 'bg-primary text-black' : 'text-secondary hover:text-primary'}`;
                });
            }
        }, tier.label);
        tierRow.appendChild(btn);
        return btn;
    });
    tierWrap.appendChild(tierLbl);
    tierWrap.appendChild(tierRow);
    hdr.appendChild(left);
    hdr.appendChild(tierWrap);
    root.appendChild(hdr);

    const tabBar = s('div', { className: 'flex gap-1 bg-input rounded-xl p-1' });
    let activeTab = 0;
    let remixPanel = null;

    function onCharacterSwapResult(requestId) {
        activateTab(1);
        if (remixPanel) {
            const inp = remixPanel.querySelector('input[type="text"]');
            if (inp) inp.value = requestId;
        }
    }

    const tabPanels = [
        buildCharacterSwap(onCharacterSwapResult, getTier),
        buildRemix(),
        buildVariations(getTier),
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
