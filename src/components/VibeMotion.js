import { muapi } from '../lib/muapi.js';
import { i2vModels } from '../lib/models.js';
import { validateAudioParams } from '../lib/modelRequirements.js';

const DEFAULT_MUSIC_MODEL = 'suno-create-music';

const MOTION_PRESETS = [
    { id: 'orbit',     name: 'Cinematic Orbit',  icon: '🎬', prompt: 'smooth cinematic orbit around the subject, dramatic lighting shift' },
    { id: 'dolly',     name: 'Dolly Zoom',       icon: '🔍', prompt: 'slow dolly zoom into the subject, background stretching, vertigo effect' },
    { id: 'pan',       name: 'Smooth Pan',        icon: '➡️', prompt: 'smooth horizontal pan across the scene, gentle parallax motion' },
    { id: 'shake',     name: 'Energetic Shake',   icon: '⚡', prompt: 'dynamic handheld camera shake, energetic movement, music video feel' },
    { id: 'rise',      name: 'Slow Rise',         icon: '⬆️', prompt: 'slow upward camera rise revealing the full scene, epic aerial reveal' },
    { id: 'parallax',  name: 'Parallax Drift',    icon: '🌊', prompt: 'subtle parallax drift, foreground and background moving at different speeds, dreamy' },
    { id: 'zoom_out',  name: 'Epic Zoom Out',     icon: '🌍', prompt: 'dramatic zoom out from close-up to wide establishing shot' },
    { id: 'tracking',  name: 'Subject Track',     icon: '🏃', prompt: 'smooth tracking shot following the subject, cinematic stabilization' },
];

const AUDIO_MOODS = [
    { id: 'none', name: 'No Audio' },
    { id: 'upbeat', name: 'Upbeat', style: 'upbeat energetic pop, modern production, catchy rhythm' },
    { id: 'chill', name: 'Chill', style: 'chill lofi beats, relaxed ambient, soft piano and vinyl crackle' },
    { id: 'dramatic', name: 'Dramatic', style: 'dramatic cinematic orchestral, building tension, epic strings and percussion' },
    { id: 'electronic', name: 'Electronic', style: 'electronic dance music, pulsing synths, modern EDM drop' },
];

// Preferred I2V models for motion work
const PREFERRED_MODELS = [
    'kling-v2.6-pro-i2v',
    'kling-v2.5-turbo-pro-i2v',
    'kling-v2.1-master-i2v',
    'kling-v2.1-pro-i2v',
    'kling-v2.1-standard-i2v',
];

function getDefaultModel() {
    for (const id of PREFERRED_MODELS) {
        if (i2vModels.find(m => m.id === id)) return id;
    }
    return i2vModels[0]?.id || 'kling-v2.1-standard-i2v';
}

function fileUploadKey(file) {
    if (!file) return null;
    return `${file.name}:${file.size}:${file.lastModified}`;
}

function audioWarningMessage(err) {
    const msg = err?.message || String(err);
    if (/timed out/i.test(msg)) {
        return 'Audio timed out — video is ready below.';
    }
    if (/failed|error/i.test(msg)) {
        return 'Audio could not be generated — video is ready below.';
    }
    return 'Audio unavailable — video is ready below.';
}

function appendAudioWarning(resultArea, err) {
    console.warn('Audio generation failed:', err);
    const note = document.createElement('p');
    note.textContent = audioWarningMessage(err);
    note.style.color = 'rgba(255,200,80,0.85)';
    note.style.fontSize = '0.75rem';
    note.style.marginTop = '0.5rem';
    resultArea.appendChild(note);
}

export function VibeMotion() {
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.overflowY = 'auto';
    container.style.padding = '2rem';

    // State
    let selectedPreset = MOTION_PRESETS[0].id;
    let selectedMood = 'none';
    let selectedDuration = '5';
    let selectedModel = getDefaultModel();
    let uploadedImageUrl = null;
    let uploadedFile = null;
    let uploadedFileKey = null;
    let isGenerating = false;
    let isUploading = false;

    // --- Hero ---
    const hero = document.createElement('div');
    hero.style.marginBottom = '2rem';
    hero.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <div style="width:48px;height:48px;border-radius:14px;background:rgba(217,255,0,0.1);border:1px solid rgba(217,255,0,0.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">
                🎥
            </div>
            <div>
                <h1 style="font-size:1.5rem;font-weight:800;color:white;margin:0;">Vibe Motion</h1>
                <p style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin:0;">Turn any image into a motion video with cinematic presets</p>
            </div>
        </div>
    `;
    container.appendChild(hero);

    // --- Layout: left (controls) + right (preview) ---
    const layout = document.createElement('div');
    layout.style.display = 'grid';
    layout.style.gridTemplateColumns = '1fr 1fr';
    layout.style.gap = '2rem';
    layout.style.alignItems = 'start';
    container.appendChild(layout);

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '1.25rem';
    layout.appendChild(leftCol);

    const rightCol = document.createElement('div');
    layout.appendChild(rightCol);

    // --- Section helper ---
    function makeSection(title) {
        const sec = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = title;
        h.style.fontSize = '0.75rem';
        h.style.fontWeight = '700';
        h.style.textTransform = 'uppercase';
        h.style.letterSpacing = '0.05em';
        h.style.color = 'rgba(255,255,255,0.4)';
        h.style.marginBottom = '0.5rem';
        sec.appendChild(h);
        return sec;
    }

    // --- 1. Image Upload ---
    const uploadSec = makeSection('Source Image');

    const uploadBox = document.createElement('div');
    uploadBox.style.border = '2px dashed rgba(255,255,255,0.1)';
    uploadBox.style.borderRadius = '16px';
    uploadBox.style.padding = '2rem';
    uploadBox.style.textAlign = 'center';
    uploadBox.style.cursor = 'pointer';
    uploadBox.style.transition = 'border-color 0.2s';
    uploadBox.style.position = 'relative';
    uploadBox.style.minHeight = '120px';
    uploadBox.style.display = 'flex';
    uploadBox.style.alignItems = 'center';
    uploadBox.style.justifyContent = 'center';
    uploadBox.onmouseenter = () => { uploadBox.style.borderColor = 'rgba(217,255,0,0.3)'; };
    uploadBox.onmouseleave = () => { uploadBox.style.borderColor = 'rgba(255,255,255,0.1)'; };

    const uploadLabel = document.createElement('span');
    uploadLabel.textContent = 'Click to upload an image';
    uploadLabel.style.color = 'rgba(255,255,255,0.5)';
    uploadLabel.style.fontSize = '0.85rem';
    uploadBox.appendChild(uploadLabel);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    uploadBox.onclick = () => fileInput.click();

    fileInput.onchange = async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        uploadedFile = file;
        uploadBox.innerHTML = '';
        const preview = document.createElement('img');
        preview.src = URL.createObjectURL(file);
        preview.style.maxHeight = '160px';
        preview.style.borderRadius = '12px';
        uploadBox.appendChild(preview);
    };

    uploadSec.appendChild(uploadBox);
    uploadSec.appendChild(fileInput);
    leftCol.appendChild(uploadSec);

    // --- 2. Motion Presets ---
    const presetSec = makeSection('Motion Style');
    const presetGrid = document.createElement('div');
    presetGrid.style.display = 'grid';
    presetGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    presetGrid.style.gap = '0.5rem';

    MOTION_PRESETS.forEach(p => {
        const card = document.createElement('button');
        card.style.padding = '0.6rem 0.75rem';
        card.style.borderRadius = '12px';
        card.style.border = p.id === selectedPreset ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
        card.style.background = p.id === selectedPreset ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';
        card.style.cursor = 'pointer';
        card.style.textAlign = 'left';
        card.style.transition = 'all 0.2s';
        card.innerHTML = `<span style="font-size:1rem;">${p.icon}</span> <span style="font-size:0.8rem;color:white;font-weight:600;">${p.name}</span>`;

        card.onclick = () => {
            selectedPreset = p.id;
            Array.from(presetGrid.children).forEach((c, i) => {
                const active = MOTION_PRESETS[i].id === selectedPreset;
                c.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
                c.style.background = active ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';
            });
        };
        presetGrid.appendChild(card);
    });
    presetSec.appendChild(presetGrid);
    leftCol.appendChild(presetSec);

    // --- 3. Custom prompt ---
    const promptSec = makeSection('Additional Direction (optional)');
    const promptInput = document.createElement('textarea');
    promptInput.placeholder = 'e.g. "golden hour lighting, slow motion particles floating"';
    promptInput.rows = 2;
    promptInput.style.width = '100%';
    promptInput.style.padding = '0.6rem 0.75rem';
    promptInput.style.borderRadius = '12px';
    promptInput.style.border = '1px solid rgba(255,255,255,0.1)';
    promptInput.style.background = 'rgba(0,0,0,0.3)';
    promptInput.style.color = 'white';
    promptInput.style.fontSize = '0.8rem';
    promptInput.style.resize = 'vertical';
    promptInput.style.outline = 'none';
    promptSec.appendChild(promptInput);
    leftCol.appendChild(promptSec);

    // --- 4. Duration ---
    const durSec = makeSection('Duration');
    const durRow = document.createElement('div');
    durRow.style.display = 'flex';
    durRow.style.gap = '0.5rem';
    ['5', '10'].forEach(d => {
        const btn = document.createElement('button');
        btn.textContent = d + 's';
        btn.style.padding = '0.4rem 1rem';
        btn.style.borderRadius = '8px';
        btn.style.border = d === selectedDuration ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
        btn.style.background = d === selectedDuration ? 'rgba(217,255,0,0.08)' : 'transparent';
        btn.style.color = 'white';
        btn.style.fontSize = '0.8rem';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            selectedDuration = d;
            Array.from(durRow.children).forEach((b, i) => {
                const active = ['5','10'][i] === d;
                b.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
                b.style.background = active ? 'rgba(217,255,0,0.08)' : 'transparent';
            });
        };
        durRow.appendChild(btn);
    });
    durSec.appendChild(durRow);
    leftCol.appendChild(durSec);

    // --- 5. Audio Mood ---
    const audioSec = makeSection('Audio Pairing (optional)');
    const audioRow = document.createElement('div');
    audioRow.style.display = 'flex';
    audioRow.style.flexWrap = 'wrap';
    audioRow.style.gap = '0.5rem';
    AUDIO_MOODS.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m.name;
        btn.style.padding = '0.4rem 0.75rem';
        btn.style.borderRadius = '8px';
        btn.style.border = m.id === selectedMood ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
        btn.style.background = m.id === selectedMood ? 'rgba(217,255,0,0.08)' : 'transparent';
        btn.style.color = 'white';
        btn.style.fontSize = '0.75rem';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            selectedMood = m.id;
            Array.from(audioRow.children).forEach((b, i) => {
                const active = AUDIO_MOODS[i].id === selectedMood;
                b.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
                b.style.background = active ? 'rgba(217,255,0,0.08)' : 'transparent';
            });
        };
        audioRow.appendChild(btn);
    });
    audioSec.appendChild(audioRow);
    leftCol.appendChild(audioSec);

    // --- 6. Model selector ---
    const modelSec = makeSection('I2V Model');
    const modelSelect = document.createElement('select');
    modelSelect.style.width = '100%';
    modelSelect.style.padding = '0.5rem 0.75rem';
    modelSelect.style.borderRadius = '10px';
    modelSelect.style.border = '1px solid rgba(255,255,255,0.1)';
    modelSelect.style.background = 'rgba(0,0,0,0.4)';
    modelSelect.style.color = 'white';
    modelSelect.style.fontSize = '0.8rem';

    i2vModels.filter(m => m.family !== 'effects').forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (m.id === selectedModel) opt.selected = true;
        modelSelect.appendChild(opt);
    });
    modelSelect.onchange = () => { selectedModel = modelSelect.value; };
    modelSec.appendChild(modelSelect);
    leftCol.appendChild(modelSec);

    // --- Generate Button ---
    const genBtn = document.createElement('button');
    genBtn.textContent = 'Generate Vibe Motion';
    genBtn.style.width = '100%';
    genBtn.style.padding = '0.85rem';
    genBtn.style.borderRadius = '14px';
    genBtn.style.background = 'var(--color-primary, #d9ff00)';
    genBtn.style.color = 'black';
    genBtn.style.fontWeight = '800';
    genBtn.style.fontSize = '0.9rem';
    genBtn.style.border = 'none';
    genBtn.style.cursor = 'pointer';
    genBtn.style.transition = 'all 0.2s';
    leftCol.appendChild(genBtn);

    // --- Right col: Result area ---
    const resultArea = document.createElement('div');
    resultArea.style.minHeight = '300px';
    resultArea.style.border = '1px solid rgba(255,255,255,0.05)';
    resultArea.style.borderRadius = '16px';
    resultArea.style.background = 'rgba(0,0,0,0.2)';
    resultArea.style.display = 'flex';
    resultArea.style.flexDirection = 'column';
    resultArea.style.alignItems = 'center';
    resultArea.style.justifyContent = 'center';
    resultArea.style.padding = '1.5rem';
    resultArea.style.gap = '1rem';

    const placeholder = document.createElement('p');
    placeholder.textContent = 'Your generated video will appear here';
    placeholder.style.color = 'rgba(255,255,255,0.25)';
    placeholder.style.fontSize = '0.85rem';
    resultArea.appendChild(placeholder);
    rightCol.appendChild(resultArea);

    // --- Generate logic ---
    const downloadFile = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, '_blank');
        }
    };

    genBtn.onclick = async () => {
        if (isGenerating || isUploading) return;
        if (!uploadedFile) { alert('Please upload an image first'); return; }

        isGenerating = true;
        genBtn.disabled = true;
        genBtn.style.cursor = 'not-allowed';
        genBtn.textContent = 'Uploading image...';
        genBtn.style.opacity = '0.6';

        try {
            const currentKey = fileUploadKey(uploadedFile);
            let imageUrl = uploadedImageUrl;

            if (imageUrl && uploadedFileKey === currentKey) {
                // Reuse cached upload for the same file
            } else {
                isUploading = true;
                try {
                    imageUrl = await muapi.uploadFile(uploadedFile);
                    uploadedImageUrl = imageUrl;
                    uploadedFileKey = currentKey;
                } finally {
                    isUploading = false;
                }
            }

            // Build motion prompt
            const preset = MOTION_PRESETS.find(p => p.id === selectedPreset);
            let fullPrompt = preset ? preset.prompt : '';
            if (promptInput.value.trim()) {
                fullPrompt += ', ' + promptInput.value.trim();
            }

            genBtn.textContent = 'Generating video...';

            // Generate video
            const videoResult = await muapi.generateI2V({
                model: selectedModel,
                image_url: imageUrl,
                prompt: fullPrompt,
                duration: parseInt(selectedDuration),
                quiet: true,
            });

            // Show video
            resultArea.innerHTML = '';
            if (videoResult.url) {
                const video = document.createElement('video');
                video.src = videoResult.url;
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.style.width = '100%';
                video.style.borderRadius = '12px';
                resultArea.appendChild(video);

                const dlLink = document.createElement('a');
                dlLink.href = '#';
                dlLink.textContent = 'Download Video';
                dlLink.style.color = 'var(--color-primary, #d9ff00)';
                dlLink.style.fontSize = '0.8rem';
                dlLink.style.cursor = 'pointer';
                dlLink.onclick = (e) => {
                    e.preventDefault();
                    downloadFile(videoResult.url, 'vibe-motion.mp4');
                };
                resultArea.appendChild(dlLink);
            }

            // Generate optional audio (video already shown — failure must not block preview)
            const mood = AUDIO_MOODS.find(m => m.id === selectedMood);
            if (mood && mood.style) {
                genBtn.textContent = 'Generating audio...';
                try {
                    const audioCheck = validateAudioParams('music', DEFAULT_MUSIC_MODEL, {
                        prompt: `Short ${selectedDuration} second background track: ${mood.style}`,
                        style: mood.style,
                        instrumental: true,
                    });
                    if (!audioCheck.valid) {
                        throw new Error(audioCheck.errors.join('; '));
                    }
                    const audioResult = await muapi.generateAudio({
                        endpoint: DEFAULT_MUSIC_MODEL,
                        category: 'music',
                        payload: audioCheck.normalized,
                        quiet: true,
                    });
                    if (audioResult.url) {
                        const audioLabel = document.createElement('p');
                        audioLabel.textContent = 'Background Audio (' + mood.name + ')';
                        audioLabel.style.color = 'rgba(255,255,255,0.5)';
                        audioLabel.style.fontSize = '0.75rem';
                        audioLabel.style.marginTop = '0.5rem';
                        resultArea.appendChild(audioLabel);

                        const audio = document.createElement('audio');
                        audio.src = audioResult.url;
                        audio.controls = true;
                        audio.style.width = '100%';
                        resultArea.appendChild(audio);

                        const adlLink = document.createElement('a');
                        adlLink.href = '#';
                        adlLink.textContent = 'Download Audio';
                        adlLink.style.color = 'var(--color-primary, #d9ff00)';
                        adlLink.style.fontSize = '0.8rem';
                        adlLink.style.cursor = 'pointer';
                        adlLink.onclick = (e) => {
                            e.preventDefault();
                            downloadFile(audioResult.url, 'vibe-audio.mp3');
                        };
                        resultArea.appendChild(adlLink);
                    }
                } catch (audioErr) {
                    appendAudioWarning(resultArea, audioErr);
                }
            }
        } catch (err) {
            resultArea.innerHTML = `<p style="color:rgba(255,100,100,0.8);font-size:0.85rem;">Error: ${err.message}</p>`;
        } finally {
            isGenerating = false;
            genBtn.disabled = false;
            genBtn.style.cursor = 'pointer';
            genBtn.textContent = 'Generate Vibe Motion';
            genBtn.style.opacity = '1';
        }
    };

    return container;
}
