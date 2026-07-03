/**
 * Unit tests for buildApiPayload on video models fixed by video-fields audit.
 */
import { buildApiPayload } from '../src/lib/modelRequirements.js';

const TEST_IMAGE = 'https://cdn.example.com/start.jpg';
const TEST_END = 'https://cdn.example.com/end.jpg';
const TEST_VIDEO = 'https://cdn.example.com/ref.mp4';

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

console.log('🎬 Video model payload tests (audit fixes)');
console.log('─'.repeat(50));

const wanRef = buildApiPayload('i2v', 'wan2.7-reference-to-video', {
    prompt: 'match reference motion',
    videos_list: [TEST_VIDEO],
    aspect_ratio: '16:9',
    duration: 5,
    resolution: '720p',
});
assert(Array.isArray(wanRef.videos_list), 'wan2.7-reference uses videos_list');
assert(wanRef.videos_list[0] === TEST_VIDEO, 'wan2.7-reference videos_list URL');
assert(!wanRef.images_list, 'wan2.7-reference omits images_list');

const runwayAct = buildApiPayload('i2v', 'runway-act-two-i2v', {
    image_url: TEST_IMAGE,
    reference_video_url: TEST_VIDEO,
    aspect_ratio: '16:9',
});
assert(runwayAct.reference_video_url === TEST_VIDEO, 'runway-act-two sends reference_video_url');
assert(runwayAct.image_url === TEST_IMAGE, 'runway-act-two sends image_url');

for (const modelId of ['vidu-q2-turbo-start-end-video', 'vidu-q2-pro-start-end-video']) {
    const p = buildApiPayload('i2v', modelId, {
        prompt: 'morph scene',
        image_url: TEST_IMAGE,
        last_image: TEST_END,
        resolution: '720p',
        duration: 5,
    });
    assert(p.image_url === TEST_IMAGE, `${modelId} sends start image_url`);
    assert(p.last_image === TEST_END, `${modelId} sends last_image`);
}

const pixTransition = buildApiPayload('v2v', 'pixverse-v6-transition', {
    prompt: 'smooth morph',
    image_url: TEST_IMAGE,
});
assert(pixTransition.image_url === TEST_IMAGE, 'pixverse-v6-transition sends image_url');
assert(!pixTransition.video_url, 'pixverse-v6-transition omits video_url');

const veoExtend = buildApiPayload('v2v', 'veo3.1-extend-video', {
    prompt: 'continue scene',
    request_id: 'veo-req-abc-123',
});
assert(veoExtend.request_id === 'veo-req-abc-123', 'veo3.1-extend sends request_id');
assert(!veoExtend.video_url, 'veo3.1-extend omits video_url');

console.log('─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✅ All video model payload tests passed.');
