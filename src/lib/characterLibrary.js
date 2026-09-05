/** Simple localStorage-backed character library for Director continuity. */

const STORAGE_KEY = 'character_library';

export function getCharacters() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveCharacter(character) {
    const chars = getCharacters();
    const existing = chars.findIndex((c) => c.id === character.id);
    if (existing >= 0) chars[existing] = character;
    else chars.push(character);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
    return character;
}

export function deleteCharacter(id) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(getCharacters().filter((c) => c.id !== id))
    );
}

export function getCharacterById(id) {
    return getCharacters().find((c) => c.id === id);
}

export function findCharacterByName(name) {
    const n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    return getCharacters().find((c) => String(c.name || '').trim().toLowerCase() === n) || null;
}

export function ensureCharacterFromDirector(char) {
    const existing = findCharacterByName(char.name);
    if (existing) {
        return {
            ...existing,
            appearance: char.appearance || existing.appearance,
            role: char.role || existing.role,
        };
    }
    const created = {
        id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: char.name || 'Character',
        appearance: char.appearance || '',
        role: char.role || '',
        referenceImageUrl: char.referenceImageUrl || null,
        createdAt: new Date().toISOString(),
        source: 'director',
    };
    saveCharacter(created);
    return created;
}
