import { muapi } from '../lib/muapi.js';
import { getCharacters, saveCharacter, deleteCharacter } from '../lib/characterLibrary.js';
import { validateAppParams } from '../lib/modelRequirements.js';
import { SEEDANCE_OMNI_TRAIN, GEMINI_OMNI_CHARACTER } from '../lib/phase2Models.js';
import { AuthModal } from './AuthModal.js';

export function CharacterBuilder() {
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center bg-app-bg p-4 md:p-6 overflow-y-auto custom-scrollbar';

    // Hero
    const hero = document.createElement('div');
    hero.className = 'flex flex-col items-center mb-8';
    hero.innerHTML = `
        <h1 class="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-2 mt-8 text-center">
            Character Builder
        </h1>
        <p class="text-secondary text-sm opacity-60">Create reusable AI characters with consistent faces</p>
    `;
    container.appendChild(hero);

    // Two columns: left = form, right = saved characters
    const layout = document.createElement('div');
    layout.className = 'w-full max-w-5xl flex flex-col lg:flex-row gap-6';

    // ==========================================
    // LEFT: Character Creation Form
    // ==========================================
    const formCol = document.createElement('div');
    formCol.className = 'flex-1';

    const form = document.createElement('div');
    form.className = 'bg-[#111]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-4';

    // Helper: create a labeled input
    function addField(label, type, options = {}) {
        const row = document.createElement('div');
        row.className = 'flex flex-col gap-1';
        const lbl = document.createElement('label');
        lbl.className = 'text-xs text-muted font-bold uppercase tracking-widest';
        lbl.textContent = label;
        row.appendChild(lbl);

        let el;
        if (type === 'select' && options.choices) {
            el = document.createElement('select');
            el.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
            options.choices.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                el.appendChild(opt);
            });
        } else if (type === 'textarea') {
            el = document.createElement('textarea');
            el.rows = 3;
            el.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none';
            if (options.placeholder) el.placeholder = options.placeholder;
        } else {
            el = document.createElement('input');
            el.type = 'text';
            el.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
            if (options.placeholder) el.placeholder = options.placeholder;
        }
        row.appendChild(el);
        form.appendChild(row);
        return el;
    }

    const nameInput = addField('Character Name', 'text', { placeholder: 'e.g. Agent Nova' });
    const genreSelect = addField('Genre', 'select', { choices:
        ['Action', 'Adventure', 'Comedy', 'Drama', 'Thriller', 'Horror', 'Detective',
         'Romance', 'Sci-Fi', 'Fantasy', 'War', 'Western', 'Historical', 'Sitcom'] });
    const eraSelect = addField('Era', 'select', { choices:
        ['Modern', 'Futuristic', 'Medieval', '1920s', '1950s', '1970s', '1980s', 'Victorian', 'Ancient'] });
    const archetypeSelect = addField('Archetype', 'select', { choices:
        ['Hero', 'Sage', 'Explorer', 'Rebel', 'Lover', 'Creator', 'Innocent', 'Everyman',
         'Caregiver', 'Jester', 'Magician', 'Ruler'] });
    const genderSelect = addField('Gender', 'select', { choices: ['Male', 'Female', 'Non-binary'] });
    const ageInput = addField('Age', 'text', { placeholder: 'e.g. 30s' });
    const appearanceInput = addField('Physical Appearance', 'textarea',
        { placeholder: 'e.g. Tall, athletic build, sharp jawline, dark brown eyes, short black hair' });
    const outfitInput = addField('Outfit', 'textarea',
        { placeholder: 'e.g. Black leather jacket, white t-shirt, dark jeans, combat boots' });
    const detailsInput = addField('Unique Details', 'textarea',
        { placeholder: 'e.g. Scar across left eyebrow, silver ring on right hand, subtle smile' });

    // Optional reference photo (uses PuLID face preservation when provided)
    let referenceImageUrl = null;
    const refRow = document.createElement('div');
    refRow.className = 'flex flex-col gap-1';
    const refLabel = document.createElement('label');
    refLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
    refLabel.textContent = 'Reference Photo (optional)';
    refRow.appendChild(refLabel);
    const refHint = document.createElement('p');
    refHint.className = 'text-muted text-[11px] opacity-70';
    refHint.textContent = 'Upload a portrait to preserve a specific face, or leave empty to generate from your description.';
    refRow.appendChild(refHint);
    const refPreview = document.createElement('div');
    refPreview.className = 'flex items-center gap-3';
    const refThumb = document.createElement('div');
    refThumb.className = 'w-16 h-16 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-muted text-[10px] text-center px-1';
    refThumb.textContent = 'No photo';
    refPreview.appendChild(refThumb);
    const refFileInput = document.createElement('input');
    refFileInput.type = 'file';
    refFileInput.accept = 'image/*';
    refFileInput.className = 'hidden';
    const refUploadBtn = document.createElement('button');
    refUploadBtn.type = 'button';
    refUploadBtn.className = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 text-secondary hover:bg-white/5';
    refUploadBtn.textContent = 'Upload portrait';
    refUploadBtn.onclick = () => refFileInput.click();
    refFileInput.onchange = async () => {
        const file = refFileInput.files?.[0];
        if (!file) return;
        try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); refFileInput.value = ''; return; }
        refUploadBtn.disabled = true;
        refUploadBtn.textContent = 'Uploading...';
        try {
            referenceImageUrl = await muapi.uploadFile(file);
            refThumb.innerHTML = '';
            const img = document.createElement('img');
            img.src = referenceImageUrl;
            img.className = 'w-full h-full rounded-lg object-cover';
            refThumb.className = 'w-16 h-16 rounded-lg overflow-hidden border border-primary/30 flex-shrink-0';
            refThumb.appendChild(img);
            refUploadBtn.textContent = 'Change photo';
        } catch (e) {
            alert(e.message);
            refUploadBtn.textContent = 'Upload portrait';
        } finally {
            refUploadBtn.disabled = false;
        }
    };
    refPreview.append(refUploadBtn, refFileInput);
    refRow.appendChild(refPreview);
    form.appendChild(refRow);

    // Result area
    const resultArea = document.createElement('div');
    resultArea.className = 'mt-4';
    form.appendChild(resultArea);

    // Generate button
    const genBtn = document.createElement('button');
    genBtn.className = 'w-full py-3 bg-primary text-black font-black text-sm rounded-xl hover:bg-primary/90 transition-all';
    genBtn.textContent = '✨ Generate Character';

    genBtn.onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) { alert('Please enter a character name.'); return; }
        try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }

        genBtn.disabled = true;
        genBtn.textContent = '⏳ Generating face & backstory...';
        resultArea.innerHTML = '<p class="text-muted text-sm animate-pulse">This may take 30-60 seconds...</p>';

        try {
            // 1. Build appearance prompt from form fields
            const appearancePrompt = [
                `${genderSelect.value} character, ${ageInput.value || '30s'}`,
                appearanceInput.value || '',
                outfitInput.value ? `wearing ${outfitInput.value}` : '',
                detailsInput.value || '',
                `${genreSelect.value} ${eraSelect.value} style`,
                'portrait photo, cinematic lighting, high detail, realistic'
            ].filter(Boolean).join(', ');

            // 2. Generate portrait — T2I from text, or PuLID when reference photo uploaded
            const faceResult = await muapi.generateFaceId(appearancePrompt, referenceImageUrl);

            // 3. Generate backstory via LLM
            const backstoryPrompt = `Create a short 3-sentence character backstory for:
Name: ${name}
Genre: ${genreSelect.value}
Era: ${eraSelect.value}
Archetype: ${archetypeSelect.value}
Appearance: ${appearanceInput.value}
Respond with ONLY the backstory text, nothing else.`;

            const backstory = await muapi.callLLM(backstoryPrompt);

            // 4. Save character
            const character = {
                id: 'char_' + Date.now(),
                name,
                genre: genreSelect.value,
                era: eraSelect.value,
                archetype: archetypeSelect.value,
                gender: genderSelect.value,
                age: ageInput.value,
                appearance: appearanceInput.value,
                outfit: outfitInput.value,
                details: detailsInput.value,
                referenceImageUrl: faceResult.url,
                backstory: typeof backstory === 'string' ? backstory : JSON.stringify(backstory),
                createdAt: new Date().toISOString()
            };
            saveCharacter(character);

            // Show result
            resultArea.innerHTML = '';
            if (faceResult.url) {
                const img = document.createElement('img');
                img.src = faceResult.url;
                img.className = 'w-48 h-48 rounded-xl object-cover border border-primary/30 mb-3';
                resultArea.appendChild(img);
            }
            const bsEl = document.createElement('p');
            bsEl.className = 'text-white text-sm italic';
            bsEl.textContent = character.backstory;
            resultArea.appendChild(bsEl);

            const savedMsg = document.createElement('p');
            savedMsg.className = 'text-primary text-sm font-bold mt-2';
            savedMsg.textContent = '✓ Character saved! You can now use it in Image/Video Studios.';
            resultArea.appendChild(savedMsg);

            // Refresh the saved characters list
            renderSavedCharacters();

        } catch (err) {
            resultArea.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
            console.error(err);
        } finally {
            genBtn.disabled = false;
            genBtn.textContent = '✨ Generate Character';
        }
    };
    form.appendChild(genBtn);
    formCol.appendChild(form);
    layout.appendChild(formCol);

    // ==========================================
    // RIGHT: Saved Characters List
    // ==========================================
    const listCol = document.createElement('div');
    listCol.className = 'w-full lg:w-80';

    const listTitle = document.createElement('h3');
    listTitle.className = 'text-white font-bold mb-3';
    listTitle.textContent = 'Saved Characters';
    listCol.appendChild(listTitle);

    const listContainer = document.createElement('div');
    listContainer.className = 'flex flex-col gap-3';
    listCol.appendChild(listContainer);

    function renderSavedCharacters() {
        listContainer.innerHTML = '';
        const chars = getCharacters();
        if (chars.length === 0) {
            listContainer.innerHTML = '<p class="text-muted text-sm">No characters yet. Create one!</p>';
            return;
        }
        chars.forEach(c => {
            const card = document.createElement('div');
            card.className = 'bg-[#111]/80 border border-white/10 rounded-xl p-3 flex flex-col gap-2';
            const topRow = document.createElement('div');
            topRow.className = 'flex items-start gap-3';
            topRow.innerHTML = `
                ${c.referenceImageUrl
                    ? `<img src="${c.referenceImageUrl}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0" />`
                    : '<div class="w-14 h-14 rounded-lg bg-white/5 flex-shrink-0"></div>'}
                <div class="flex-1 min-w-0">
                    <div class="text-white text-sm font-bold truncate">${c.name}</div>
                    <div class="text-muted text-xs">${c.archetype} · ${c.genre} · ${c.era}</div>
                    ${c.omniId ? `<div class="text-primary text-[10px] mt-1 font-mono truncate">@omni-character:${c.omniId}</div>` : ''}
                </div>
            `;
            const delBtn = document.createElement('button');
            delBtn.className = 'text-muted hover:text-red-400 text-sm flex-shrink-0';
            delBtn.textContent = '✕';
            delBtn.onclick = () => { deleteCharacter(c.id); renderSavedCharacters(); };
            topRow.appendChild(delBtn);
            card.appendChild(topRow);

            if (c.referenceImageUrl && !c.omniId) {
                const btnRow = document.createElement('div');
                btnRow.className = 'flex gap-2';
                const regBtn = document.createElement('button');
                regBtn.className = 'flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-primary/30 text-primary hover:bg-primary/10';
                regBtn.textContent = 'Seedance Omni ID';
                regBtn.onclick = async () => {
                    try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }
                    regBtn.disabled = true;
                    try {
                        const check = validateAppParams(SEEDANCE_OMNI_TRAIN, {
                            image_url: c.referenceImageUrl,
                            character_name: c.name,
                            description: c.appearance || '',
                        });
                        if (!check.valid) throw new Error(check.errors.join('\n'));
                        const result = await muapi.runApp(SEEDANCE_OMNI_TRAIN, check.normalized);
                        const omniId = result.request_id || result.character_id || result.id;
                        if (!omniId) throw new Error('No character ID returned');
                        saveCharacter({ ...c, omniId: String(omniId), omniType: 'seedance' });
                        renderSavedCharacters();
                    } catch (e) {
                        alert(e.message);
                        regBtn.disabled = false;
                    }
                };
                const gemBtn = document.createElement('button');
                gemBtn.className = 'flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-white/10 text-secondary hover:bg-white/5';
                gemBtn.textContent = 'Gemini Omni ID';
                gemBtn.onclick = async () => {
                    try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }
                    gemBtn.disabled = true;
                    try {
                        const check = validateAppParams(GEMINI_OMNI_CHARACTER, {
                            descriptions: c.appearance || c.name,
                            images_list: [c.referenceImageUrl],
                            character_name: c.name,
                        });
                        if (!check.valid) throw new Error(check.errors.join('\n'));
                        const result = await muapi.runApp(GEMINI_OMNI_CHARACTER, check.normalized);
                        const omniId = result.request_id || result.character_id || result.id;
                        if (!omniId) throw new Error('No character ID returned');
                        saveCharacter({ ...c, omniId: String(omniId), omniType: 'gemini' });
                        renderSavedCharacters();
                    } catch (e) {
                        alert(e.message);
                        gemBtn.disabled = false;
                    }
                };
                btnRow.append(regBtn, gemBtn);
                card.appendChild(btnRow);
            }

            listContainer.appendChild(card);
        });
    }

    layout.appendChild(listCol);
    container.appendChild(layout);

    // Initial render
    renderSavedCharacters();

    return container;
}
