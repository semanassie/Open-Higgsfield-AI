import { isLocalAIAvailable, localAI } from '../lib/localInferenceClient.js';
import { vork } from '../lib/vorkClient.js';
import { blender } from '../lib/blenderClient.js';
import { planBlenderScene } from '../lib/blenderPlanClient.js';
import { t, tf } from '../lib/i18n.js';

export function VfxStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto bg-app-bg text-white';
    container.dataset.studio = 'vfx';

    const inner = document.createElement('div');
    inner.className = 'max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6';
    container.appendChild(inner);

    inner.innerHTML = `
        <div class="flex flex-col gap-2">
            <div class="text-[11px] font-bold uppercase tracking-widest text-secondary">${t('vfx.kicker')}</div>
            <h1 class="text-3xl font-bold tracking-tight">${t('vfx.title')}</h1>
            <p class="text-secondary text-sm">${t('vfx.subtitle')}</p>
        </div>
        <div id="vfx-status" class="text-sm text-white/70"></div>
        <div id="vfx-path" class="hidden flex gap-2"></div>
        <pre id="vfx-scene" class="text-xs leading-relaxed rounded-xl border border-white/10 bg-black/40 p-4 overflow-auto max-h-80 text-white/80"></pre>
        <div id="vfx-result" class="hidden"></div>
        <div class="flex flex-wrap gap-2">
            <button id="vfx-setup" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80">${t('vfx.setup')}</button>
            <button id="vfx-import" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80">${t('vfx.import')}</button>
            <button id="vfx-previs" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.previs')}</button>
            <button id="vfx-final" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.final')}</button>
            <button id="vfx-clip" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.clip')}</button>
            <button id="vfx-cancel" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/70">${t('common.cancel')}</button>
        </div>
        <div id="vfx-runpod" class="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
            <div class="text-[11px] font-bold uppercase tracking-widest text-secondary">${t('vfx.runpodTitle')}</div>
            <p class="text-xs text-white/70 m-0">${t('vfx.runpodHint')}</p>
            <div id="vfx-runpod-balance" class="text-sm text-white/80"></div>
            <div id="vfx-runpod-keyrow" class="hidden flex gap-2"></div>
            <div id="vfx-runpod-confirm" class="hidden rounded-lg border border-white/10 bg-black/30 p-3 flex flex-col gap-2"></div>
            <div class="flex flex-wrap gap-2">
                <button id="vfx-runpod-previs" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.runpodPrevis')}</button>
                <button id="vfx-runpod-final" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.runpodFinal')}</button>
                <button id="vfx-runpod-clip" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.runpodClip')}</button>
                <button id="vfx-runpod-billing" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80">${t('vfx.runpodTopUp')}</button>
            </div>
        </div>
        <div id="vfx-blender" class="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
            <div class="text-[11px] font-bold uppercase tracking-widest text-secondary">${t('vfx.blenderTitle')}</div>
            <p class="text-xs text-white/70 m-0">${t('vfx.blenderHint')}</p>
            <textarea id="vfx-blender-prompt" rows="2" placeholder="${t('vfx.blenderPromptPlaceholder')}"
                class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none resize-y min-h-[2.5rem]"></textarea>
            <div id="vfx-blender-status" class="text-sm text-white/80"></div>
            <div id="vfx-blender-path" class="hidden flex gap-2"></div>
            <div id="vfx-blender-confirm" class="hidden rounded-lg border border-white/10 bg-black/30 p-3 flex flex-col gap-2"></div>
            <div class="flex flex-wrap gap-2">
                <button id="vfx-blender-render" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.blenderRender')}</button>
                <button id="vfx-blender-build" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80">${t('vfx.blenderBuild')}</button>
                <button id="vfx-blender-cancel" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/70">${t('common.cancel')}</button>
            </div>
            <details id="vfx-blender-settings" class="rounded-lg border border-white/10 bg-black/20 p-3">
                <summary class="text-xs font-bold text-white/80 cursor-pointer">${t('vfx.blenderSettings')}</summary>
                <div class="mt-3 flex flex-col gap-2">
                    <label class="text-[11px] text-white/60">${t('vfx.blenderWidth')}
                        <input id="vfx-blender-width" type="number" min="64" max="4096" step="1"
                            class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
                    </label>
                    <label class="text-[11px] text-white/60">${t('vfx.blenderHeight')}
                        <input id="vfx-blender-height" type="number" min="64" max="4096" step="1"
                            class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
                    </label>
                    <label class="text-[11px] text-white/60">${t('vfx.blenderSamples')}
                        <input id="vfx-blender-samples" type="number" min="1" max="4096" step="1"
                            class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
                    </label>
                    <button id="vfx-blender-save-settings" class="self-start px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.blenderSaveSettings')}</button>
                    <div id="vfx-blender-keyrow" class="hidden flex gap-2"></div>
                </div>
            </details>
        </div>
    `;

    const statusEl = inner.querySelector('#vfx-status');
    const pathRow = inner.querySelector('#vfx-path');
    const sceneEl = inner.querySelector('#vfx-scene');
    const resultEl = inner.querySelector('#vfx-result');
    const setupBtn = inner.querySelector('#vfx-setup');
    const importBtn = inner.querySelector('#vfx-import');
    const previsBtn = inner.querySelector('#vfx-previs');
    const finalBtn = inner.querySelector('#vfx-final');
    const clipBtn = inner.querySelector('#vfx-clip');
    const cancelBtn = inner.querySelector('#vfx-cancel');
    const runpodBalance = inner.querySelector('#vfx-runpod-balance');
    const runpodKeyRow = inner.querySelector('#vfx-runpod-keyrow');
    const runpodConfirm = inner.querySelector('#vfx-runpod-confirm');
    const runpodPrevis = inner.querySelector('#vfx-runpod-previs');
    const runpodFinal = inner.querySelector('#vfx-runpod-final');
    const runpodClip = inner.querySelector('#vfx-runpod-clip');
    const runpodBilling = inner.querySelector('#vfx-runpod-billing');
    const blenderPromptEl = inner.querySelector('#vfx-blender-prompt');
    const blenderStatusEl = inner.querySelector('#vfx-blender-status');
    const blenderPathRow = inner.querySelector('#vfx-blender-path');
    const blenderConfirm = inner.querySelector('#vfx-blender-confirm');
    const blenderRenderBtn = inner.querySelector('#vfx-blender-render');
    const blenderBuildBtn = inner.querySelector('#vfx-blender-build');
    const blenderCancelBtn = inner.querySelector('#vfx-blender-cancel');
    const blenderWidth = inner.querySelector('#vfx-blender-width');
    const blenderHeight = inner.querySelector('#vfx-blender-height');
    const blenderSamples = inner.querySelector('#vfx-blender-samples');
    const blenderSaveSettings = inner.querySelector('#vfx-blender-save-settings');
    const blenderKeyRow = inner.querySelector('#vfx-blender-keyrow');
    const actionBtns = [
        setupBtn, importBtn, previsBtn, finalBtn, clipBtn,
        runpodPrevis, runpodFinal, runpodClip,
        blenderRenderBtn, blenderBuildBtn, blenderSaveSettings,
    ];

    const bridgeMode = !isLocalAIAvailable();

    let rendering = false;
    let plannedScene = null;

    const resolveBlenderScene = async () => {
        blenderStatusEl.textContent = t('vfx.blenderPlanning');
        let fallback = null;
        try {
            fallback = await vork.getScene();
        } catch {
            fallback = null;
        }
        const planned = await planBlenderScene(blenderPromptEl.value, { fallbackScene: fallback });
        plannedScene = planned.scene;
        if (planned.source === 'llm') {
            blenderStatusEl.textContent = t('vfx.blenderPlanReady');
            sceneEl.textContent = JSON.stringify(planned.scene, null, 2);
        } else if (planned.source === 'prompt-empty') {
            blenderStatusEl.textContent = t('vfx.blenderPlanSkipped');
        } else {
            blenderStatusEl.textContent = tf(
                'vfx.blenderPlanFallback',
                planned.error || t('vfx.blenderPlanFallbackGeneric'),
            );
            sceneEl.textContent = JSON.stringify(planned.scene, null, 2);
        }
        return planned.scene;
    };

    const setBusy = (busy) => {
        rendering = busy;
        actionBtns.forEach((btn) => { btn.disabled = busy; });
    };

    const showScene = async () => {
        const scene = await vork.getScene();
        sceneEl.textContent = JSON.stringify(scene, null, 2);
    };

    const showStatus = async () => {
        const status = await vork.getStatus();
        if (status.desktopOnly) {
            statusEl.textContent = t('vfx.desktopOnly');
            return;
        }
        if (!status.found) {
            statusEl.textContent = t('vfx.binaryMissing');
            pathRow.classList.remove('hidden');
            showPlaceholder(t('vfx.binaryMissing'));
            return;
        }
        pathRow.classList.add('hidden');
        const probe = await vork.probe();
        if (!probe.ok) {
            statusEl.textContent = tf('vfx.binaryUnusable', probe.error || status.binaryPath);
            return;
        }
        statusEl.textContent = status.setupComplete
            ? `${tf('vfx.binaryFound', probe.version || status.binaryPath)} · ${t('vfx.setupDone')}`
            : tf('vfx.binaryFound', probe.version || status.binaryPath);
    };

    pathRow.innerHTML = `
        <input id="vfx-binary" type="text" placeholder="${t('vfx.pathPlaceholder')}"
            class="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
        <button id="vfx-save-path" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.savePath')}</button>
    `;
    pathRow.querySelector('#vfx-save-path').onclick = async () => {
        const value = pathRow.querySelector('#vfx-binary').value;
        try {
            await vork.setBinaryPath(value);
            await showStatus();
        } catch (err) {
            statusEl.textContent = err.message || String(err);
        }
    };

    const showPlaceholder = (message) => {
        resultEl.innerHTML = '';
        const card = document.createElement('div');
        card.dataset.placeholder = 'render';
        card.className = 'rounded-xl border border-dashed border-white/15 bg-white/5 px-5 py-6 flex flex-col gap-2';
        const title = document.createElement('div');
        title.className = 'text-sm font-bold text-white';
        title.textContent = t('vfx.outputMissingTitle');
        const body = document.createElement('p');
        body.className = 'text-xs leading-relaxed text-white/70 m-0 whitespace-pre-wrap';
        body.textContent = message || t('vfx.outputMissing');
        card.append(title, body);
        resultEl.appendChild(card);
        resultEl.classList.remove('hidden');
    };

    const showResult = (result) => {
        if (!result || result.missing || (result.kind !== 'video' && !result.url)) {
            showPlaceholder(result?.message || t('vfx.outputMissing'));
            statusEl.textContent = result?.message || t('vfx.outputMissing');
            return;
        }
        resultEl.innerHTML = '';
        if (result.kind === 'video') {
            const video = document.createElement('video');
            video.controls = true;
            video.className = 'w-full rounded-xl border border-white/10';
            video.src = result.fileUrl;
            resultEl.appendChild(video);
            const open = document.createElement('button');
            open.className = 'mt-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80';
            open.textContent = t('vfx.openClip');
            open.onclick = () => vork.openOutput(result.outPath);
            resultEl.appendChild(open);
            statusEl.textContent = t('vfx.clipDone');
        } else {
            const img = document.createElement('img');
            img.src = result.url;
            img.alt = t('vfx.title');
            img.className = 'w-full rounded-xl border border-white/10';
            resultEl.appendChild(img);
            statusEl.textContent = t('vfx.done');
        }
        resultEl.classList.remove('hidden');
    };

    const renderJob = async (params) => {
        if (rendering && !params.remote) return;
        setBusy(true);
        runpodConfirm.classList.add('hidden');
        statusEl.textContent = t('vfx.rendering');
        resultEl.classList.add('hidden');
        try {
            const result = params.remote
                ? await vork.renderRunpod({
                    profile: params.profile,
                    output: params.output,
                    frameStart: params.frameStart,
                    frameEnd: params.frameEnd,
                })
                : await vork.render(params);
            showResult(result);
            await showScene();
            await showStatus();
            if (params.remote) await refreshRunpod();
        } catch (err) {
            const message = err.message || String(err);
            statusEl.textContent = message;
            showPlaceholder(message);
        } finally {
            setBusy(false);
        }
    };

    setupBtn.onclick = async () => {
        if (rendering) return;
        setBusy(true);
        statusEl.textContent = t('vfx.setup');
        try {
            await vork.setup();
            statusEl.textContent = t('vfx.setupDone');
            await showStatus();
        } catch (err) {
            statusEl.textContent = err.message || String(err);
        } finally {
            setBusy(false);
        }
    };
    importBtn.onclick = async () => {
        if (rendering) return;
        if (bridgeMode) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.glb,model/gltf-binary';
            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                setBusy(true);
                try {
                    const imported = await vork.importGltfFile(file, file.name);
                    if (imported && imported.cancelled) {
                        statusEl.textContent = t('vfx.cancelled');
                    } else {
                        statusEl.textContent = t('vfx.imported');
                        await showScene();
                    }
                } catch (err) {
                    statusEl.textContent = err.message || String(err);
                } finally {
                    setBusy(false);
                }
            };
            input.click();
            return;
        }
        setBusy(true);
        try {
            const imported = await vork.importGltf();
            if (imported && imported.cancelled) {
                statusEl.textContent = t('vfx.cancelled');
            } else {
                statusEl.textContent = t('vfx.imported');
                await showScene();
            }
        } catch (err) {
            statusEl.textContent = err.message || String(err);
        } finally {
            setBusy(false);
        }
    };
    previsBtn.onclick = () => renderJob({ profile: 'std/previs' });
    finalBtn.onclick = () => renderJob({ profile: 'std/final' });
    clipBtn.onclick = () => renderJob({ profile: 'std/final', output: 'mp4' });
    runpodPrevis.onclick = () => askRunpod('std/previs');
    runpodFinal.onclick = () => askRunpod('std/final');
    runpodClip.onclick = () => askRunpod('std/final', 'mp4');
    cancelBtn.onclick = () => {
        vork.cancel();
        setBusy(false);
        statusEl.textContent = t('vfx.cancelled');
    };

    const progressText = (data) => {
        const seconds = Math.round((data.elapsedMs || 0) / 1000);
        const key = {
            setup: 'vfx.setupFor',
            rent: 'vfx.runpodRenting',
            wait: 'vfx.runpodWaiting',
            install: 'vfx.runpodInstalling',
            transfer: 'vfx.runpodTransfer',
            fetch: 'vfx.runpodFetch',
            shutdown: 'vfx.runpodStopping',
        }[data.task];
        if (key) return tf(key, seconds);
        return tf('vfx.renderingFor', seconds);
    };

    const showRunpodBalance = (quote) => {
        runpodBalance.classList.remove('text-amber-300');
        if (!quote || quote.ok === false) {
            runpodBalance.textContent = quote?.error || t('vfx.runpodBalanceUnknown');
            return;
        }
        const amount = `${quote.amount} ${quote.currency || 'USD'}`;
        const price = quote.hourlyPrice == null
            ? t('vfx.runpodPriceUnknown')
            : tf('vfx.runpodPrice', quote.hourlyPrice, quote.currency || 'USD');
        runpodBalance.textContent = `${tf('vfx.runpodBalance', amount)} · ${price}`;
        if (quote.low) runpodBalance.classList.add('text-amber-300');
    };

    const refreshRunpod = async () => {
        const status = await vork.runpodStatus();
        if (!status.encryptionAvailable) {
            runpodBalance.textContent = t('vfx.runpodNoEncryption');
            runpodPrevis.disabled = true;
            runpodFinal.disabled = true;
            runpodClip.disabled = true;
            runpodKeyRow.classList.add('hidden');
            return;
        }
        runpodKeyRow.classList.remove('hidden');
        if (!status.hasKey) {
            runpodBalance.textContent = t('vfx.runpodKeyMissing');
            return;
        }
        const quote = await vork.runpodQuote();
        showRunpodBalance(quote);
        if (status.publicKey && status.sshRegistered === false) {
            statusEl.textContent = t('vfx.runpodKeyUnregistered');
        }
    };

    runpodKeyRow.innerHTML = `
        <input id="vfx-runpod-key" type="password" autocomplete="off" placeholder="${t('vfx.runpodKeyPlaceholder')}"
            class="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
        <button id="vfx-runpod-save" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.runpodSaveKey')}</button>
    `;
    runpodKeyRow.querySelector('#vfx-runpod-save').onclick = async () => {
        const value = runpodKeyRow.querySelector('#vfx-runpod-key').value;
        try {
            await vork.setRunpodKey(value);
            runpodKeyRow.querySelector('#vfx-runpod-key').value = '';
            await refreshRunpod();
        } catch (err) {
            runpodBalance.textContent = err.message || String(err);
        }
    };
    runpodBilling.onclick = async () => {
        try {
            await vork.openRunpodBilling();
            await refreshRunpod();
        } catch (err) {
            statusEl.textContent = err.message || String(err);
        }
    };

    const askRunpod = async (profile, output = 'png') => {
        if (rendering) return;
        setBusy(true);
        runpodConfirm.classList.add('hidden');
        try {
            const quote = await vork.runpodQuote();
            showRunpodBalance(quote);
            if (!quote?.ok) {
                setBusy(false);
                return;
            }
            const amount = `${quote.amount} ${quote.currency || 'USD'}`;
            const price = quote.hourlyPrice == null
                ? t('vfx.runpodPriceUnknown')
                : tf('vfx.runpodPrice', quote.hourlyPrice, quote.currency || 'USD');
            runpodConfirm.innerHTML = '';
            const line = document.createElement('p');
            line.className = `text-xs m-0 ${quote.low ? 'text-amber-300' : 'text-white/80'}`;
            line.textContent = tf('vfx.runpodConfirm', amount, price);
            const row = document.createElement('div');
            row.className = 'flex gap-2';
            const go = document.createElement('button');
            go.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black';
            go.textContent = t('vfx.runpodConfirmButton');
            const stop = document.createElement('button');
            stop.className = 'px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80';
            stop.textContent = t('common.cancel');
            stop.onclick = () => {
                runpodConfirm.classList.add('hidden');
                setBusy(false);
            };
            go.onclick = () => renderJob({ profile, output, remote: true });
            row.append(go, stop);
            runpodConfirm.append(line, row);
            runpodConfirm.classList.remove('hidden');
        } catch (err) {
            runpodBalance.textContent = err.message || String(err);
            setBusy(false);
        }
    };

    const blenderProgressText = (data) => {
        const seconds = Math.round((data.elapsedMs || 0) / 1000);
        const key = {
            build: 'vfx.blenderBuildingFor',
            rent: 'vfx.runpodRenting',
            wait: 'vfx.runpodWaiting',
            install: 'vfx.blenderInstalling',
            transfer: 'vfx.runpodTransfer',
            fetch: 'vfx.runpodFetch',
            shutdown: 'vfx.runpodStopping',
            render: 'vfx.renderingFor',
        }[data.task];
        if (key) return tf(key, seconds);
        return tf('vfx.renderingFor', seconds);
    };

    const fillBlenderSettings = (settings) => {
        const next = settings || { resolution: [1280, 720], samples: 64 };
        blenderWidth.value = String(next.resolution?.[0] || 1280);
        blenderHeight.value = String(next.resolution?.[1] || 720);
        blenderSamples.value = String(next.samples || 64);
    };

    const showBlenderStatus = async () => {
        const status = await blender.getStatus();
        if (status.desktopOnly) {
            blenderStatusEl.textContent = t('vfx.blenderDesktopOnly');
            blenderRenderBtn.disabled = true;
            blenderBuildBtn.disabled = true;
            return;
        }
        fillBlenderSettings(status.settings);
        if (!status.found) {
            blenderStatusEl.textContent = t('vfx.blenderBinaryMissing');
            blenderPathRow.classList.remove('hidden');
            return;
        }
        blenderPathRow.classList.add('hidden');
        const probe = await blender.probe();
        if (!probe.ok) {
            blenderStatusEl.textContent = tf('vfx.blenderBinaryUnusable', probe.error || status.binaryPath);
            return;
        }
        blenderStatusEl.textContent = tf('vfx.blenderBinaryFound', probe.version || status.binaryPath);
    };

    blenderPathRow.innerHTML = `
        <input id="vfx-blender-binary" type="text" placeholder="${t('vfx.blenderPathPlaceholder')}"
            class="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
        <button id="vfx-blender-save-path" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.savePath')}</button>
    `;
    blenderPathRow.querySelector('#vfx-blender-save-path').onclick = async () => {
        const value = blenderPathRow.querySelector('#vfx-blender-binary').value;
        try {
            await blender.setBinaryPath(value);
            await showBlenderStatus();
        } catch (err) {
            blenderStatusEl.textContent = err.message || String(err);
        }
    };

    blenderKeyRow.innerHTML = `
        <input id="vfx-blender-runpod-key" type="password" autocomplete="off" placeholder="${t('vfx.runpodKeyPlaceholder')}"
            class="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white outline-none">
        <button id="vfx-blender-runpod-save" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.runpodSaveKey')}</button>
    `;
    blenderKeyRow.querySelector('#vfx-blender-runpod-save').onclick = async () => {
        const value = blenderKeyRow.querySelector('#vfx-blender-runpod-key').value;
        try {
            await blender.setRunpodKey(value);
            blenderKeyRow.querySelector('#vfx-blender-runpod-key').value = '';
            blenderKeyRow.classList.add('hidden');
            blenderStatusEl.textContent = t('vfx.blenderKeySaved');
        } catch (err) {
            blenderStatusEl.textContent = err.message || String(err);
        }
    };

    blenderSaveSettings.onclick = async () => {
        try {
            const saved = await blender.setSettings({
                width: Number(blenderWidth.value),
                height: Number(blenderHeight.value),
                samples: Number(blenderSamples.value),
            });
            fillBlenderSettings(saved);
            blenderStatusEl.textContent = t('vfx.blenderSettingsSaved');
        } catch (err) {
            blenderStatusEl.textContent = err.message || String(err);
        }
    };

    const blenderBuildOnly = async () => {
        if (rendering) return;
        setBusy(true);
        blenderConfirm.classList.add('hidden');
        try {
            const scene = await resolveBlenderScene();
            blenderStatusEl.textContent = t('vfx.blenderBuilding');
            const built = await blender.build({ scene });
            blenderStatusEl.textContent = built.audit
                ? tf('vfx.blenderBuilt', built.audit)
                : t('vfx.blenderBuildDone');
        } catch (err) {
            blenderStatusEl.textContent = err.message || String(err);
        } finally {
            setBusy(false);
        }
    };

    const blenderRenderJob = async (scene) => {
        setBusy(true);
        blenderConfirm.classList.add('hidden');
        blenderStatusEl.textContent = t('vfx.rendering');
        resultEl.classList.add('hidden');
        try {
            const payload = scene || plannedScene || await resolveBlenderScene();
            const result = await blender.render({ scene: payload });
            showResult(result);
            if (result?.audit) {
                blenderStatusEl.textContent = `${t('vfx.done')} · ${result.audit}`;
            }
        } catch (err) {
            const message = err.message || String(err);
            blenderStatusEl.textContent = message;
            showPlaceholder(message);
        } finally {
            setBusy(false);
        }
    };

    const askBlenderRender = async () => {
        if (rendering) return;
        setBusy(true);
        blenderConfirm.classList.add('hidden');
        try {
            const scene = await resolveBlenderScene();
            const status = await blender.runpodStatus();
            if (!status.encryptionAvailable) {
                blenderStatusEl.textContent = t('vfx.runpodNoEncryption');
                setBusy(false);
                return;
            }
            if (!status.hasKey) {
                blenderKeyRow.classList.remove('hidden');
                blenderStatusEl.textContent = t('vfx.runpodKeyMissing');
                setBusy(false);
                return;
            }
            blenderKeyRow.classList.add('hidden');
            const quote = await blender.runpodQuote();
            if (!quote?.ok) {
                blenderStatusEl.textContent = quote?.error || t('vfx.runpodBalanceUnknown');
                setBusy(false);
                return;
            }
            const amount = `${quote.amount} ${quote.currency || 'USD'}`;
            const price = quote.hourlyPrice == null
                ? t('vfx.runpodPriceUnknown')
                : tf('vfx.runpodPrice', quote.hourlyPrice, quote.currency || 'USD');
            blenderConfirm.innerHTML = '';
            const line = document.createElement('p');
            line.className = `text-xs m-0 ${quote.low ? 'text-amber-300' : 'text-white/80'}`;
            line.textContent = tf('vfx.blenderConfirm', amount, price);
            const row = document.createElement('div');
            row.className = 'flex gap-2';
            const go = document.createElement('button');
            go.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black';
            go.textContent = t('vfx.runpodConfirmButton');
            const stop = document.createElement('button');
            stop.className = 'px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-white/80';
            stop.textContent = t('common.cancel');
            stop.onclick = () => {
                blenderConfirm.classList.add('hidden');
                setBusy(false);
            };
            go.onclick = () => blenderRenderJob(scene);
            row.append(go, stop);
            blenderConfirm.append(line, row);
            blenderConfirm.classList.remove('hidden');
        } catch (err) {
            blenderStatusEl.textContent = err.message || String(err);
            setBusy(false);
        }
    };

    blenderRenderBtn.onclick = () => askBlenderRender();
    blenderBuildBtn.onclick = () => blenderBuildOnly();
    blenderCancelBtn.onclick = () => {
        blender.cancel();
        vork.cancel();
        setBusy(false);
        blenderStatusEl.textContent = t('vfx.cancelled');
        statusEl.textContent = t('vfx.cancelled');
    };

    const onVorkProgress = (data) => {
        if (data?.engine === 'blender') {
            if (data.status === 'done' || data.status === 'idle') return;
            blenderStatusEl.textContent = blenderProgressText(data);
            return;
        }
        if (data?.engine !== 'vork') return;
        if (data.status === 'done' || data.status === 'idle') return;
        statusEl.textContent = progressText(data);
    };
    const offProgress = bridgeMode
        ? (() => {
            const offVork = vork.watchProgress(onVorkProgress);
            const offBlender = blender.watchProgress(onVorkProgress);
            return () => { offVork(); offBlender(); };
        })()
        : localAI.onProgress(onVorkProgress);

    const detach = new MutationObserver(() => {
        if (container.isConnected) return;
        offProgress();
        detach.disconnect();
    });
    queueMicrotask(() => {
        const parent = container.parentElement;
        if (parent) detach.observe(parent, { childList: true });
    });

    showStatus().catch((err) => { statusEl.textContent = err.message || String(err); });
    showScene().catch(() => { sceneEl.textContent = ''; });
    refreshRunpod().catch((err) => { runpodBalance.textContent = err.message || String(err); });
    showBlenderStatus().catch((err) => { blenderStatusEl.textContent = err.message || String(err); });

    return container;
}
