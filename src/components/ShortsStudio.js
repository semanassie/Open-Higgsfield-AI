import { muapi } from '../lib/muapi.js';
import { validateAudioParams } from '../lib/modelRequirements.js';
import { validateAppParams } from '../lib/modelRequirements.js';
import { AuthModal } from './AuthModal.js';
import { SHORTS_DEFAULT_I2V, SHORTS_DEFAULT_T2V } from '../lib/phase2Models.js';

const HOOK_PRESETS = [
    { id: 'question', name: '❓ Question Hook', suffix: 'opens with a bold question, direct eye contact, punchy energy' },
    { id: 'shock', name: '⚡ Shock Value', suffix: 'dramatic reveal moment, fast zoom, high contrast lighting' },
    { id: 'story', name: '📖 Story Start', suffix: 'cinematic story opening, emotional close-up, soft bokeh' },
    { id: 'tutorial', name: '🎯 Quick Tip', suffix: 'clean tutorial style, pointing gesture, bright even lighting' },
    { id: 'trend', name: '🔥 Trending', suffix: 'viral TikTok energy, dynamic movement, trendy aesthetic' },
];

export function ShortsStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg p-4 md:p-8';

    let uploadedImageUrl = null;
    let selectedHook = HOOK_PRESETS[0].id;
    let addMusic = true;
    let addCaptions = false;
    let isGenerating = false;

    const hero = document.createElement('div');
    hero.className = 'max-w-3xl mx-auto mb-8 text-center';
    hero.innerHTML = `
        <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">Shorts Studio</h1>
        <p class="text-secondary text-sm">One-click vertical short — hook, motion, optional music & captions</p>
    `;
    container.appendChild(hero);

    const card = document.createElement('div');
    card.className = 'max-w-3xl mx-auto bg-[#111]/90 border border-white/10 rounded-2xl p-6 flex flex-col gap-5';

    // Upload
    const uploadZone = document.createElement('div');
    uploadZone.className = 'border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors';
    const uploadLabel = document.createElement('p');
    uploadLabel.className = 'text-secondary text-sm';
    uploadLabel.textContent = '📱 Upload start frame (optional — or use text-only)';
    const preview = document.createElement('img');
    preview.className = 'mx-auto mt-3 rounded-lg max-h-48 hidden';
    uploadZone.appendChild(uploadLabel);
    uploadZone.appendChild(preview);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'hidden';
    uploadZone.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        uploadLabel.textContent = '⏳ Uploading…';
        try {
            uploadedImageUrl = await muapi.uploadFile(file);
            preview.src = uploadedImageUrl;
            preview.classList.remove('hidden');
            uploadLabel.textContent = '✓ Image ready';
        } catch (e) {
            uploadLabel.textContent = `✗ ${e.message}`;
        }
    };
    card.appendChild(uploadZone);
    card.appendChild(fileInput);

    const prompt = document.createElement('textarea');
    prompt.className = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50';
    prompt.rows = 3;
    prompt.placeholder = 'Describe your short — e.g. "Fitness coach reveals the #1 morning habit"';
    card.appendChild(prompt);

    // Hook presets
    const hookLabel = document.createElement('div');
    hookLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
    hookLabel.textContent = 'Hook Style';
    card.appendChild(hookLabel);
    const hookRow = document.createElement('div');
    hookRow.className = 'flex flex-wrap gap-2';
    HOOK_PRESETS.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = h.name;
        btn.className = h.id === selectedHook
            ? 'px-3 py-1.5 rounded-lg text-xs font-bold border border-primary bg-primary/10 text-primary'
            : 'px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-muted hover:border-white/30';
        btn.onclick = () => {
            selectedHook = h.id;
            hookRow.querySelectorAll('button').forEach((b, i) => {
                b.className = HOOK_PRESETS[i].id === selectedHook
                    ? 'px-3 py-1.5 rounded-lg text-xs font-bold border border-primary bg-primary/10 text-primary'
                    : 'px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-muted hover:border-white/30';
            });
        };
        hookRow.appendChild(btn);
    });
    card.appendChild(hookRow);

    // Options
    const optRow = document.createElement('div');
    optRow.className = 'flex flex-wrap gap-4 text-sm text-secondary';
    const musicLbl = document.createElement('label');
    musicLbl.className = 'flex items-center gap-2 cursor-pointer';
    const musicCb = document.createElement('input');
    musicCb.type = 'checkbox';
    musicCb.checked = addMusic;
    musicCb.className = 'accent-primary';
    musicCb.onchange = () => { addMusic = musicCb.checked; };
    musicLbl.append(musicCb, ' Add background music (Suno)');
    const capLbl = document.createElement('label');
    capLbl.className = 'flex items-center gap-2 cursor-pointer';
    const capCb = document.createElement('input');
    capCb.type = 'checkbox';
    capCb.checked = addCaptions;
    capCb.className = 'accent-primary';
    capCb.onchange = () => { addCaptions = capCb.checked; };
    capLbl.append(capCb, ' Auto captions');
    optRow.append(musicLbl, capLbl);
    card.appendChild(optRow);

    const status = document.createElement('div');
    status.className = 'text-sm text-secondary hidden';
    card.appendChild(status);

    const resultArea = document.createElement('div');
    card.appendChild(resultArea);

    const genBtn = document.createElement('button');
    genBtn.className = 'w-full py-3 bg-primary text-black font-black rounded-xl hover:bg-primary/90 disabled:opacity-50';
    genBtn.textContent = '▶ Generate Short (9:16)';
    genBtn.onclick = async () => {
        const base = prompt.value.trim();
        if (!base) { alert('Enter a prompt for your short.'); return; }
        try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }
        if (isGenerating) return;

        const hook = HOOK_PRESETS.find(h => h.id === selectedHook);
        const fullPrompt = `${base}. ${hook?.suffix || ''} Vertical 9:16 social media short, punchy hook in first second.`;

        isGenerating = true;
        genBtn.disabled = true;
        status.classList.remove('hidden');
        resultArea.innerHTML = '';

        try {
            status.textContent = '⏳ Step 1/3: Generating vertical video…';

            let videoUrl;
            if (uploadedImageUrl) {
                const res = await muapi.generateI2V({
                    model: SHORTS_DEFAULT_I2V,
                    image_url: uploadedImageUrl,
                    prompt: fullPrompt,
                    aspect_ratio: '9:16',
                    duration: 5,
                    resolution: '720p',
                });
                videoUrl = res.url || res.outputs?.[0];
            } else {
                const res = await muapi.generateVideo({
                    model: SHORTS_DEFAULT_T2V,
                    prompt: fullPrompt,
                    aspect_ratio: '9:16',
                    duration: 5,
                    resolution: '720p',
                });
                videoUrl = res.url || res.outputs?.[0];
            }
            if (!videoUrl) throw new Error('No video URL returned');

            if (addMusic) {
                status.textContent = '⏳ Step 2/3: Generating background music…';
                const musicCheck = validateAudioParams('music', 'suno-create-music', {
                    prompt: `Short instrumental bed for: ${base.slice(0, 120)}`,
                    style: 'upbeat social media',
                    instrumental: true,
                });
                if (musicCheck.valid) {
                    await muapi.generateAudio({
                        endpoint: 'suno-create-music',
                        category: 'music',
                        payload: musicCheck.normalized,
                    });
                    // Music is separate track — user can mix externally; we note in UI
                }
            }

            if (addCaptions) {
                status.textContent = '⏳ Step 3/3: Adding captions…';
                const capCheck = validateAppParams('ai-captions', { video_url: videoUrl });
                if (capCheck.valid) {
                    const capped = await muapi.runApp('ai-captions', capCheck.normalized);
                    if (capped.url) videoUrl = capped.url;
                }
            } else {
                status.textContent = '✓ Done!';
            }

            status.textContent = '✓ Short ready!';
            const video = document.createElement('video');
            video.src = videoUrl;
            video.controls = true;
            video.className = 'w-full max-w-sm mx-auto rounded-xl mt-4';
            resultArea.appendChild(video);
            const dl = document.createElement('a');
            dl.href = videoUrl;
            dl.download = 'short.mp4';
            dl.target = '_blank';
            dl.className = 'inline-block mt-3 px-4 py-2 bg-white/10 rounded-lg text-white text-sm';
            dl.textContent = '⬇ Download';
            resultArea.appendChild(dl);
            if (addMusic) {
                const note = document.createElement('p');
                note.className = 'text-xs text-muted mt-2';
                note.textContent = 'Background music generated separately — combine in your editor or use Lip Sync.';
                resultArea.appendChild(note);
            }
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            status.classList.add('text-red-400');
        } finally {
            isGenerating = false;
            genBtn.disabled = false;
        }
    };
    card.appendChild(genBtn);

    container.appendChild(card);
    return container;
}
