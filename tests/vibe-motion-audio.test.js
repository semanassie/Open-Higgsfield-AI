/**
 * Unit checks for Vibe Motion audio mood → Suno music payload mapping.
 * Ensures music category is used (not default tts) so suno-create-music resolves.
 */
import { validateAudioParams, buildApiPayload } from '../src/lib/modelRequirements.js';

const MOODS = [
    { id: 'upbeat', style: 'upbeat energetic pop, modern production, catchy rhythm' },
    { id: 'chill', style: 'chill lofi beats, relaxed ambient, soft piano and vinyl crackle' },
    { id: 'dramatic', style: 'dramatic cinematic orchestral, building tension, epic strings and percussion' },
    { id: 'electronic', style: 'electronic dance music, pulsing synths, modern EDM drop' },
];

const MUSIC_MODEL = 'suno-create-music';
let passed = 0;
let failed = 0;

function assert(condition, description) {
    if (condition) {
        console.log(`  ✓ ${description}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${description}`);
        failed++;
    }
}

console.log('🎵 Vibe Motion audio param tests');
console.log('─'.repeat(50));

for (const mood of MOODS) {
    const check = validateAudioParams('music', MUSIC_MODEL, {
        prompt: `Short 5 second background track: ${mood.style}`,
        style: mood.style,
        instrumental: true,
    });
    assert(check.valid, `${mood.id} mood validates for ${MUSIC_MODEL}`);
    assert(check.normalized.prompt?.includes(mood.style), `${mood.id} prompt includes style`);
    assert(check.normalized.instrumental === true, `${mood.id} is instrumental`);
}

const wrongCategory = validateAudioParams('tts', MUSIC_MODEL, {
    prompt: 'test track',
    style: 'chill',
    instrumental: true,
});
assert(!wrongCategory.valid, 'suno-create-music rejected under tts category (regression guard)');
assert(
    wrongCategory.errors.some(e => e.includes('Unknown audio model')),
    'wrong category yields Unknown audio model error',
);

console.log('');
console.log('🎬 Vibe Motion I2V payload tests');
console.log('─'.repeat(50));

const TEST_IMAGE = 'https://cdn.muapi.ai/test-image.jpg';
const vibeMotionParams = {
    image_url: TEST_IMAGE,
    prompt: 'smooth cinematic orbit around the subject',
    duration: 5,
};

const seedancePayload = buildApiPayload('i2v', 'seedance-2-mini-image-to-video', vibeMotionParams);
assert(Array.isArray(seedancePayload.images_list), 'Seedance 2 Mini uses images_list array');
assert(seedancePayload.images_list[0] === TEST_IMAGE, 'Seedance images_list contains uploaded URL');
assert(!seedancePayload.image_url, 'Seedance payload omits image_url');

for (const modelId of [
    'seedance-2.5-image-to-video',
    'seedance-2.1-image-to-video',
    'seedance-2-i2v',
]) {
    const p = buildApiPayload('i2v', modelId, vibeMotionParams);
    assert(Array.isArray(p.images_list) && p.images_list.length === 1, `${modelId} uses images_list`);
    assert(!p.image_url, `${modelId} omits image_url`);
}

const klingPayload = buildApiPayload('i2v', 'kling-v2.6-pro-i2v', vibeMotionParams);
assert(klingPayload.image_url === TEST_IMAGE, 'Kling v2.6 Pro uses image_url');
assert(!klingPayload.images_list, 'Kling payload omits images_list');

console.log('─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✅ All vibe-motion audio tests passed.');
