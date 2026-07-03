import { muapi } from '../lib/muapi.js';
import { i2iModels } from '../lib/models.js';

const EDIT_MODELS = i2iModels.filter(m =>
    m.id.includes('edit') && m.id !== 'ai-object-eraser' && m.id !== 'ai-image-extension'
);

const PREFERRED_ORDER = [
    'seedream-5.0-edit',
    'nano-banana-2-lite-edit',
    'nano-banana-2-edit',
    'flux-2-pro-edit',
    'gpt-image-1.5-edit',
    'bytedance-seedream-v4.5-edit',
    'nano-banana-pro-edit',
    'flux-2-dev-edit',
    'kling-o1-edit-image',
];

function getDefaultEditModel() {
    for (const id of PREFERRED_ORDER) {
        if (EDIT_MODELS.find(m => m.id === id)) return id;
    }
    return EDIT_MODELS[0]?.id || '';
}

const OUTPAINT_DIRS = [
    { id: 'left',   label: '← Left' },
    { id: 'right',  label: 'Right →' },
    { id: 'top',    label: '↑ Top' },
    { id: 'bottom', label: 'Bottom ↓' },
];

export function EditCanvas() {
    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;overflow:hidden;';

    // ─── State ───
    let mode = 'inpaint';
    let selectedModel = getDefaultEditModel();
    let brushSize = 30;
    let isDrawing = false;
    let lastPoint = null;
    let uploadedFile = null;
    let originalImage = null;
    let undoStack = [];
    let redoStack = [];
    let isGenerating = false;
    let outpaintDir = 'right';
    let outpaintAmount = 30;
    let displayW = 0, displayH = 0;

    // ─── Hero ───
    const hero = document.createElement('div');
    hero.style.cssText = 'padding:1.25rem 2rem 0;flex-shrink:0;';
    hero.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:44px;height:44px;border-radius:12px;background:rgba(217,255,0,0.1);border:1px solid rgba(217,255,0,0.2);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">✏️</div>
            <div>
                <h1 style="font-size:1.35rem;font-weight:800;color:white;margin:0;">Edit Canvas</h1>
                <p style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin:0;">Inpaint, erase, or expand — paint a mask and let AI do the rest</p>
            </div>
        </div>`;
    container.appendChild(hero);

    // ─── Mode Tabs ───
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0.25rem;padding:0.75rem 2rem 0;flex-shrink:0;';
    const modesDef = [
        { id: 'inpaint',  label: '🖌️ Inpaint',  desc: 'Replace masked area with prompt' },
        { id: 'erase',    label: '🧹 Erase',     desc: 'Remove objects from masked area' },
        { id: 'outpaint', label: '🔲 Outpaint',   desc: 'Expand image beyond borders' },
    ];

    function renderTabs() {
        tabBar.innerHTML = '';
        modesDef.forEach(m => {
            const tab = document.createElement('button');
            tab.textContent = m.label;
            tab.title = m.desc;
            const active = m.id === mode;
            tab.style.cssText = `padding:0.45rem 1rem;border-radius:10px 10px 0 0;border:1px solid ${active ? 'rgba(217,255,0,0.4)' : 'rgba(255,255,255,0.06)'};border-bottom:none;background:${active ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)'};color:${active ? 'white' : 'rgba(255,255,255,0.5)'};font-size:0.8rem;font-weight:${active ? '700' : '500'};cursor:pointer;`;
            tab.onclick = () => { mode = m.id; renderTabs(); updateControls(); };
            tabBar.appendChild(tab);
        });
    }
    renderTabs();
    container.appendChild(tabBar);

    // ─── Main Layout: Canvas (left) + Controls (right) ───
    const mainLayout = document.createElement('div');
    mainLayout.style.cssText = 'flex:1;display:grid;grid-template-columns:1fr 300px;overflow:hidden;border-top:1px solid rgba(255,255,255,0.06);';
    container.appendChild(mainLayout);

    // ═══════ LEFT: Canvas Area ═══════
    const canvasArea = document.createElement('div');
    canvasArea.style.cssText = 'position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);padding:1rem;';
    mainLayout.appendChild(canvasArea);

    // Upload placeholder
    const uploadPlaceholder = document.createElement('div');
    uploadPlaceholder.style.cssText = 'border:2px dashed rgba(255,255,255,0.1);border-radius:16px;padding:3rem 2rem;text-align:center;cursor:pointer;transition:border-color 0.2s;';
    uploadPlaceholder.onmouseenter = () => { uploadPlaceholder.style.borderColor = 'rgba(217,255,0,0.3)'; };
    uploadPlaceholder.onmouseleave = () => { uploadPlaceholder.style.borderColor = 'rgba(255,255,255,0.1)'; };
    uploadPlaceholder.innerHTML = `
        <div style="font-size:2rem;margin-bottom:0.5rem;">🖼️</div>
        <p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin:0;">Click to upload an image to edit</p>
        <p style="color:rgba(255,255,255,0.25);font-size:0.7rem;margin-top:0.35rem;">PNG, JPG — any resolution</p>`;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    uploadPlaceholder.onclick = () => fileInput.click();
    canvasArea.appendChild(uploadPlaceholder);
    canvasArea.appendChild(fileInput);

    // Canvas wrapper (hidden until image loaded)
    const canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'position:relative;display:none;cursor:crosshair;';
    canvasArea.appendChild(canvasWrap);

    const imgCanvas = document.createElement('canvas');
    imgCanvas.style.cssText = 'display:block;border-radius:8px;';
    canvasWrap.appendChild(imgCanvas);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.style.cssText = 'position:absolute;top:0;left:0;border-radius:8px;';
    canvasWrap.appendChild(maskCanvas);

    const imgCtx = imgCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    // Brush cursor
    const brushCursor = document.createElement('div');
    brushCursor.style.cssText = 'position:absolute;border-radius:50%;border:2px solid rgba(217,255,0,0.7);pointer-events:none;display:none;transform:translate(-50%,-50%);';
    canvasWrap.appendChild(brushCursor);

    // ─── Canvas helpers ───
    function fitCanvasToArea() {
        if (!originalImage) return;
        const areaRect = canvasArea.getBoundingClientRect();
        const maxW = areaRect.width - 32;
        const maxH = areaRect.height - 32;
        const imgW = originalImage.naturalWidth;
        const imgH = originalImage.naturalHeight;
        const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
        displayW = Math.round(imgW * ratio);
        displayH = Math.round(imgH * ratio);

        const dpr = window.devicePixelRatio || 1;

        imgCanvas.width = displayW * dpr;
        imgCanvas.height = displayH * dpr;
        imgCanvas.style.width = displayW + 'px';
        imgCanvas.style.height = displayH + 'px';
        imgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        imgCtx.drawImage(originalImage, 0, 0, displayW, displayH);

        maskCanvas.width = displayW * dpr;
        maskCanvas.height = displayH * dpr;
        maskCanvas.style.width = displayW + 'px';
        maskCanvas.style.height = displayH + 'px';
        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        clearMask();
    }

    function clearMask() {
        maskCtx.clearRect(0, 0, displayW, displayH);
        undoStack = [];
        redoStack = [];
    }

    function saveMaskSnapshot() {
        undoStack.push(maskCanvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift();
        redoStack = [];
    }

    function restoreSnapshot(dataUrl) {
        const img = new Image();
        img.onload = () => {
            maskCtx.clearRect(0, 0, displayW, displayH);
            maskCtx.save();
            maskCtx.setTransform(1, 0, 0, 1, 0, 0);
            maskCtx.drawImage(img, 0, 0);
            maskCtx.restore();
        };
        img.src = dataUrl;
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(maskCanvas.toDataURL());
        restoreSnapshot(undoStack.pop());
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(maskCanvas.toDataURL());
        restoreSnapshot(redoStack.pop());
    }

    // ─── Brush drawing with interpolation ───
    function getCanvasPos(e) {
        const rect = maskCanvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function drawCircle(x, y) {
        maskCtx.globalAlpha = 0.55;
        maskCtx.fillStyle = 'rgba(217, 255, 0, 0.55)';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
        maskCtx.globalAlpha = 1.0;
    }

    function interpolateAndDraw(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(brushSize / 4, 2);
        const steps = Math.ceil(dist / step);
        for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            drawCircle(from.x + dx * t, from.y + dy * t);
        }
    }

    maskCanvas.onmousedown = (e) => {
        if (!originalImage || mode === 'outpaint') return;
        isDrawing = true;
        saveMaskSnapshot();
        const pos = getCanvasPos(e);
        lastPoint = pos;
        drawCircle(pos.x, pos.y);
    };

    maskCanvas.onmousemove = (e) => {
        const pos = getCanvasPos(e);
        brushCursor.style.display = (mode === 'outpaint') ? 'none' : 'block';
        brushCursor.style.left = pos.x + 'px';
        brushCursor.style.top = pos.y + 'px';
        brushCursor.style.width = brushSize + 'px';
        brushCursor.style.height = brushSize + 'px';

        if (!isDrawing || !lastPoint) return;
        interpolateAndDraw(lastPoint, pos);
        lastPoint = pos;
    };

    maskCanvas.onmouseup = () => { isDrawing = false; lastPoint = null; };
    maskCanvas.onmouseleave = () => { isDrawing = false; lastPoint = null; brushCursor.style.display = 'none'; };

    // ─── Mask export: black/white PNG at original resolution ───
    function exportMask() {
        if (!originalImage) return null;
        const w = originalImage.naturalWidth;
        const h = originalImage.naturalHeight;
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const ctx = tmp.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(maskCanvas, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 10) {
                d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
            } else {
                d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return tmp.toDataURL('image/png');
    }

    // ─── File load handler ───
    fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        uploadedFile = file;
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            uploadPlaceholder.style.display = 'none';
            canvasWrap.style.display = 'block';
            fitCanvasToArea();
        };
        img.src = URL.createObjectURL(file);
    };

    new ResizeObserver(() => { if (originalImage) fitCanvasToArea(); }).observe(canvasArea);

    // ═══════ RIGHT: Controls Panel ═══════
    const panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(0,0,0,0.25);border-left:1px solid rgba(255,255,255,0.06);padding:1rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;';
    mainLayout.appendChild(panel);

    function mkLabel(text) {
        const l = document.createElement('h4');
        l.textContent = text;
        l.style.cssText = 'font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.35);margin:0 0 0.35rem 0;';
        return l;
    }

    function mkBtn(text, accent) {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = `flex:1;padding:0.35rem;border-radius:8px;border:1px solid ${accent ? 'rgba(217,255,0,0.4)' : 'rgba(255,255,255,0.1)'};background:${accent ? 'rgba(217,255,0,0.1)' : 'transparent'};color:${accent ? 'var(--color-primary,#d9ff00)' : 'rgba(255,255,255,0.6)'};font-size:0.7rem;cursor:pointer;font-weight:${accent ? '700' : '500'};`;
        return b;
    }

    // ── Brush Size ──
    const brushSec = document.createElement('div');
    brushSec.appendChild(mkLabel('Brush Size'));
    const brushRow = document.createElement('div');
    brushRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
    const brushSlider = document.createElement('input');
    brushSlider.type = 'range'; brushSlider.min = '5'; brushSlider.max = '100'; brushSlider.value = brushSize;
    brushSlider.style.cssText = 'flex:1;accent-color:#d9ff00;';
    const brushVal = document.createElement('span');
    brushVal.textContent = brushSize + 'px';
    brushVal.style.cssText = 'color:rgba(255,255,255,0.6);font-size:0.75rem;min-width:36px;';
    brushSlider.oninput = () => { brushSize = parseInt(brushSlider.value); brushVal.textContent = brushSize + 'px'; };
    brushRow.appendChild(brushSlider); brushRow.appendChild(brushVal);
    brushSec.appendChild(brushRow);
    panel.appendChild(brushSec);

    // ── Mask Actions ──
    const actionSec = document.createElement('div');
    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:0.35rem;';
    const undoBtn = mkBtn('Undo'); undoBtn.onclick = undo;
    const redoBtn = mkBtn('Redo'); redoBtn.onclick = redo;
    const clearBtn = mkBtn('Clear Mask'); clearBtn.onclick = clearMask;
    actionRow.appendChild(undoBtn); actionRow.appendChild(redoBtn); actionRow.appendChild(clearBtn);
    actionSec.appendChild(actionRow);
    panel.appendChild(actionSec);

    // ── Prompt ──
    const promptSec = document.createElement('div');
    promptSec.appendChild(mkLabel('Edit Prompt'));
    const promptInput = document.createElement('textarea');
    promptInput.placeholder = 'e.g. "Place a coffee cup on the table" or "Replace background with a rainy Tokyo street"';
    promptInput.rows = 3;
    promptInput.style.cssText = 'width:100%;padding:0.5rem 0.6rem;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:white;font-size:0.78rem;resize:vertical;outline:none;font-family:inherit;';
    promptSec.appendChild(promptInput);
    panel.appendChild(promptSec);

    // ── Model Selector ──
    const modelSec = document.createElement('div');
    modelSec.appendChild(mkLabel('Edit Model'));
    const modelSelect = document.createElement('select');
    modelSelect.style.cssText = 'width:100%;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.4);color:white;font-size:0.78rem;';
    EDIT_MODELS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id; opt.textContent = m.name;
        if (m.id === selectedModel) opt.selected = true;
        modelSelect.appendChild(opt);
    });
    modelSelect.onchange = () => { selectedModel = modelSelect.value; };
    modelSec.appendChild(modelSelect);
    panel.appendChild(modelSec);

    // ── Outpaint Controls ──
    const outSec = document.createElement('div');
    outSec.appendChild(mkLabel('Expand Direction'));
    const dirGrid = document.createElement('div');
    dirGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0.35rem;';

    function renderDirBtns() {
        dirGrid.innerHTML = '';
        OUTPAINT_DIRS.forEach(d => {
            const btn = document.createElement('button');
            btn.textContent = d.label;
            const active = d.id === outpaintDir;
            btn.style.cssText = `padding:0.4rem;border-radius:8px;border:1px solid ${active ? 'rgba(217,255,0,0.5)' : 'rgba(255,255,255,0.1)'};background:${active ? 'rgba(217,255,0,0.08)' : 'transparent'};color:white;font-size:0.75rem;cursor:pointer;`;
            btn.onclick = () => { outpaintDir = d.id; renderDirBtns(); };
            dirGrid.appendChild(btn);
        });
    }
    renderDirBtns();
    outSec.appendChild(dirGrid);

    const amtLabel = mkLabel('Expand Amount');
    amtLabel.style.marginTop = '0.5rem';
    outSec.appendChild(amtLabel);
    const amtRow = document.createElement('div');
    amtRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
    const amtSlider = document.createElement('input');
    amtSlider.type = 'range'; amtSlider.min = '10'; amtSlider.max = '100'; amtSlider.value = outpaintAmount;
    amtSlider.style.cssText = 'flex:1;accent-color:#d9ff00;';
    const amtVal = document.createElement('span');
    amtVal.textContent = outpaintAmount + '%';
    amtVal.style.cssText = 'color:rgba(255,255,255,0.6);font-size:0.75rem;min-width:36px;';
    amtSlider.oninput = () => { outpaintAmount = parseInt(amtSlider.value); amtVal.textContent = outpaintAmount + '%'; };
    amtRow.appendChild(amtSlider); amtRow.appendChild(amtVal);
    outSec.appendChild(amtRow);

    const opLabel = mkLabel('Outpaint Prompt (optional)');
    opLabel.style.marginTop = '0.5rem';
    outSec.appendChild(opLabel);
    const outPromptInput = document.createElement('textarea');
    outPromptInput.placeholder = 'Describe the extended area...';
    outPromptInput.rows = 2;
    outPromptInput.style.cssText = 'width:100%;padding:0.5rem 0.6rem;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:white;font-size:0.78rem;resize:vertical;outline:none;font-family:inherit;';
    outSec.appendChild(outPromptInput);
    panel.appendChild(outSec);

    // ── Generate Button ──
    const genBtn = document.createElement('button');
    genBtn.textContent = 'Generate Inpaint';
    genBtn.style.cssText = 'width:100%;padding:0.75rem;border-radius:12px;background:var(--color-primary,#d9ff00);color:black;font-weight:800;font-size:0.85rem;border:none;cursor:pointer;margin-top:auto;';
    panel.appendChild(genBtn);

    // ── Result Area ──
    const resultArea = document.createElement('div');
    resultArea.style.cssText = 'display:none;flex-direction:column;gap:0.5rem;align-items:center;';
    panel.appendChild(resultArea);

    // ── Load Different Image ──
    const newImgBtn = document.createElement('button');
    newImgBtn.textContent = '📂 Load Different Image';
    newImgBtn.style.cssText = 'width:100%;padding:0.45rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.5);font-size:0.75rem;cursor:pointer;';
    newImgBtn.onclick = () => fileInput.click();
    panel.appendChild(newImgBtn);

    // ─── Visibility per mode ───
    function updateControls() {
        brushSec.style.display = mode === 'outpaint' ? 'none' : 'block';
        actionSec.style.display = mode === 'outpaint' ? 'none' : 'block';
        promptSec.style.display = mode === 'inpaint' ? 'block' : 'none';
        modelSec.style.display = mode === 'erase' ? 'none' : 'block';
        outSec.style.display = mode === 'outpaint' ? 'block' : 'none';
        canvasWrap.style.cursor = mode === 'outpaint' ? 'default' : 'crosshair';
        genBtn.textContent = mode === 'inpaint' ? 'Generate Inpaint' : mode === 'erase' ? 'Erase Selection' : 'Expand Image';
    }
    updateControls();

    // ─── Keyboard shortcuts ───
    const keyHandler = (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', keyHandler);

    // ─── Generate Logic ───
    genBtn.onclick = async () => {
        if (isGenerating) return;
        if (!originalImage) { alert('Please upload an image first.'); return; }

        isGenerating = true;
        genBtn.style.opacity = '0.6';
        resultArea.style.display = 'none';

        try {
            if (mode === 'inpaint') {
                const prompt = promptInput.value.trim();
                if (!prompt) { alert('Please enter an edit prompt.'); isGenerating = false; genBtn.style.opacity = '1'; return; }
                genBtn.textContent = 'Uploading image...';
                const imageUrl = await muapi.uploadFile(uploadedFile);
                genBtn.textContent = 'Generating edit...';
                const maskDataUrl = exportMask();
                const result = await muapi.generateI2I({
                    model: selectedModel,
                    image_url: imageUrl,
                    images_list: [imageUrl],
                    prompt: prompt,
                    extraPayload: maskDataUrl ? { mask_image: maskDataUrl } : undefined,
                });
                showResult(result);

            } else if (mode === 'erase') {
                genBtn.textContent = 'Uploading image...';
                const imageUrl = await muapi.uploadFile(uploadedFile);
                genBtn.textContent = 'Erasing...';
                const result = await muapi.generateI2I({
                    model: 'ai-object-eraser',
                    image_url: imageUrl,
                });
                showResult(result);

            } else if (mode === 'outpaint') {
                genBtn.textContent = 'Uploading image...';
                const imageUrl = await muapi.uploadFile(uploadedFile);
                genBtn.textContent = 'Expanding image...';

                // Try dedicated extension model first
                let result;
                try {
                    result = await muapi.generateI2I({
                        model: 'ai-image-extension',
                        image_url: imageUrl,
                    });
                } catch {
                    // Fallback: use edit model with prompt
                    const prompt = outPromptInput.value.trim() || 'seamlessly extend this image, maintaining the same style, lighting, and composition';
                    result = await muapi.generateI2I({
                        model: selectedModel,
                        image_url: imageUrl,
                        images_list: [imageUrl],
                        prompt: prompt,
                    });
                }
                showResult(result);
            }
        } catch (err) {
            resultArea.style.display = 'flex';
            resultArea.innerHTML = `<p style="color:rgba(255,100,100,0.8);font-size:0.8rem;text-align:center;">Error: ${err.message}</p>`;
        } finally {
            isGenerating = false;
            genBtn.style.opacity = '1';
            updateControls();
        }
    };

    function showResult(result) {
        resultArea.style.display = 'flex';
        resultArea.innerHTML = '';

        if (!result?.url) {
            resultArea.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;">No result returned</p>';
            return;
        }

        const label = document.createElement('p');
        label.textContent = 'Result';
        label.style.cssText = 'font-size:0.65rem;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,0.3);';
        resultArea.appendChild(label);

        const img = document.createElement('img');
        img.src = result.url;
        img.style.cssText = 'width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.1);';
        resultArea.appendChild(img);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:0.35rem;width:100%;';

        const acceptBtn = mkBtn('✓ Accept', true);
        acceptBtn.onclick = () => {
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.onload = () => {
                originalImage = newImg;
                const tmpC = document.createElement('canvas');
                tmpC.width = newImg.naturalWidth;
                tmpC.height = newImg.naturalHeight;
                tmpC.getContext('2d').drawImage(newImg, 0, 0);
                tmpC.toBlob(blob => {
                    uploadedFile = new File([blob], 'edited.png', { type: 'image/png' });
                }, 'image/png');
                fitCanvasToArea();
                resultArea.style.display = 'none';
            };
            newImg.src = result.url;
        };

        const dlBtn = document.createElement('a');
        dlBtn.href = result.url;
        dlBtn.download = 'edit-result.png';
        dlBtn.textContent = '↓ Download';
        dlBtn.style.cssText = 'flex:1;padding:0.4rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.6);font-size:0.75rem;text-align:center;text-decoration:none;cursor:pointer;';

        btnRow.appendChild(acceptBtn);
        btnRow.appendChild(dlBtn);
        resultArea.appendChild(btnRow);
    }

    return container;
}
