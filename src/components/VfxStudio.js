import { isLocalAIAvailable, localAI } from '../lib/localInferenceClient.js';
import { vork } from '../lib/vorkClient.js';
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
            <button id="vfx-previs" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary border border-primary/30">${t('vfx.previs')}</button>
            <button id="vfx-final" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-black">${t('vfx.final')}</button>
            <button id="vfx-cancel" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-white/70">${t('common.cancel')}</button>
        </div>
    `;

    const statusEl = inner.querySelector('#vfx-status');
    const pathRow = inner.querySelector('#vfx-path');
    const sceneEl = inner.querySelector('#vfx-scene');
    const resultEl = inner.querySelector('#vfx-result');
    const previsBtn = inner.querySelector('#vfx-previs');
    const finalBtn = inner.querySelector('#vfx-final');
    const cancelBtn = inner.querySelector('#vfx-cancel');

    if (!isLocalAIAvailable()) {
        statusEl.textContent = t('vfx.desktopOnly');
        previsBtn.disabled = true;
        finalBtn.disabled = true;
        cancelBtn.disabled = true;
        return container;
    }

    let rendering = false;

    const setBusy = (busy) => {
        rendering = busy;
        previsBtn.disabled = busy;
        finalBtn.disabled = busy;
    };

    const showScene = async () => {
        const scene = await vork.getScene();
        sceneEl.textContent = JSON.stringify(scene, null, 2);
    };

    const showStatus = async () => {
        const status = await vork.getStatus();
        if (!status.found) {
            statusEl.textContent = t('vfx.binaryMissing');
            pathRow.classList.remove('hidden');
            return;
        }
        pathRow.classList.add('hidden');
        const probe = await vork.probe();
        statusEl.textContent = probe.ok
            ? tf('vfx.binaryFound', probe.version || status.binaryPath)
            : tf('vfx.binaryUnusable', probe.error || status.binaryPath);
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

    const renderProfile = async (profile) => {
        if (rendering) return;
        setBusy(true);
        statusEl.textContent = t('vfx.rendering');
        resultEl.classList.add('hidden');
        try {
            const result = await vork.render({ profile });
            const img = document.createElement('img');
            img.src = result.url;
            img.alt = t('vfx.title');
            img.className = 'w-full rounded-xl border border-white/10';
            resultEl.innerHTML = '';
            resultEl.appendChild(img);
            resultEl.classList.remove('hidden');
            statusEl.textContent = t('vfx.done');
            await showScene();
        } catch (err) {
            statusEl.textContent = err.message || String(err);
        } finally {
            setBusy(false);
        }
    };

    previsBtn.onclick = () => renderProfile('std/previs');
    finalBtn.onclick = () => renderProfile('std/final');
    cancelBtn.onclick = () => {
        vork.cancel();
        setBusy(false);
        statusEl.textContent = t('vfx.cancelled');
    };

    const offProgress = localAI.onProgress((data) => {
        if (data?.engine !== 'vork') return;
        if (data.status === 'done') return;
        const seconds = Math.round((data.elapsedMs || 0) / 1000);
        statusEl.textContent = tf('vfx.renderingFor', seconds);
    });

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

    return container;
}
