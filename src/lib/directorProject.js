/** Director Studio project — survives page refresh (CDN URLs only; no blob:). */

const STORAGE_KEY = 'director_project';

export function createEmptyDirectorProject() {
    return {
        prompt: '',
        shotCount: 4,
        aspectRatio: '16:9',
        qualityTier: 'budget',
        mode: 'manual',
        screenplayText: '',
        characters: [],
        characterBindings: [],
        shots: [],
        stillUrls: [],
        videoUrls: [],
        combinedVideoUrl: null,
        status: '',
        pass: 0,
        modelIds: null,
        llmModelId: null,
        updatedAt: null,
    };
}

export function loadDirectorProject() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!data || typeof data !== 'object') return null;
        const combined = data.combinedVideoUrl?.startsWith('blob:')
            ? null
            : (data.combinedVideoUrl || null);
        return {
            ...createEmptyDirectorProject(),
            ...data,
            characters: Array.isArray(data.characters) ? data.characters : [],
            characterBindings: Array.isArray(data.characterBindings) ? data.characterBindings : [],
            shots: Array.isArray(data.shots) ? data.shots : [],
            stillUrls: Array.isArray(data.stillUrls) ? data.stillUrls : [],
            videoUrls: Array.isArray(data.videoUrls) ? data.videoUrls : [],
            combinedVideoUrl: combined,
        };
    } catch {
        return null;
    }
}

export function saveDirectorProject(state) {
    const combined = state.combinedVideoUrl?.startsWith('blob:')
        ? null
        : (state.combinedVideoUrl || null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        combinedVideoUrl: combined,
        updatedAt: new Date().toISOString(),
    }));
}

export function clearDirectorProject() {
    localStorage.removeItem(STORAGE_KEY);
}
