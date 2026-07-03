/** Explainer Studio session — survives page refresh */

const STORAGE_KEY = 'explainer_session';

export function loadExplainerSession() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!data || typeof data !== 'object') return null;
        return {
            topic: data.topic || '',
            sceneCount: data.sceneCount || 4,
            scenes: Array.isArray(data.scenes) ? data.scenes : [],
            sceneVideos: Array.isArray(data.sceneVideos) ? data.sceneVideos : [],
            combinedVideoUrl: data.combinedVideoUrl || null,
            status: data.status || '',
        };
    } catch {
        return null;
    }
}

export function saveExplainerSession(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
    }));
}

export function clearExplainerSession() {
    localStorage.removeItem(STORAGE_KEY);
}
