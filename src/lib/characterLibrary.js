// Simple localStorage-backed character storage
// Same pattern as uploadHistory.js

const STORAGE_KEY = 'character_library';

export function getCharacters() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
}

export function saveCharacter(character) {
    const chars = getCharacters();
    // character = { id, name, genre, era, archetype, appearance, outfit, details,
    //               referenceImageUrl, backstory, createdAt }
    const existing = chars.findIndex(c => c.id === character.id);
    if (existing >= 0) {
        chars[existing] = character;
    } else {
        chars.push(character);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function deleteCharacter(id) {
    const chars = getCharacters().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function getCharacterById(id) {
    return getCharacters().find(c => c.id === id);
}
