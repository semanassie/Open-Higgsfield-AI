// Browser-side seam for the desktop vork studio.
// The page asks Electron to launch the official binary. It does not render.

import { isLocalAIAvailable } from './localInferenceClient.js';

function unavailable(value) {
    if (!isLocalAIAvailable()) return value;
    return null;
}

export const vork = {
    async getStatus() {
        const fallback = unavailable({ found: false, binaryPath: '', desktopOnly: true });
        if (fallback) return fallback;
        return window.localAI.vork.getStatus();
    },

    async setBinaryPath(binaryPath) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.setBinaryPath(binaryPath);
    },

    async probe() {
        const fallback = unavailable({ ok: false, error: 'Vork is only available in the desktop app.' });
        if (fallback) return fallback;
        return window.localAI.vork.probe();
    },

    async getScene() {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.getScene();
    },

    // Agent seam: replace the stub scene. The human does not edit this JSON.
    async writeScene(scene) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.writeScene(scene);
    },

    async render({ profile, scene } = {}) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.render({ profile, scene });
    },

    cancel() {
        if (!isLocalAIAvailable()) return;
        window.localAI.vork.cancel();
    },
};
