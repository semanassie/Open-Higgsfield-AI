/** Browser-side video concat (Director / Explainer). Uses bundled ffmpeg.wasm when available. */

let ffmpegReady = null;

async function getFfmpeg(onStatus) {
    if (ffmpegReady) return ffmpegReady;

    ffmpegReady = (async () => {
        onStatus?.('Loading ffmpeg.wasm…');
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
        // Dynamic core URLs from package (Vite resolves ?url)
        let coreJsUrl;
        let coreWasmUrl;
        try {
            coreJsUrl = (await import('@ffmpeg/core?url')).default;
            coreWasmUrl = (await import('@ffmpeg/core/wasm?url')).default;
        } catch {
            // Fallback CDN if package path differs
            coreJsUrl = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js';
            coreWasmUrl = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm';
        }

        const ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => {
            if (message && /error|fail/i.test(message)) {
                console.warn('[ffmpeg]', message);
            }
        });

        const coreURL = await toBlobURL(coreJsUrl, 'text/javascript');
        const wasmURL = await toBlobURL(coreWasmUrl, 'application/wasm');
        await ffmpeg.load({ coreURL, wasmURL });
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
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        '-c:a', 'aac', '-movflags', '+faststart',
        'output.mp4',
    ]);
}

/**
 * Concatenate remote video URLs into a single blob: URL.
 * @param {string[]} urls
 * @param {{ onStatus?: (msg: string) => void }} [options]
 * @returns {Promise<string>} blob URL
 */
export async function combineVideosLocally(urls, options = {}) {
    const { onStatus } = options;
    const list = (urls || []).filter(Boolean);
    if (list.length < 2) {
        throw new Error('Need at least 2 scene videos to combine.');
    }

    const { ffmpeg, fetchFile } = await getFfmpeg(onStatus);
    const names = [];

    for (let i = 0; i < list.length; i++) {
        onStatus?.(`Downloading clip ${i + 1}/${list.length}…`);
        const name = `clip${i}.mp4`;
        const data = await fetchFile(list[i]);
        await ffmpeg.writeFile(name, data);
        names.push(name);
    }

    await ffmpeg.writeFile('concat.txt', names.map((n) => `file '${n}'`).join('\n'));

    onStatus?.('Stitching (stream copy)…');
    let code = await execConcat(ffmpeg, 'copy');
    if (code !== 0) {
        onStatus?.('Re-encoding for compatibility…');
        code = await execConcat(ffmpeg, 'encode');
    }
    if (code !== 0) {
        throw new Error('ffmpeg concat failed');
    }

    const out = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([out.buffer], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
}

/** Copy scene URLs to clipboard as newline-separated text. */
export function copySceneUrls(urls) {
    const text = (urls || []).filter(Boolean).join('\n');
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        return true;
    }
    return false;
}
