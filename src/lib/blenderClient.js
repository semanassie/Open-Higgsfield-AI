// Browser-side seam for Blender.
// Electron talks to the official binary over IPC.
// The Next studio talks to the same actions on the localhost bridge.

import { isLocalAIAvailable } from './localInferenceClient.js';

const BRIDGE = 'http://127.0.0.1:3011';

async function bridge(path, { method = 'GET', json } = {}) {
    /** @type {RequestInit} */
    const init = { method };
    if (json !== undefined) {
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
        throw new Error(data.error || `Blender bridge failed (${response.status})`);
    }
    return data;
}

function desktop() {
    return isLocalAIAvailable();
}

export const blender = {
    async getStatus() {
        if (desktop()) return window.localAI.blender.getStatus();
        try {
            return await bridge('/v1/blender/status');
        } catch (err) {
            if (err.bridgeDown) return { found: false, binaryPath: '', desktopOnly: true, settings: null };
            throw err;
        }
    },

    async setBinaryPath(binaryPath) {
        if (desktop()) return window.localAI.blender.setBinaryPath(binaryPath);
        return bridge('/v1/blender/binary', { json: { binaryPath } });
    },

    async getSettings() {
        if (desktop()) return window.localAI.blender.getSettings();
        return bridge('/v1/blender/settings');
    },

    async setSettings(settings) {
        if (desktop()) return window.localAI.blender.setSettings(settings);
        return bridge('/v1/blender/settings', { json: settings });
    },

    async probe() {
        if (desktop()) return window.localAI.blender.probe();
        return bridge('/v1/blender/probe', { method: 'POST', json: {} });
    },

    async build(params = {}) {
        if (desktop()) return window.localAI.blender.build(params);
        return bridge('/v1/blender/build', { json: params });
    },

    async render(params = {}) {
        if (desktop()) return window.localAI.blender.render(params);
        return bridge('/v1/blender/render', { json: params });
    },

    cancel() {
        if (desktop()) {
            window.localAI.blender.cancel();
            return;
        }
        bridge('/v1/blender/cancel', { method: 'POST', json: {} }).catch(() => {});
    },

    async runpodStatus() {
        if (desktop()) return window.localAI.blender.runpodStatus();
        try {
            return await bridge('/v1/blender/runpod/status');
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
        if (desktop()) return window.localAI.blender.setRunpodKey(apiKey);
        return bridge('/v1/blender/runpod/key', { json: { apiKey } });
    },

    async runpodQuote() {
        if (desktop()) return window.localAI.blender.runpodQuote();
        return bridge('/v1/blender/runpod/quote');
    },

    async openRunpodBilling() {
        if (desktop()) return window.localAI.blender.openRunpodBilling();
        return bridge('/v1/blender/runpod/billing', { method: 'POST', json: {} });
    },

    watchProgress(callback) {
        if (desktop()) return () => {};
        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                const data = await bridge('/v1/progress');
                if (data && data.engine === 'blender') callback(data);
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
