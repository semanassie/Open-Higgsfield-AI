import { muapi } from '../lib/muapi.js';
import { ttsModels, musicModels, sfxModels, getSFXModelById } from '../lib/models.js';
import { validateAudioParams } from '../lib/modelRequirements.js';
import {
    getAudioScenes, saveAudioScene, deleteAudioScene, createEmptyScene, VOICE_OPTIONS, resolveVoiceId,
} from '../lib/audioScenes.js';
import { AuthModal } from './AuthModal.js';

export function AudioStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center justify-center bg-app-bg relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden';

    // --- State ---
    let activeTab = 'voice';
    let selectedModel = ttsModels[0].id;
    let isGenerating = false;
    let currentScene = createEmptyScene();

    // ==========================================
    // HERO SECTION (just like LipSyncStudio)
    // ==========================================
    const hero = document.createElement('div');
    hero.className = 'flex flex-col items-center mb-10 md:mb-20 animate-fade-in-up';
    hero.innerHTML = `
        <div class="mb-10 relative group">
            <div class="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-40"></div>
            <div class="relative w-24 h-24 md:w-32 md:h-32 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5 overflow-hidden">
                <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow relative z-10">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-primary">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                </div>
            </div>
        </div>
        <h1 class="text-2xl sm:text-4xl md:text-7xl font-black text-white tracking-widest uppercase mb-4 text-center px-4">
            Audio Studio
        </h1>
        <p class="text-secondary text-sm font-medium tracking-wide opacity-60">
            Speech, music, sound FX & multi-speaker scenes
        </p>
    `;
    container.appendChild(hero);

    // ==========================================
    // TAB BUTTONS
    // ==========================================
    const tabRow = document.createElement('div');
    tabRow.className = 'flex items-center gap-2 mb-6';

    const tabs = [
        { id: 'voice', label: '🎙 Voice', models: ttsModels },
        { id: 'music', label: '🎵 Music', models: musicModels },
        { id: 'sfx',   label: '🔊 Sound FX', models: sfxModels },
        { id: 'scenes', label: '🎭 Scenes', models: null },
    ];

    const tabButtons = {};
    tabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = tab.label;
        btn.className = tab.id === activeTab
            ? 'px-5 py-2 rounded-xl text-sm font-bold border border-primary bg-primary/10 text-primary transition-all'
            : 'px-5 py-2 rounded-xl text-sm font-bold border border-white/10 text-muted hover:border-white/30 hover:text-white transition-all';
        btn.onclick = () => {
            activeTab = tab.id;
            if (tab.models?.length > 0) selectedModel = tab.models[0].id;
            // Update button styles
            Object.entries(tabButtons).forEach(([id, b]) => {
                if (id === tab.id) {
                    b.className = 'px-5 py-2 rounded-xl text-sm font-bold border border-primary bg-primary/10 text-primary transition-all';
                } else {
                    b.className = 'px-5 py-2 rounded-xl text-sm font-bold border border-white/10 text-muted hover:border-white/30 hover:text-white transition-all';
                }
            });
            rebuildForm();
        };
        tabButtons[tab.id] = btn;
        tabRow.appendChild(btn);
    });
    container.appendChild(tabRow);

    // ==========================================
    // FORM AREA (rebuilt when tab changes)
    // ==========================================
    const formWrapper = document.createElement('div');
    formWrapper.className = 'w-full max-w-2xl';
    container.appendChild(formWrapper);

    // ==========================================
    // RESULT AREA
    // ==========================================
    const resultArea = document.createElement('div');
    resultArea.className = 'w-full max-w-2xl mt-6';
    container.appendChild(resultArea);

    // ==========================================
    // BUILD FORM — called whenever tab changes
    // ==========================================
    function buildScenesUI() {
        formWrapper.innerHTML = '';
        resultArea.innerHTML = '';

        const bar = document.createElement('div');
        bar.className = 'w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-3xl';

        const headerRow = document.createElement('div');
        headerRow.className = 'flex flex-wrap gap-2 items-center justify-between';
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = currentScene.title;
        titleInput.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold flex-1 min-w-[200px]';
        titleInput.oninput = () => { currentScene.title = titleInput.value; };

        const savedSelect = document.createElement('select');
        savedSelect.className = 'bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-xs';
        savedSelect.innerHTML = '<option value="">Load saved…</option>';
        getAudioScenes().forEach(s => {
            const o = document.createElement('option');
            o.value = s.id;
            o.textContent = s.title;
            savedSelect.appendChild(o);
        });
        savedSelect.onchange = () => {
            const s = getAudioScenes().find(x => x.id === savedSelect.value);
            if (s) { currentScene = JSON.parse(JSON.stringify(s)); rebuildForm(); }
        };

        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.className = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 text-muted hover:text-white';
        newBtn.textContent = '+ New';
        newBtn.onclick = () => { currentScene = createEmptyScene(); rebuildForm(); };

        headerRow.append(titleInput, savedSelect, newBtn);
        bar.appendChild(headerRow);

        const ambLabel = document.createElement('label');
        ambLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
        ambLabel.textContent = 'Ambience (optional)';
        const ambInput = document.createElement('input');
        ambInput.type = 'text';
        ambInput.value = currentScene.ambience || '';
        ambInput.placeholder = 'e.g. Rain on window, quiet café murmur';
        ambInput.className = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
        bar.appendChild(ambLabel);
        bar.appendChild(ambInput);

        const linesWrap = document.createElement('div');
        linesWrap.className = 'flex flex-col gap-3';

        function renderLines() {
            linesWrap.innerHTML = '';
            currentScene.lines.forEach((line, idx) => {
                const row = document.createElement('div');
                row.className = 'border border-white/10 rounded-xl p-3 flex flex-col gap-2';

                const top = document.createElement('div');
                top.className = 'flex flex-wrap gap-2 items-center';
                const spk = document.createElement('input');
                spk.type = 'text';
                spk.value = line.speaker;
                spk.className = 'bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs w-28';
                spk.oninput = () => { line.speaker = spk.value; };
                const voice = document.createElement('select');
                voice.className = 'bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs';
                VOICE_OPTIONS.forEach(v => {
                    const o = document.createElement('option');
                    o.value = v; o.textContent = v.replace(/_/g, ' ');
                    o.selected = v === resolveVoiceId(line.voice_id);
                    voice.appendChild(o);
                });
                voice.onchange = () => { line.voice_id = voice.value; };
                top.append(spk, voice);

                const txt = document.createElement('textarea');
                txt.rows = 2;
                txt.value = line.text;
                txt.placeholder = 'Dialogue line…';
                txt.className = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none';
                txt.oninput = () => { line.text = txt.value; };

                if (line.audioUrl) {
                    const aud = document.createElement('audio');
                    aud.controls = true;
                    aud.src = line.audioUrl;
                    aud.className = 'w-full';
                    row.appendChild(aud);
                } else if (line.audioError) {
                    const err = document.createElement('p');
                    err.className = 'text-xs text-red-400';
                    err.textContent = line.audioError;
                    row.appendChild(err);
                }

                row.appendChild(top);
                row.appendChild(txt);
                linesWrap.appendChild(row);
            });
        }
        renderLines();
        bar.appendChild(linesWrap);

        const addLineBtn = document.createElement('button');
        addLineBtn.type = 'button';
        addLineBtn.className = 'text-xs text-primary font-bold';
        addLineBtn.textContent = '+ Add line';
        addLineBtn.onclick = () => {
            currentScene.lines.push({
                id: `line_${Date.now()}`,
                speaker: `Speaker ${currentScene.lines.length + 1}`,
                voice_id: 'English_FriendlyPerson',
                text: '',
            });
            renderLines();
        };
        bar.appendChild(addLineBtn);

        const genBtn = document.createElement('button');
        genBtn.type = 'button';
        genBtn.className = 'w-full py-3 bg-primary text-black font-black text-sm rounded-xl hover:bg-primary/90 disabled:opacity-50';
        genBtn.textContent = '▶ Generate Scene';

        genBtn.onclick = async () => {
            try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }
            const lines = currentScene.lines.filter(l => l.text.trim());
            if (!lines.length) { alert('Add at least one dialogue line.'); return; }

            genBtn.disabled = true;
            resultArea.innerHTML = '<p class="text-muted text-sm animate-pulse">Generating scene audio…</p>';
            currentScene.ambience = ambInput.value.trim();
            currentScene.title = titleInput.value.trim() || currentScene.title;

            try {
                let ambienceWarning = '';
                if (currentScene.ambience) {
                    const sfxModel = getSFXModelById('mmaudio-v2-text-to-audio');
                    const ambCheck = validateAudioParams('sfx', sfxModel.id, {
                        prompt: currentScene.ambience,
                        duration: 8,
                    });
                    if (ambCheck.valid) {
                        try {
                            const ambRes = await muapi.generateAudio({
                                endpoint: sfxModel.id,
                                category: 'sfx',
                                payload: ambCheck.normalized,
                            });
                            currentScene.ambienceUrl = ambRes.url || null;
                        } catch (ambErr) {
                            ambienceWarning = `Ambience skipped: ${ambErr.message}`;
                        }
                    }
                }

                for (const line of lines) {
                    line.audioUrl = null;
                    line.audioError = null;
                    try {
                        const check = validateAudioParams('tts', 'minimax-speech-2.6-hd', {
                            prompt: line.text.trim(),
                            voice_id: resolveVoiceId(line.voice_id),
                            emotion: 'neutral',
                        });
                        if (!check.valid) throw new Error(check.errors.join(' '));
                        const res = await muapi.generateAudio({
                            endpoint: 'minimax-speech-2.6-hd',
                            category: 'tts',
                            payload: check.normalized,
                        });
                        line.audioUrl = res.url || null;
                        if (!line.audioUrl) throw new Error('No audio URL returned');
                    } catch (lineErr) {
                        line.audioError = lineErr.message;
                    }
                }

                saveAudioScene({ ...currentScene, lines, updatedAt: new Date().toISOString() });
                rebuildForm();

                resultArea.innerHTML = '';
                if (currentScene.ambienceUrl) {
                    const lbl = document.createElement('p');
                    lbl.className = 'text-xs text-muted mb-1';
                    lbl.textContent = 'Ambience';
                    resultArea.appendChild(lbl);
                    const amb = document.createElement('audio');
                    amb.controls = true;
                    amb.src = currentScene.ambienceUrl;
                    amb.className = 'w-full mb-4';
                    resultArea.appendChild(amb);
                }
                lines.forEach(line => {
                    const lbl = document.createElement('p');
                    lbl.className = 'text-xs text-primary font-bold mt-2';
                    lbl.textContent = line.speaker;
                    resultArea.appendChild(lbl);
                    if (line.audioUrl) {
                        const aud = document.createElement('audio');
                        aud.controls = true;
                        aud.src = line.audioUrl;
                        aud.className = 'w-full mb-2';
                        resultArea.appendChild(aud);
                    } else if (line.audioError) {
                        const err = document.createElement('p');
                        err.className = 'text-xs text-red-400 mb-2';
                        err.textContent = line.audioError;
                        resultArea.appendChild(err);
                    }
                });
                const note = document.createElement('p');
                note.className = 'text-xs text-muted mt-3';
                note.textContent = ambienceWarning
                    ? `${ambienceWarning} — dialogue clips generated below.`
                    : 'Lines play as separate clips. Combine in your editor, or send individual lines to Lip Sync.';
                resultArea.appendChild(note);
            } catch (err) {
                resultArea.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
            } finally {
                genBtn.disabled = false;
            }
        };

        bar.appendChild(genBtn);
        formWrapper.appendChild(bar);
    }

    function rebuildForm() {
        formWrapper.innerHTML = '';
        resultArea.innerHTML = '';

        if (activeTab === 'scenes') {
            buildScenesUI();
            return;
        }

        const bar = document.createElement('div');
        bar.className = 'w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-3xl';

        const currentModels = tabs.find(t => t.id === activeTab).models;

        if (currentModels.length === 0) {
            bar.innerHTML = '<p class="text-muted text-sm text-center py-4">No models available in this category yet.</p>';
            formWrapper.appendChild(bar);
            return;
        }

        // --- Model Selector ---
        const modelRow = document.createElement('div');
        modelRow.className = 'flex items-center gap-3';
        const modelLabel = document.createElement('span');
        modelLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
        modelLabel.textContent = 'Model:';
        const modelSelect = document.createElement('select');
        modelSelect.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50';
        currentModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            opt.selected = m.id === selectedModel;
            modelSelect.appendChild(opt);
        });
        modelSelect.onchange = () => { selectedModel = modelSelect.value; rebuildForm(); };
        modelRow.appendChild(modelLabel);
        modelRow.appendChild(modelSelect);
        bar.appendChild(modelRow);

        // --- Text Input (all tabs need some text) ---
        const textArea = document.createElement('textarea');
        textArea.className = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-muted/50 resize-none focus:outline-none focus:border-primary/50';
        textArea.rows = 4;

        if (activeTab === 'voice') {
            textArea.placeholder = 'Type the text you want spoken aloud...';
        } else if (activeTab === 'music') {
            textArea.placeholder = 'Describe the music or write lyrics...\ne.g. "Upbeat electronic dance track with a catchy synth melody"';
        } else {
            textArea.placeholder = 'Describe the sound effect...\ne.g. "Thunder rumbling in the distance followed by heavy rain"';
        }
        bar.appendChild(textArea);

        // --- Voice-specific controls ---
        let voiceSelect, emotionSelect, speedInput;
        if (activeTab === 'voice') {
            const voiceRow = document.createElement('div');
            voiceRow.className = 'flex flex-wrap items-center gap-3';

            // Voice selector
            const vLabel = document.createElement('span');
            vLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
            vLabel.textContent = 'Voice:';
            voiceSelect = document.createElement('select');
            voiceSelect.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none';
            const voices = currentModels.find(m => m.id === selectedModel)?.inputs?.voice_id?.enum
                || currentModels[0].inputs.voice_id?.enum || ['presenter_male'];
            voices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v.replace(/-/g, ' ').replace(/_/g, ' ');
                voiceSelect.appendChild(opt);
            });

            // Emotion selector
            const eLabel = document.createElement('span');
            eLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest ml-2';
            eLabel.textContent = 'Emotion:';
            emotionSelect = document.createElement('select');
            emotionSelect.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none';
            ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised'].forEach(e => {
                const opt = document.createElement('option');
                opt.value = e; opt.textContent = e;
                emotionSelect.appendChild(opt);
            });

            // Speed
            const sLabel = document.createElement('span');
            sLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest ml-2';
            sLabel.textContent = 'Speed:';
            speedInput = document.createElement('input');
            speedInput.type = 'range';
            speedInput.min = '0.5'; speedInput.max = '2.0'; speedInput.step = '0.1'; speedInput.value = '1.0';
            speedInput.className = 'w-20 accent-primary';

            voiceRow.append(vLabel, voiceSelect, eLabel, emotionSelect, sLabel, speedInput);
            bar.appendChild(voiceRow);
        }

        // --- Music-specific controls ---
        let styleInput, instrumentalCheckbox;
        if (activeTab === 'music') {
            const musicRow = document.createElement('div');
            musicRow.className = 'flex flex-wrap items-center gap-3';

            const sLabel = document.createElement('span');
            sLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
            sLabel.textContent = 'Style:';
            styleInput = document.createElement('input');
            styleInput.type = 'text';
            styleInput.placeholder = 'e.g. Pop, Jazz, Lo-fi, Classical';
            styleInput.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none w-48';

            const iLabel = document.createElement('label');
            iLabel.className = 'flex items-center gap-2 text-xs text-muted font-bold uppercase tracking-widest ml-2 cursor-pointer';
            instrumentalCheckbox = document.createElement('input');
            instrumentalCheckbox.type = 'checkbox';
            instrumentalCheckbox.className = 'accent-primary';
            iLabel.appendChild(instrumentalCheckbox);
            iLabel.append(' Instrumental');

            musicRow.append(sLabel, styleInput, iLabel);
            bar.appendChild(musicRow);
        }

        // --- Generate Button ---
        const generateBtn = document.createElement('button');
        generateBtn.type = 'button';
        generateBtn.className = 'w-full py-3 bg-primary text-black font-black text-sm rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
        generateBtn.textContent = '▶ Generate';

        generateBtn.onclick = async () => {
            const text = textArea.value.trim();
            if (!text) { alert('Please enter some text.'); return; }

            // Check API key
            try { muapi.getKey(); } catch {
                document.body.appendChild(AuthModal());
                return;
            }

            isGenerating = true;
            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';
            resultArea.innerHTML = '<p class="text-muted text-sm animate-pulse">Generating audio... this may take a moment.</p>';

            try {
                const audioCategory = activeTab === 'voice' ? 'tts' : activeTab === 'music' ? 'music' : 'sfx';
                let rawPayload = {};

                if (activeTab === 'voice') {
                    rawPayload.prompt = text;
                    if (voiceSelect) rawPayload.voice_id = voiceSelect.value;
                    if (emotionSelect) rawPayload.emotion = emotionSelect.value;
                    if (speedInput) rawPayload.speed = parseFloat(speedInput.value);
                } else if (activeTab === 'music') {
                    rawPayload.prompt = text;
                    if (styleInput?.value) rawPayload.style = styleInput.value;
                    if (instrumentalCheckbox?.checked) rawPayload.instrumental = true;
                } else {
                    rawPayload.prompt = text;
                }

                const check = validateAudioParams(audioCategory, selectedModel, rawPayload);
                if (!check.valid) {
                    alert(check.errors.join('\n'));
                    return;
                }

                const result = await muapi.generateAudio({
                    endpoint: selectedModel,
                    category: audioCategory,
                    payload: check.normalized,
                });

                // Show result
                resultArea.innerHTML = '';
                if (result.url) {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = result.url;
                    audio.className = 'w-full mb-3';
                    resultArea.appendChild(audio);

                    // Download button
                    const dlBtn = document.createElement('a');
                    dlBtn.href = result.url;
                    dlBtn.download = `audio-${Date.now()}.mp3`;
                    dlBtn.target = '_blank';
                    dlBtn.className = 'inline-block px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-all mr-2';
                    dlBtn.textContent = '⬇ Download';
                    resultArea.appendChild(dlBtn);

                    // Send to Lip Sync button
                    const lsBtn = document.createElement('button');
                    lsBtn.className = 'inline-block px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/30 transition-all';
                    lsBtn.textContent = '🎙 Send to Lip Sync';
                    lsBtn.onclick = () => {
                        // Store the audio URL and navigate
                        sessionStorage.setItem('audio_for_lipsync', result.url);
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'lipsync' } }));
                    };
                    resultArea.appendChild(lsBtn);
                } else {
                    resultArea.innerHTML = '<p class="text-red-400 text-sm">No audio URL in response. Check console.</p>';
                    console.warn('Full result:', result);
                }
            } catch (err) {
                resultArea.innerHTML = `<p class="text-red-400 text-sm">Error: ${err.message}</p>`;
                console.error(err);
            } finally {
                isGenerating = false;
                generateBtn.disabled = false;
                generateBtn.textContent = '▶ Generate';
            }
        };
        bar.appendChild(generateBtn);

        formWrapper.appendChild(bar);
    }

    // Build initial form
    rebuildForm();

    return container;
}
