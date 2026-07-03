import { muapi } from '../lib/muapi.js';
import { appCategories, viralPresets } from '../lib/appsList.js';
import { validateAppParams } from '../lib/modelRequirements.js';
import { AuthModal } from './AuthModal.js';

const DOP_APP_ID = 'higgsfield-dop-image-to-video';

export function AppsGallery() {
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center bg-app-bg p-4 md:p-6 overflow-y-auto custom-scrollbar';

    // Hero
    container.innerHTML = `
        <h1 class="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-2 text-center mt-8">
            Apps
        </h1>
        <p class="text-secondary text-sm mb-8 opacity-60">One-click AI effects and tools</p>
    `;

    // Grid of app cards
    appCategories.forEach(category => {
        const section = document.createElement('div');
        section.className = 'w-full max-w-5xl mb-8';

        const heading = document.createElement('h2');
        heading.className = 'text-lg font-bold text-white mb-3 px-2';
        heading.textContent = category.name;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

        category.apps.forEach(app => {
            const card = document.createElement('button');
            card.className = 'bg-[#111]/80 border border-white/10 rounded-xl p-4 text-left hover:border-primary/40 hover:bg-white/5 transition-all group cursor-pointer';
            card.innerHTML = `
                <div class="text-2xl mb-2">${app.icon}</div>
                <div class="text-white text-sm font-bold group-hover:text-primary transition-colors">${app.name}</div>
                <div class="text-muted text-xs mt-1 line-clamp-2">${app.description}</div>
            `;
            card.onclick = () => openAppModal(app);
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });

    // Viral Presets — one-click Higgsfield-style VFX from a single image
    const viralSection = document.createElement('div');
    viralSection.className = 'w-full max-w-5xl mb-8';
    const viralHeading = document.createElement('h2');
    viralHeading.className = 'text-lg font-bold text-white mb-1 px-2';
    viralHeading.textContent = 'Viral Presets';
    viralSection.appendChild(viralHeading);
    const viralSub = document.createElement('p');
    viralSub.className = 'text-muted text-xs mb-3 px-2';
    viralSub.textContent = 'Big-budget VFX from one photo — inspired by Higgsfield viral presets';
    viralSection.appendChild(viralSub);

    const viralGrid = document.createElement('div');
    viralGrid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';
    viralPresets.forEach(preset => {
        const card = document.createElement('button');
        card.className = 'bg-gradient-to-br from-[#1a1a0a]/90 to-[#111]/90 border border-primary/20 rounded-xl p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer';
        card.innerHTML = `
            <div class="text-2xl mb-2">${preset.icon}</div>
            <div class="text-white text-sm font-bold group-hover:text-primary transition-colors">${preset.name}</div>
            <div class="text-muted text-xs mt-1">${preset.tag}</div>
        `;
        card.onclick = () => openViralPresetModal(preset);
        viralGrid.appendChild(card);
    });
    viralSection.appendChild(viralGrid);
    container.appendChild(viralSection);

    // ==========================================
    // VIRAL PRESET MODAL
    // ==========================================
    function openViralPresetModal(preset) {
        try { muapi.getKey(); } catch {
            document.body.appendChild(AuthModal());
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const modal = document.createElement('div');
        modal.className = 'bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto';
        modal.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-white text-lg font-bold">${preset.icon} ${preset.name}</h3>
                <button class="text-muted hover:text-white text-xl" id="close-viral-modal">&times;</button>
            </div>
            <p class="text-muted text-sm mb-4">Upload a photo and apply the <strong class="text-white">${preset.motion}</strong> effect.</p>
        `;
        modal.querySelector('#close-viral-modal').onclick = () => overlay.remove();

        const fileRow = document.createElement('div');
        fileRow.className = 'flex flex-col gap-1 mb-3';
        fileRow.innerHTML = '<label class="text-xs text-muted font-bold uppercase tracking-widest">Photo</label>';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.className = 'text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white hover:file:bg-white/20';
        fileRow.appendChild(fileInput);
        modal.appendChild(fileRow);

        const promptRow = document.createElement('div');
        promptRow.className = 'flex flex-col gap-1 mb-3';
        promptRow.innerHTML = '<label class="text-xs text-muted font-bold uppercase tracking-widest">Prompt (optional)</label>';
        const promptInput = document.createElement('input');
        promptInput.type = 'text';
        promptInput.value = preset.prompt;
        promptInput.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
        promptRow.appendChild(promptInput);
        modal.appendChild(promptRow);

        const arRow = document.createElement('div');
        arRow.className = 'flex flex-col gap-1 mb-3';
        arRow.innerHTML = '<label class="text-xs text-muted font-bold uppercase tracking-widest">Aspect Ratio</label>';
        const arSelect = document.createElement('select');
        arSelect.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
        ['9:16', '16:9', '1:1'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            if (v === '9:16') opt.selected = true;
            arSelect.appendChild(opt);
        });
        arRow.appendChild(arSelect);
        modal.appendChild(arRow);

        const resultBox = document.createElement('div');
        resultBox.className = 'mt-4';
        modal.appendChild(resultBox);

        const genBtn = document.createElement('button');
        genBtn.className = 'w-full mt-4 py-3 bg-primary text-black font-black text-sm rounded-xl hover:bg-primary/90 transition-all';
        genBtn.textContent = '▶ Apply Preset';
        genBtn.onclick = async () => {
            const file = fileInput.files?.[0];
            if (!file) {
                resultBox.innerHTML = '<p class="text-red-400 text-sm">Please upload a photo first.</p>';
                return;
            }
            genBtn.disabled = true;
            genBtn.textContent = '⏳ Generating...';
            resultBox.innerHTML = '<p class="text-muted text-sm animate-pulse">Applying viral preset...</p>';
            try {
                const imageUrl = await muapi.uploadFile(file);
                const rawPayload = {
                    image_url: imageUrl,
                    prompt: promptInput.value.trim() || preset.prompt,
                    motion: preset.motion,
                    options: 'dop-lite',
                    strength: 1,
                    aspect_ratio: arSelect.value,
                };
                const check = validateAppParams(DOP_APP_ID, rawPayload);
                if (!check.valid) throw new Error(check.errors.join('\n'));
                const result = await muapi.runApp(DOP_APP_ID, check.normalized);
                resultBox.innerHTML = '';
                if (result.url) {
                    const video = document.createElement('video');
                    video.src = result.url; video.controls = true;
                    video.className = 'w-full rounded-lg';
                    resultBox.appendChild(video);
                    const dl = document.createElement('a');
                    dl.href = result.url; dl.download = ''; dl.target = '_blank';
                    dl.className = 'inline-block mt-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20';
                    dl.textContent = '⬇ Download';
                    resultBox.appendChild(dl);
                } else {
                    resultBox.innerHTML = '<p class="text-red-400 text-sm">No output URL. Check console.</p>';
                }
            } catch (err) {
                resultBox.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
            } finally {
                genBtn.disabled = false;
                genBtn.textContent = '▶ Apply Preset';
            }
        };
        modal.appendChild(genBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // ==========================================
    // MODAL — opens when user clicks an app card
    // ==========================================
    function openAppModal(app) {
        // Check API key first
        try { muapi.getKey(); } catch {
            document.body.appendChild(AuthModal());
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const modal = document.createElement('div');
        modal.className = 'bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto';

        // Title
        modal.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-white text-lg font-bold">${app.icon} ${app.name}</h3>
                <button class="text-muted hover:text-white text-xl" id="close-app-modal">&times;</button>
            </div>
            <p class="text-muted text-sm mb-4">${app.description}</p>
        `;
        modal.querySelector('#close-app-modal').onclick = () => overlay.remove();

        // Build form fields from app.inputs
        const form = document.createElement('div');
        form.className = 'flex flex-col gap-3';
        const fieldElements = {};

        Object.entries(app.inputs).forEach(([key, schema]) => {
            const row = document.createElement('div');
            row.className = 'flex flex-col gap-1';

            const label = document.createElement('label');
            label.className = 'text-xs text-muted font-bold uppercase tracking-widest';
            label.textContent = schema.title || key;
            row.appendChild(label);

            if (schema.type === 'image' || schema.type === 'video') {
                // File upload input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = schema.type === 'image' ? 'image/*' : 'video/*';
                fileInput.className = 'text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white hover:file:bg-white/20';
                fieldElements[key] = { type: 'file', el: fileInput };
                row.appendChild(fileInput);
            } else if (schema.type === 'select') {
                const select = document.createElement('select');
                select.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
                (schema.enum || []).forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v; opt.textContent = v;
                    if (v === schema.default) opt.selected = true;
                    select.appendChild(opt);
                });
                fieldElements[key] = { type: 'value', el: select };
                row.appendChild(select);
            } else {
                // Text input
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = schema.description || '';
                input.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
                fieldElements[key] = { type: 'value', el: input };
                row.appendChild(input);
            }
            form.appendChild(row);
        });
        modal.appendChild(form);

        // Result area
        const resultBox = document.createElement('div');
        resultBox.className = 'mt-4';
        modal.appendChild(resultBox);

        // Generate button
        const genBtn = document.createElement('button');
        genBtn.className = 'w-full mt-4 py-3 bg-primary text-black font-black text-sm rounded-xl hover:bg-primary/90 transition-all';
        genBtn.textContent = '▶ Generate';
        genBtn.onclick = async () => {
            genBtn.disabled = true;
            genBtn.textContent = '⏳ Processing...';
            resultBox.innerHTML = '<p class="text-muted text-sm animate-pulse">Working...</p>';

            try {
                // Build payload
                const payload = {};
                for (const [key, field] of Object.entries(fieldElements)) {
                    if (field.type === 'file') {
                        const file = field.el.files?.[0];
                        if (!file && app.inputs[key].required) {
                            throw new Error(`Please select a file for "${app.inputs[key].title}"`);
                        }
                        if (file) {
                            // Upload file first, then use the URL
                            payload[key] = await muapi.uploadFile(file);
                        }
                    } else {
                        const val = field.el.value?.trim();
                        if (val) {
                            if (key === 'video_urls' || key === 'videos_list') {
                                payload[key] = val.split('\n').map(s => s.trim()).filter(Boolean);
                            } else {
                                payload[key] = val;
                            }
                        }
                    }
                }

                const check = validateAppParams(app.id, payload);
                if (!check.valid) throw new Error(check.errors.join('\n'));

                const result = await muapi.runApp(app.id, check.normalized);

                // Display result
                resultBox.innerHTML = '';
                if (result.url) {
                    if (result.url.match(/\.(mp4|webm|mov)/i) || app.inputs.video_url ||
                        ['ai-video-effects', 'vfx', 'motion-controls', 'ai-video-upscaler', DOP_APP_ID].includes(app.id)) {
                        const video = document.createElement('video');
                        video.src = result.url; video.controls = true;
                        video.className = 'w-full rounded-lg';
                        resultBox.appendChild(video);
                    } else if (result.url.match(/\.(mp3|wav|ogg|flac)/i)) {
                        const audio = document.createElement('audio');
                        audio.src = result.url; audio.controls = true;
                        audio.className = 'w-full';
                        resultBox.appendChild(audio);
                    } else {
                        const img = document.createElement('img');
                        img.src = result.url;
                        img.className = 'w-full rounded-lg';
                        resultBox.appendChild(img);
                    }
                    const dl = document.createElement('a');
                    dl.href = result.url; dl.download = ''; dl.target = '_blank';
                    dl.className = 'inline-block mt-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20';
                    dl.textContent = '⬇ Download';
                    resultBox.appendChild(dl);
                } else {
                    resultBox.innerHTML = '<p class="text-red-400 text-sm">No output URL. Check console.</p>';
                    console.warn('Result:', result);
                }
            } catch (err) {
                resultBox.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
            } finally {
                genBtn.disabled = false;
                genBtn.textContent = '▶ Generate';
            }
        };
        modal.appendChild(genBtn);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    return container;
}
