/** Browser-side video concat (Explainer Studio). Uses bundled ffmpeg.wasm. */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import coreJsUrl from '@ffmpeg/core?url';
import coreWasmUrl from '@ffmpeg/core/wasm?url';

let ffmpegReady = null;

function clipFetchCandidates(url) {
    if (typeof url !== 'string') return [url];
    const direct = url.replace(/^\/muapi-cdn/, 'https://cdn.muapi.ai');
    const candidates = [direct];
    if (import.meta.env.DEV && direct.includes('cdn.muapi.ai')) {
        candidates.push(direct.replace('https://cdn.muapi.ai', '/muapi-cdn'));
    }
    return [...new Set(candidates)];
}

function looksLikeMp4(bytes) {
    if (!bytes?.length || bytes.length < 12) return false;
    return String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === 'ftyp';
}

async function downloadClipBytes(url) {
    const errors = [];
    for (const fetchUrl of clipFetchCandidates(url)) {
        try {
            const res = await fetch(fetchUrl);
            if (!res.ok) {
                errors.push(`${fetchUrl} -> HTTP ${res.status}`);
                continue;
            }
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            if (!looksLikeMp4(bytes)) {
                errors.push(`${fetchUrl} -> not mp4 (${bytes.length} bytes)`);
                continue;
            }
            return bytes;
        } catch (err) {
            errors.push(`${fetchUrl} -> ${err.message}`);
        }
    }
    throw new Error(errors.join('; ') || 'download failed');
}

async function getFfmpeg(onStatus) {
    if (ffmpegReady) return ffmpegReady;

    ffmpegReady = (async () => {
        onStatus?.('Loading video engine…');
        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            if (/error|invalid|fail/i.test(message || '')) {
                console.warn('[ffmpeg]', message);
            }
        });

        onStatus?.('Loading WASM (~25 MB, first time only)…');

        const loadTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('FFmpeg load timed out after 90s. Check internet and retry.')), 90000);
        });

        const coreURL = await toBlobURL(coreJsUrl, 'text/javascript');
        const wasmURL = await toBlobURL(coreWasmUrl, 'application/wasm');

        await Promise.race([
            ffmpeg.load({ coreURL, wasmURL }),
            loadTimeout,
        ]);

        onStatus?.('Video engine ready.');
        return { ffmpeg, fetchFile };
    })().catch((err) => {
        ffmpegReady = null;
        throw err;
    });

    return ffmpegReady;
}

async function execConcat(ffmpeg, mode) {
    await ffmpeg.deleteFile('output.mp4').catch(() => {});
    if (mode === 'copy') {
        return ffmpeg.exec([
            '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
            '-c', 'copy', 'output.mp4',
        ]);
    }
    return ffmpeg.exec([
        '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-movflags', '+faststart',
        'output.mp4',
    ]);
}

/**
 * @param {string[]} urls
 * @param {{ onStatus?: (msg: string) => void }} [options]
 */
export async function combineVideosLocally(urls, options = {}) {
    const { onStatus } = options;
    if (!urls?.length || urls.length < 2) {
        throw new Error('Need at least 2 scene videos to combine.');
    }

    const { ffmpeg } = await getFfmpeg(onStatus);
    const names = [];

    for (let i = 0; i < urls.length; i++) {
        onStatus?.(`Downloading clip ${i + 1}/${urls.length}…`);
        try {
            const data = await downloadClipBytes(urls[i]);
            const name = `clip_${i}.mp4`;
            await ffmpeg.writeFile(name, data);
            names.push(name);
        } catch (err) {
            throw new Error(`Clip ${i + 1} download failed: ${err.message}`);
        }
    }

    await ffmpeg.writeFile('concat.txt', names.map((n) => `file '${n}'`).join('\n'));

    onStatus?.('Stitching clips…');
    let code = await execConcat(ffmpeg, 'copy');
    if (code !== 0) {
        onStatus?.('Re-encoding for compatibility…');
        code = await execConcat(ffmpeg, 'encode');
    }
    if (code !== 0) throw new Error('Could not merge clips.');

    const out = await ffmpeg.readFile('output.mp4');
    const bytes = out instanceof Uint8Array ? out : new Uint8Array(out);
    if (!bytes?.length) throw new Error('Output file is empty.');
    return URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
}

export function copySceneUrls(urls) {
    const text = urls.join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    return text;
}
