// Browser-side seam for vork.
// Electron talks to the official binary over IPC.
// The Next studio talks to the same actions on the localhost bridge.

import { isLocalAIAvailable } from './localInferenceClient.js';

const BRIDGE = 'http://127.0.0.1:3011';

async function bridge(path, { method = 'GET', json, file, filename } = {}) {
    /** @type {RequestInit} */
    const init = { method };
    if (file) {
        init.method = 'POST';
        init.body = file;
        init.headers = { 'X-Filename': filename || 'model.glb' };
    } else if (json !== undefined) {
        init.method = method === 'GET' ? 'POST' : method;
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(json);
    }
    let response;
    try {
        response = await fetch(`${BRIDGE}${path}`, init);
    } catch {
        const error = new Error('Vork bridge is not running. Start launch.bat.');
        error.bridgeDown = true;
        throw error;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Vork bridge failed (${response.status})`);
    }
    return data;
}

function desktop() {
    return isLocalAIAvailable();
}

export const vork = {
    async getStatus() {
        if (desktop()) return window.localAI.vork.getStatus();
        try {
            return await bridge('/v1/status');
        } catch (err) {
            if (err.bridgeDown) return { found: false, binaryPath: '', desktopOnly: true };
            throw err;
        }
    },

    async setBinaryPath(binaryPath) {
        if (desktop()) return window.localAI.vork.setBinaryPath(binaryPath);
        return bridge('/v1/binary', { json: { binaryPath } });
    },

    async probe() {
        if (desktop()) return window.localAI.vork.probe();
        return bridge('/v1/probe', { method: 'POST', json: {} });
    },

    async getScene() {
        if (desktop()) return window.localAI.vork.getScene();
        return bridge('/v1/scene');
    },

    async writeScene(scene) {
        if (desktop()) return window.localAI.vork.writeScene(scene);
        return bridge('/v1/scene', { json: scene });
    },

    async setup() {
        if (desktop()) return window.localAI.vork.setup();
        return bridge('/v1/setup', { method: 'POST', json: {} });
    },

    async importGltf(sourcePath) {
        if (desktop()) return window.localAI.vork.importGltf(sourcePath);
        if (!sourcePath) throw new Error('Choose a .glb file');
        return bridge('/v1/import', { json: { sourcePath } });
    },

    async importGltfFile(file, filename) {
        if (desktop()) throw new Error('Use the desktop file dialog in the Electron app.');
        return bridge('/v1/import', { file, filename: filename || file?.name || 'model.glb' });
    },

    async render(params = {}) {
        if (desktop()) return window.localAI.vork.render(params);
        return bridge('/v1/render', { json: params });
    },

    async openOutput(outPath) {
        if (desktop()) return window.localAI.vork.openOutput(outPath);
        return bridge('/v1/open-output', { json: { outPath } });
    },

    cancel() {
        if (desktop()) {
            window.localAI.vork.cancel();
            return;
        }
        bridge('/v1/cancel', { method: 'POST', json: {} }).catch(() => {});
    },

    async runpodStatus() {
        if (desktop()) return window.localAI.vork.runpodStatus();
        try {
            return await bridge('/v1/runpod/status');
        } catch (err) {
            if (err.bridgeDown) {
                return {
                    encryptionAvailable: false,
                    hasKey: false,
                    publicKey: '',
                    billingUrl: 'https://console.runpod.io/user/billing',
                    desktopOnly: true,
                };
            }
            throw err;
        }
    },

    async setRunpodKey(apiKey) {
        if (desktop()) return window.localAI.vork.setRunpodKey(apiKey);
        return bridge('/v1/runpod/key', { json: { apiKey } });
    },

    async runpodQuote() {
        if (desktop()) return window.localAI.vork.runpodQuote();
        return bridge('/v1/runpod/quote');
    },

    async renderRunpod(params = {}) {
        if (desktop()) return window.localAI.vork.renderRunpod(params);
        return bridge('/v1/runpod/render', { json: params });
    },

    async openRunpodBilling() {
        if (desktop()) return window.localAI.vork.openRunpodBilling();
        return bridge('/v1/runpod/billing', { method: 'POST', json: {} });
    },

    watchProgress(callback) {
        if (desktop()) return () => {};
        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                const data = await bridge('/v1/progress');
                if (data) callback(data);
            } catch {
                // Bridge down: the status line already explains it.
            }
        };
        const timer = setInterval(tick, 700);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    },
};
