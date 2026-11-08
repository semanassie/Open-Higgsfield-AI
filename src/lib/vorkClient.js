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

    async setup() {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.setup();
    },

    // Copies a .glb into the shot folder as model.glb and adds the asset node.
    // Without a path, the desktop app opens the file dialog itself.
    async importGltf(sourcePath) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.importGltf(sourcePath);
    },

    async render({ profile, scene, output, frameStart, frameEnd } = {}) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.render({ profile, scene, output, frameStart, frameEnd });
    },

    async openOutput(outPath) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.openOutput(outPath);
    },

    cancel() {
        if (!isLocalAIAvailable()) return;
        window.localAI.vork.cancel();
    },

    async runpodStatus() {
        const fallback = unavailable({
            encryptionAvailable: false,
            hasKey: false,
            publicKey: '',
            billingUrl: 'https://console.runpod.io/user/billing',
            desktopOnly: true,
        });
        if (fallback) return fallback;
        return window.localAI.vork.runpodStatus();
    },

    async setRunpodKey(apiKey) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.setRunpodKey(apiKey);
    },

    async runpodQuote() {
        const fallback = unavailable({ ok: false, error: 'Vork is only available in the desktop app.' });
        if (fallback) return fallback;
        return window.localAI.vork.runpodQuote();
    },

    async renderRunpod({ profile, scene, output, frameStart, frameEnd } = {}) {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.renderRunpod({ profile, scene, output, frameStart, frameEnd });
    },

    async openRunpodBilling() {
        if (!isLocalAIAvailable()) throw new Error('Vork is only available in the desktop app.');
        return window.localAI.vork.openRunpodBilling();
    },
};
