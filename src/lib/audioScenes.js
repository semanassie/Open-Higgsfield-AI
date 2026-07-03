/** Multi-speaker audio scenes (Seed Audio style) — localStorage persistence */

const STORAGE_KEY = 'audio_scenes';

/** Map legacy voice IDs from older builds to current Minimax system voices */
const VOICE_ALIASES = {
    presenter_male: 'English_FriendlyPerson',
    presenter_female: 'English_Friendly_Female_3',
    'male-qn-qingse': 'Deep_Voice_Man',
    'male-qn-jingying': 'English_Magnetic_Male_2',
    'female-shaonv': 'English_Friendly_Female_3',
    'female-yujie': 'English_Steady_Female_1',
    audiobook_male_1: 'English_Deep-tonedMan',
    audiobook_female_1: 'English_CalmWoman',
};

export function resolveVoiceId(voiceId) {
    return VOICE_ALIASES[voiceId] || voiceId;
}

export function getAudioScenes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveAudioScene(scene) {
    const scenes = getAudioScenes();
    const idx = scenes.findIndex((s) => s.id === scene.id);
    if (idx >= 0) scenes[idx] = scene;
    else scenes.push(scene);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
}

export function deleteAudioScene(id) {
    const scenes = getAudioScenes().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
}

export function createEmptyScene(title = 'New Scene') {
    return {
        id: `scene_${Date.now()}`,
        title,
        ambience: '',
        lines: [
            { id: 'line_1', speaker: 'Speaker 1', voice_id: 'English_Friendly_Female_3', text: '' },
            { id: 'line_2', speaker: 'Speaker 2', voice_id: 'English_FriendlyPerson', text: '' },
        ],
        ambienceUrl: null,
        createdAt: new Date().toISOString(),
    };
}

export const VOICE_OPTIONS = [
    'Friendly_Person',
    'Deep_Voice_Man',
    'Calm_Woman',
    'Wise_Woman',
    'English_FriendlyPerson',
    'English_Friendly_Female_3',
    'English_Magnetic_Male_2',
    'English_Steady_Female_1',
    'English_CalmWoman',
    'English_Deep-tonedMan',
];
