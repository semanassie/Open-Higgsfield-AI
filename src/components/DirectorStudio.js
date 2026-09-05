import { muapi } from '../lib/muapi.js';
import { AuthModal } from './AuthModal.js';
import {
    loadDirectorProject,
    saveDirectorProject,
    clearDirectorProject,
    createEmptyDirectorProject,
} from '../lib/directorProject.js';
import {
    runPass1Screenplay,
    runPass2Shots,
    runPass3Polish,
    planShortFilm,
    bindCharacters,
} from '../lib/directorPlanner.js';
import { renderAllShots, renderShotStill, renderShotVideo } from '../lib/directorRender.js';
import { combineVideosLocally, copySceneUrls } from '../lib/clientVideoCombine.js';
import {
    DIRECTOR_DEFAULT_SHOT_COUNT,
    DIRECTOR_MAX_SHOT_COUNT,
    estimateDirectorCostUsd,
    resolveDirectorModels,
} from '../lib/directorModels.js';
import { getCharacters } from '../lib/characterLibrary.js';
import { t, tf } from '../lib/i18n.js';

function requireKey() {
    try {
        muapi.getKey();
        return true;
    } catch {
        document.body.appendChild(AuthModal());
        return false;
    }
}

export function DirectorStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg p-4 md:p-8';
    container.dataset.studio = 'director';

    const saved = loadDirectorProject();
    let state = saved || createEmptyDirectorProject();
    if (!state.shotCount) state.shotCount = DIRECTOR_DEFAULT_SHOT_COUNT;
    if (!state.qualityTier) state.qualityTier = 'budget';
    if (!state.aspectRatio) state.aspectRatio = '16:9';

    let isBusy = false;
    let cancelFlag = false;

    const hero = document.createElement('div');
    hero.className = 'max-w-4xl mx-auto mb-8 flex flex-wrap items-end justify-between gap-3';
    hero.innerHTML = `
        <div>
            <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">${t('director.title')}</h1>
            <p class="text-secondary text-sm">${t('director.subtitle')}</p>
        </div>
    `;
    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 text-muted hover:text-white';
    newBtn.textContent = t('director.newProject');
    hero.appendChild(newBtn);
    container.appendChild(hero);

    const card = document.createElement('div');
    card.className = 'max-w-4xl mx-auto bg-[#111]/90 border border-white/10 rounded-2xl p-6 flex flex-col gap-4';

    const prompt = document.createElement('textarea');
    prompt.className = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50';
    prompt.rows = 3;
    prompt.placeholder = t('director.promptPlaceholder');
    prompt.value = state.prompt || '';
    card.appendChild(prompt);

    const controls = document.createElement('div');
    controls.className = 'flex flex-wrap gap-3 items-center';

    const shotCount = document.createElement('select');
    shotCount.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
    for (let n = 3; n <= DIRECTOR_MAX_SHOT_COUNT; n++) {
        const o = document.createElement('option');
        o.value = String(n);
        o.textContent = tf('director.shotsOption', n);
        if (n === state.shotCount) o.selected = true;
        shotCount.appendChild(o);
    }

    const aspect = document.createElement('select');
    aspect.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
    ['16:9', '9:16', '1:1'].forEach((ar) => {
        const o = document.createElement('option');
        o.value = ar;
        o.textContent = ar;
        if (ar === state.aspectRatio) o.selected = true;
        aspect.appendChild(o);
    });

    const quality = document.createElement('select');
    quality.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm';
    [
        { id: 'budget', label: t('director.tierBudget') },
        { id: 'turbo', label: t('director.tierTurbo') },
        { id: 'quality', label: t('director.tierQuality') },
    ].forEach((q) => {
        const o = document.createElement('option');
        o.value = q.id;
        o.textContent = q.label;
        if (q.id === state.qualityTier) o.selected = true;
        quality.appendChild(o);
    });

    const costHint = document.createElement('span');
    costHint.className = 'text-xs text-muted';

    function updateCostHint() {
        const n = parseInt(shotCount.value, 10) || 4;
        const tier = quality.value;
        const usd = estimateDirectorCostUsd(n, tier);
        costHint.textContent = tf('director.costHint', usd, n);
    }
    updateCostHint();

    controls.append(
        labelWrap(t('director.length'), shotCount),
        labelWrap(t('director.aspect'), aspect),
        labelWrap(t('director.quality'), quality),
        costHint
    );
    card.appendChild(controls);

    const status = document.createElement('p');
    status.className = 'text-sm text-primary font-medium min-h-[1.5rem]';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = state.status || '';
    card.appendChild(status);

    const screenplayBox = document.createElement('div');
    screenplayBox.className = 'hidden flex flex-col gap-2';
    const screenplayLabel = document.createElement('div');
    screenplayLabel.className = 'text-xs text-muted font-bold uppercase tracking-widest';
    screenplayLabel.textContent = t('director.screenplay');
    const screenplayArea = document.createElement('textarea');
    screenplayArea.className = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-y min-h-[120px]';
    screenplayArea.value = state.screenplayText || '';
    screenplayBox.append(screenplayLabel, screenplayArea);
    card.appendChild(screenplayBox);

    const shotList = document.createElement('div');
    shotList.className = 'flex flex-col gap-3';
    card.appendChild(shotList);

    const combinedWrap = document.createElement('div');
    combinedWrap.className = 'flex flex-col gap-2';
    card.appendChild(combinedWrap);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex flex-wrap gap-3';

    const pass1Btn = mkBtn(t('director.pass1'), false);
    const pass2Btn = mkBtn(t('director.pass2'), false);
    const pass3Btn = mkBtn(t('director.pass3'), false);
    const renderBtn = mkBtn(t('director.renderAll'), true);
    const autoBtn = mkBtn(t('director.auto'), true);
    const combineBtn = mkBtn(t('director.combine'), true);
    const copyBtn = mkBtn(t('director.copyUrls'), false);
    combineBtn.disabled = true;
    copyBtn.disabled = true;
    pass2Btn.disabled = true;
    pass3Btn.disabled = true;
    renderBtn.disabled = true;

    btnRow.append(pass1Btn, pass2Btn, pass3Btn, renderBtn, autoBtn, combineBtn, copyBtn);
    card.appendChild(btnRow);
    container.appendChild(card);

    function labelWrap(label, el) {
        const w = document.createElement('div');
        w.className = 'flex flex-col gap-1';
        const l = document.createElement('span');
        l.className = 'text-[10px] text-muted font-bold uppercase tracking-widest';
        l.textContent = label;
        w.append(l, el);
        return w;
    }

    function mkBtn(text, primary) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = primary
            ? 'px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-black hover:bg-primary/90 disabled:opacity-50'
            : 'px-5 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white/5 disabled:opacity-50';
        b.textContent = text;
        return b;
    }

    function persist() {
        state.prompt = prompt.value.trim();
        state.shotCount = parseInt(shotCount.value, 10) || 4;
        state.aspectRatio = aspect.value;
        state.qualityTier = quality.value;
        state.screenplayText = screenplayArea.value;
        state.status = status.textContent || '';
        // Never persist blob combined URL
        const toSave = {
            ...state,
            combinedVideoUrl: state.combinedVideoUrl?.startsWith('blob:')
                ? null
                : state.combinedVideoUrl,
        };
        saveDirectorProject(toSave);
    }

    function setBusy(busy) {
        isBusy = busy;
        [pass1Btn, pass2Btn, pass3Btn, renderBtn, autoBtn, combineBtn, newBtn].forEach((b) => {
            b.disabled = busy;
        });
        if (!busy) syncButtonStates();
    }

    function syncButtonStates() {
        const hasScreenplay = !!(state.screenplayText || state.characters?.length);
        const hasShots = (state.shots || []).length > 0;
        const readyVideos = (state.videoUrls || []).filter(Boolean).length;
        pass2Btn.disabled = isBusy || !hasScreenplay;
        pass3Btn.disabled = isBusy || !hasShots;
        renderBtn.disabled = isBusy || !hasShots;
        combineBtn.disabled = isBusy || readyVideos < 2;
        copyBtn.disabled = readyVideos < 1;
        if (hasScreenplay) screenplayBox.classList.remove('hidden');
    }

    function showCombined() {
        combinedWrap.innerHTML = '';
        if (!state.combinedVideoUrl) return;
        const lbl = document.createElement('div');
        lbl.className = 'text-xs text-muted font-bold uppercase tracking-widest';
        lbl.textContent = t('director.combined');
        const v = document.createElement('video');
        v.controls = true;
        v.className = 'w-full rounded-xl border border-white/10 max-h-80 bg-black';
        v.src = state.combinedVideoUrl;
        const dl = document.createElement('a');
        dl.href = state.combinedVideoUrl;
        dl.download = 'director-short-film.mp4';
        dl.className = 'text-sm text-primary font-bold';
        dl.textContent = t('director.downloadCombined');
        combinedWrap.append(lbl, v, dl);
    }

    function renderShots() {
        shotList.innerHTML = '';
        const shots = state.shots || [];
        shots.forEach((shot, i) => {
            const row = document.createElement('div');
            row.className = 'border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 bg-black/30';

            const media = document.createElement('div');
            media.className = 'w-full md:w-48 flex flex-col gap-2 shrink-0';
            const stillUrl = state.stillUrls?.[i];
            const videoUrl = state.videoUrls?.[i];
            if (videoUrl) {
                const v = document.createElement('video');
                v.src = videoUrl;
                v.controls = true;
                v.className = 'w-full rounded-lg bg-black max-h-40';
                media.appendChild(v);
            } else if (stillUrl) {
                const img = document.createElement('img');
                img.src = stillUrl;
                img.alt = shot.id;
                img.className = 'w-full rounded-lg object-cover max-h-40';
                media.appendChild(img);
            } else {
                const ph = document.createElement('div');
                ph.className = 'w-full h-28 rounded-lg bg-white/5 flex items-center justify-center text-muted text-xs';
                ph.textContent = `#${i + 1}`;
                media.appendChild(ph);
            }

            const body = document.createElement('div');
            body.className = 'flex-1 flex flex-col gap-2 min-w-0';

            const title = document.createElement('div');
            title.className = 'text-sm font-bold text-white';
            title.textContent = `${shot.id} · ${shot.camera || ''}`;
            body.appendChild(title);

            const imgPrompt = document.createElement('textarea');
            imgPrompt.className = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs resize-none';
            imgPrompt.rows = 2;
            imgPrompt.placeholder = t('director.imagePrompt');
            imgPrompt.value = shot.imagePrompt || '';
            imgPrompt.oninput = () => {
                state.shots[i].imagePrompt = imgPrompt.value;
                persist();
            };

            const visPrompt = document.createElement('textarea');
            visPrompt.className = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs resize-none';
            visPrompt.rows = 2;
            visPrompt.placeholder = t('director.visualPrompt');
            visPrompt.value = shot.visualPrompt || '';
            visPrompt.oninput = () => {
                state.shots[i].visualPrompt = visPrompt.value;
                persist();
            };

            const dialogue = document.createElement('input');
            dialogue.className = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs';
            dialogue.placeholder = t('director.dialogue');
            dialogue.value = shot.dialogue || '';
            dialogue.oninput = () => {
                state.shots[i].dialogue = dialogue.value;
                persist();
            };

            const meta = document.createElement('div');
            meta.className = 'text-[11px] text-muted';
            meta.textContent = shot.error
                ? `✗ ${shot.error}`
                : (shot.status || 'planned');

            const actions = document.createElement('div');
            actions.className = 'flex flex-wrap gap-2';
            const regenStill = mkBtn(t('director.regenStill'), false);
            regenStill.className = 'px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50';
            const regenClip = mkBtn(t('director.regenClip'), false);
            regenClip.className = 'px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50';
            const skipBtn = mkBtn(t('director.skip'), false);
            skipBtn.className = 'px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-muted hover:text-white disabled:opacity-50';

            regenStill.onclick = async () => {
                if (!requireKey() || isBusy) return;
                setBusy(true);
                status.textContent = tf('director.statusStill', i + 1, shots.length);
                const models = resolveDirectorModels(state.qualityTier);
                const res = await renderShotStill(state.shots[i], {
                    models,
                    aspectRatio: state.aspectRatio,
                    characterBindings: state.characterBindings || [],
                });
                if (!state.stillUrls) state.stillUrls = [];
                state.stillUrls[i] = res.url;
                state.shots[i].error = res.error;
                state.shots[i].status = res.error ? 'error' : 'still_done';
                persist();
                renderShots();
                status.textContent = res.error ? `✗ ${res.error}` : tf('director.statusStillDone', i + 1);
                setBusy(false);
            };

            regenClip.onclick = async () => {
                if (!requireKey() || isBusy) return;
                setBusy(true);
                status.textContent = tf('director.statusClip', i + 1, shots.length);
                const models = resolveDirectorModels(state.qualityTier);
                const res = await renderShotVideo(state.shots[i], state.stillUrls?.[i], {
                    models,
                    aspectRatio: state.aspectRatio,
                });
                if (!state.videoUrls) state.videoUrls = [];
                state.videoUrls[i] = res.url;
                state.shots[i].error = res.error;
                state.shots[i].status = res.error ? 'error' : 'done';
                persist();
                renderShots();
                syncButtonStates();
                status.textContent = res.error ? `✗ ${res.error}` : tf('director.statusClipDone', i + 1);
                setBusy(false);
            };

            skipBtn.onclick = () => {
                if (!state.videoUrls) state.videoUrls = [];
                if (!state.stillUrls) state.stillUrls = [];
                state.videoUrls[i] = null;
                state.shots[i].status = 'skipped';
                persist();
                renderShots();
                syncButtonStates();
            };

            actions.append(regenStill, regenClip, skipBtn);
            body.append(imgPrompt, visPrompt, dialogue, meta, actions);
            row.append(media, body);
            shotList.appendChild(row);
        });
        showCombined();
        syncButtonStates();
    }

    prompt.oninput = () => persist();
    shotCount.onchange = () => { updateCostHint(); persist(); };
    aspect.onchange = () => persist();
    quality.onchange = () => { updateCostHint(); persist(); };
    screenplayArea.oninput = () => persist();

    newBtn.onclick = () => {
        if (isBusy) return;
        clearDirectorProject();
        state = createEmptyDirectorProject();
        prompt.value = '';
        shotCount.value = String(DIRECTOR_DEFAULT_SHOT_COUNT);
        aspect.value = '16:9';
        quality.value = 'budget';
        screenplayArea.value = '';
        screenplayBox.classList.add('hidden');
        status.textContent = '';
        state.shots = [];
        state.stillUrls = [];
        state.videoUrls = [];
        state.combinedVideoUrl = null;
        updateCostHint();
        renderShots();
    };

    pass1Btn.onclick = async () => {
        if (!requireKey() || isBusy) return;
        const p = prompt.value.trim();
        if (!p) { alert(t('director.needPrompt')); return; }
        setBusy(true);
        status.textContent = t('director.statusPass1');
        try {
            const { screenplay, raw } = await runPass1Screenplay(muapi, {
                prompt: p,
                shotCount: parseInt(shotCount.value, 10) || 4,
                libraryCharacters: getCharacters(),
            });
            state.characters = screenplay.characters;
            state.characterBindings = bindCharacters(screenplay);
            state.screenplayText = raw;
            screenplayArea.value = raw;
            screenplayBox.classList.remove('hidden');
            state.pass = 1;
            status.textContent = tf('director.statusPass1Done', screenplay.title, screenplay.characters.length);
            persist();
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist();
        } finally {
            setBusy(false);
        }
    };

    pass2Btn.onclick = async () => {
        if (!requireKey() || isBusy) return;
        setBusy(true);
        status.textContent = t('director.statusPass2');
        try {
            const screenplay = {
                title: 'Short Film',
                logline: '',
                characters: state.characters || [],
                scenesText: screenplayArea.value || state.screenplayText,
            };
            const { shots, usedFallback } = await runPass2Shots(muapi, {
                screenplay,
                shotCount: parseInt(shotCount.value, 10) || 4,
            });
            state.shots = shots;
            state.stillUrls = [];
            state.videoUrls = [];
            state.combinedVideoUrl = null;
            state.pass = 2;
            status.textContent = usedFallback
                ? tf('director.statusPass2Fallback', shots.length)
                : tf('director.statusPass2Done', shots.length);
            persist();
            renderShots();
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist();
        } finally {
            setBusy(false);
        }
    };

    pass3Btn.onclick = async () => {
        if (!requireKey() || isBusy) return;
        setBusy(true);
        status.textContent = t('director.statusPass3');
        try {
            const screenplay = {
                title: 'Short Film',
                logline: '',
                characters: state.characters || [],
                scenesText: screenplayArea.value || state.screenplayText,
            };
            const { shots, models, usedFallback } = await runPass3Polish(muapi, {
                shots: state.shots,
                screenplay,
                qualityTier: quality.value,
            });
            state.shots = shots;
            state.modelIds = models;
            state.pass = 3;
            status.textContent = usedFallback
                ? t('director.statusPass3Fallback')
                : t('director.statusPass3Done');
            persist();
            renderShots();
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist();
        } finally {
            setBusy(false);
        }
    };

    async function doRender() {
        if (!requireKey() || isBusy) return;
        if (!(state.shots || []).length) return;
        cancelFlag = false;
        setBusy(true);
        state.combinedVideoUrl = null;
        try {
            const result = await renderAllShots(state.shots, {
                qualityTier: quality.value,
                aspectRatio: aspect.value,
                characterBindings: state.characterBindings || [],
                existingStills: state.stillUrls || [],
                existingVideos: state.videoUrls || [],
                skipExisting: false,
                shouldCancel: () => cancelFlag,
                onProgress: (msg) => { status.textContent = `⏳ ${msg}`; },
                onShotUpdate: (index, upd) => {
                    if (!state.stillUrls) state.stillUrls = [];
                    if (!state.videoUrls) state.videoUrls = [];
                    if (upd.stillUrl !== undefined) state.stillUrls[index] = upd.stillUrl;
                    if (upd.videoUrl !== undefined) state.videoUrls[index] = upd.videoUrl;
                    if (state.shots[index]) {
                        state.shots[index].status = upd.status;
                        state.shots[index].error = upd.error || null;
                    }
                    persist();
                    renderShots();
                },
            });
            state.stillUrls = result.stillUrls;
            state.videoUrls = result.videoUrls;
            state.modelIds = result.models;
            const ok = result.videoUrls.filter(Boolean).length;
            status.textContent = tf('director.statusRenderDone', ok, state.shots.length);
            persist();
            renderShots();
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist();
        } finally {
            setBusy(false);
        }
    }

    renderBtn.onclick = () => doRender();

    autoBtn.onclick = async () => {
        if (!requireKey() || isBusy) return;
        const p = prompt.value.trim();
        if (!p) { alert(t('director.needPrompt')); return; }

        const n = parseInt(shotCount.value, 10) || 4;
        const usd = estimateDirectorCostUsd(n, quality.value);
        if (!confirm(tf('director.autoConfirm', n, usd))) return;

        setBusy(true);
        status.textContent = t('director.statusAutoPlan');
        try {
            const planned = await planShortFilm(muapi, {
                prompt: p,
                shotCount: n,
                qualityTier: quality.value,
                libraryCharacters: getCharacters(),
            });
            state.characters = planned.screenplay.characters;
            state.characterBindings = planned.characterBindings;
            state.screenplayText = planned.screenplayRaw;
            screenplayArea.value = planned.screenplayRaw;
            screenplayBox.classList.remove('hidden');
            state.shots = planned.shots;
            state.modelIds = planned.models;
            state.stillUrls = [];
            state.videoUrls = [];
            state.combinedVideoUrl = null;
            state.pass = 3;
            persist();
            renderShots();
            status.textContent = t('director.statusAutoRender');
            setBusy(false);
            await doRender();
            if ((state.videoUrls || []).filter(Boolean).length >= 2) {
                await runCombine();
            }
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist();
            setBusy(false);
        }
    };

    async function runCombine() {
        const urls = (state.videoUrls || []).filter(Boolean);
        if (urls.length < 2) return;
        setBusy(true);
        status.textContent = t('director.statusCombine');
        try {
            state.combinedVideoUrl = await combineVideosLocally(urls, {
                onStatus: (m) => { status.textContent = `⏳ ${m}`; },
            });
            showCombined();
            status.textContent = t('director.statusCombineDone');
            persist();
        } catch (e) {
            status.textContent = tf('director.statusCombineFail', e.message);
            persist();
        } finally {
            setBusy(false);
            syncButtonStates();
        }
    }

    combineBtn.onclick = () => runCombine();
    copyBtn.onclick = () => {
        const urls = (state.videoUrls || []).filter(Boolean);
        if (copySceneUrls(urls)) {
            status.textContent = tf('director.statusCopied', urls.length);
        }
    };

    // Restore UI from saved project
    if (state.screenplayText) screenplayBox.classList.remove('hidden');
    renderShots();

    return container;
}
