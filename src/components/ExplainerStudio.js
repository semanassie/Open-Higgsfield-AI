import { muapi } from '../lib/muapi.js';
import { loadExplainerSession, saveExplainerSession, clearExplainerSession } from '../lib/explainerSession.js';
import { combineVideosLocally, copySceneUrls } from '../lib/clientVideoCombine.js';
import { AuthModal } from './AuthModal.js';
import { EXPLAINER_DEFAULT_T2V } from '../lib/phase2Models.js';

function parseScenesFromLLM(text) {
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const arr = JSON.parse(jsonMatch[0]);
            if (Array.isArray(arr) && arr.length) return arr;
        }
    } catch { /* fall through */ }

    return text.split(/\n\n+/).filter(Boolean).slice(0, 8).map((block, i) => {
        const lines = block.split('\n').filter(Boolean);
        return {
            title: lines[0]?.replace(/^\d+[\.\)]\s*/, '') || `Scene ${i + 1}`,
            visual: lines[1] || lines[0] || block,
            narration: lines[2] || lines[1] || lines[0] || block,
        };
    });
}

function persist(state, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status) {
    const combined = combinedVideoUrl?.startsWith('blob:') ? null : combinedVideoUrl;
    saveExplainerSession({
        topic: topic.value.trim(),
        sceneCount: parseInt(sceneCount.value, 10) || 4,
        scenes,
        sceneVideos,
        combinedVideoUrl: combined,
        status: status.textContent || '',
    });
}

export function ExplainerStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg p-4 md:p-8';

    const saved = loadExplainerSession();
    let scenes = saved?.scenes?.length ? saved.scenes : [];
    let sceneVideos = saved?.sceneVideos?.length ? saved.sceneVideos : [];
    let combinedVideoUrl = saved?.combinedVideoUrl?.startsWith('blob:') ? null : (saved?.combinedVideoUrl || null);

    const hero = document.createElement('div');
    hero.className = 'max-w-4xl mx-auto mb-8 flex flex-wrap items-end justify-between gap-3';
    hero.innerHTML = `
        <div>
            <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">Explainer Studio</h1>
            <p class="text-secondary text-sm">Topic → AI script → scene videos → optional narration & combine</p>
        </div>
    `;
    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'px-3 py-2 text-xs font-bold rounded-lg border border-white/10 text-muted hover:text-white';
    newBtn.textContent = '+ New project';
    hero.appendChild(newBtn);
    container.appendChild(hero);

    const card = document.createElement('div');
    card.className = 'max-w-4xl mx-auto bg-[#111]/90 border border-white/10 rounded-2xl p-6 flex flex-col gap-4';

    const topic = document.createElement('textarea');
    topic.className = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none';
    topic.rows = 3;
    topic.placeholder = 'e.g. "How solar panels work" or "3 tips for better sleep"';
    topic.value = saved?.topic || '';
    card.appendChild(topic);

    const sceneCount = document.createElement('select');
    sceneCount.className = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-40';
    [3, 4, 5, 6].forEach(n => {
        const o = document.createElement('option');
        o.value = String(n);
        o.textContent = `${n} scenes`;
        if (n === (saved?.sceneCount || 4)) o.selected = true;
        sceneCount.appendChild(o);
    });
    const countRow = document.createElement('div');
    countRow.className = 'flex items-center gap-3';
    countRow.innerHTML = '<span class="text-xs text-muted font-bold uppercase tracking-widest">Length</span>';
    countRow.appendChild(sceneCount);
    card.appendChild(countRow);

    const status = document.createElement('p');
    status.className = 'text-sm text-primary font-medium min-h-[1.5rem]';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (saved?.status) {
        status.textContent = saved.status;
    }
    card.appendChild(status);

    const combinedWrap = document.createElement('div');
    combinedWrap.className = 'flex flex-col gap-2';
    card.appendChild(combinedWrap);

    const sceneList = document.createElement('div');
    sceneList.className = 'flex flex-col gap-3';
    card.appendChild(sceneList);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex flex-wrap gap-3';

    const scriptBtn = document.createElement('button');
    scriptBtn.className = 'px-5 py-2.5 rounded-xl border border-white/10 text-white text-sm font-bold hover:bg-white/5';
    scriptBtn.textContent = '📝 Generate Script';

    const renderBtn = document.createElement('button');
    renderBtn.className = 'px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-black hover:bg-primary/90 disabled:opacity-50';
    renderBtn.textContent = '🎬 Render All Scenes';
    renderBtn.disabled = true;

    const combineBtn = document.createElement('button');
    combineBtn.className = 'px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-black hover:bg-primary/90 disabled:opacity-50';
    combineBtn.textContent = '🔗 Combine Videos';
    combineBtn.disabled = true;

    const copyUrlsBtn = document.createElement('button');
    copyUrlsBtn.className = 'px-5 py-2.5 rounded-xl border border-white/10 text-muted text-sm font-bold hover:text-white disabled:opacity-50';
    copyUrlsBtn.textContent = '📋 Copy Scene URLs';
    copyUrlsBtn.disabled = true;

    let isCombining = false;

    function showCombinedVideo() {
        combinedWrap.innerHTML = '';
        if (!combinedVideoUrl) return;
        const lbl = document.createElement('p');
        lbl.className = 'text-xs text-primary font-bold uppercase tracking-widest';
        lbl.textContent = 'Combined explainer';
        const v = document.createElement('video');
        v.src = combinedVideoUrl;
        v.controls = true;
        v.className = 'w-full rounded-xl';
        const dl = document.createElement('a');
        dl.href = combinedVideoUrl;
        dl.download = 'explainer-combined.mp4';
        dl.className = 'text-xs text-primary font-bold hover:underline';
        dl.textContent = '⬇ Download combined video';
        combinedWrap.append(lbl, v, dl);
    }

    function renderScenes() {
        sceneList.innerHTML = '';
        scenes.forEach((sc, i) => {
            const box = document.createElement('div');
            box.className = 'border border-white/10 rounded-xl p-4 bg-black/30';
            box.innerHTML = `
                <div class="text-xs text-primary font-bold mb-1">Scene ${i + 1}</div>
                <div class="text-white font-medium text-sm mb-2">${sc.title || `Scene ${i + 1}`}</div>
                <div class="text-secondary text-xs mb-1"><strong>Visual:</strong> ${sc.visual}</div>
                <div class="text-secondary text-xs"><strong>Narration:</strong> ${sc.narration}</div>
            `;
            if (sceneVideos[i]) {
                const v = document.createElement('video');
                v.src = sceneVideos[i];
                v.controls = true;
                v.className = 'w-full rounded-lg mt-2 max-h-40';
                box.appendChild(v);
            }
            sceneList.appendChild(box);
        });
        renderBtn.disabled = scenes.length === 0;
        const ready = sceneVideos.filter(Boolean).length;
        combineBtn.disabled = ready < 2 || isCombining;
        copyUrlsBtn.disabled = ready < 1;
        showCombinedVideo();
    }

    topic.oninput = () => persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
    sceneCount.onchange = () => persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);

    newBtn.onclick = () => {
        if (!confirm('Start a new explainer project? Current script and videos will be cleared.')) return;
        clearExplainerSession();
        scenes = [];
        sceneVideos = [];
        combinedVideoUrl = null;
        topic.value = '';
        sceneCount.value = '4';
        status.textContent = '';
        renderScenes();
    };

    scriptBtn.onclick = async () => {
        const t = topic.value.trim();
        if (!t) { alert('Enter a topic.'); return; }
        try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }

        scriptBtn.disabled = true;
        status.textContent = '⏳ Writing script with AI…';
        sceneVideos = [];
        combinedVideoUrl = null;

        try {
            const n = parseInt(sceneCount.value, 10);
            const llmPrompt = `Create an explainer video script about: "${t}"
Return ONLY a JSON array of exactly ${n} objects. Each object: {"title":"short title","visual":"cinematic video prompt for this scene","narration":"voiceover text 1-2 sentences"}
Style: educational, clear, engaging. Visual prompts should be concrete and filmable.`;
            const raw = await muapi.callLLM(llmPrompt);
            scenes = parseScenesFromLLM(raw);
            if (!scenes.length) throw new Error('Could not parse script — try again.');
            status.textContent = `✓ ${scenes.length} scenes ready. Click Render All Scenes.`;
            renderScenes();
            persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
        } catch (e) {
            status.textContent = `✗ ${e.message}`;
            persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
        } finally {
            scriptBtn.disabled = false;
        }
    };

    renderBtn.onclick = async () => {
        try { muapi.getKey(); } catch { document.body.appendChild(AuthModal()); return; }
        renderBtn.disabled = true;
        sceneVideos = new Array(scenes.length).fill(null);
        combinedVideoUrl = null;

        for (let i = 0; i < scenes.length; i++) {
            status.textContent = `⏳ Rendering scene ${i + 1}/${scenes.length}…`;
            try {
                const res = await muapi.generateVideo({
                    model: EXPLAINER_DEFAULT_T2V,
                    prompt: scenes[i].visual,
                    aspect_ratio: '16:9',
                    duration: 5,
                    resolution: '720p',
                });
                sceneVideos[i] = res.url || res.outputs?.[0];
            } catch (e) {
                console.error(`Scene ${i + 1} failed:`, e);
            }
            renderScenes();
            persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
        }
        status.textContent = `✓ Rendered ${sceneVideos.filter(Boolean).length}/${scenes.length} scenes.`;
        renderBtn.disabled = false;
        combineBtn.disabled = sceneVideos.filter(Boolean).length < 2;
        persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
    };

    copyUrlsBtn.onclick = () => {
        const urls = sceneVideos.filter(Boolean);
        if (!urls.length) return;
        copySceneUrls(urls);
        status.textContent = `✓ Copied ${urls.length} scene URL(s) to clipboard.`;
        persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
    };

    async function runLocalCombine() {
        if (isCombining) return;
        const urls = sceneVideos.filter(Boolean);
        if (urls.length < 2) return;
        isCombining = true;
        combineBtn.disabled = true;
        status.textContent = '⏳ Starting browser combine…';
        try {
            combinedVideoUrl = await combineVideosLocally(urls, {
                onStatus: (m) => { status.textContent = `⏳ ${m}`; },
            });
            showCombinedVideo();
            status.textContent = '✓ Combined explainer ready! (stitched in browser)';
            persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
        } catch (e) {
            status.textContent = `✗ ${e.message} — try Copy Scene URLs and edit in CapCut/DaVinci.`;
            persist(null, topic, sceneCount, scenes, sceneVideos, combinedVideoUrl, status);
        } finally {
            isCombining = false;
            renderScenes();
        }
    }

    combineBtn.onclick = () => runLocalCombine();

    btnRow.append(scriptBtn, renderBtn, combineBtn, copyUrlsBtn);
    card.appendChild(btnRow);
    container.appendChild(card);

    renderScenes();
    return container;
}
