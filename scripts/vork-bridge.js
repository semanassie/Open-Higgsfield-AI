/**
 * Localhost bridge so the Next studio can drive vork.exe.
 * Binds 127.0.0.1 only. Does not replace Electron's encrypted RunPod store.
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { createHandlers, vorkPaths } = require('../electron/lib/vorkProvider');

const PORT = Number(process.env.VORK_BRIDGE_PORT || 3011);
const STUDIO_ORIGINS = new Set([
    'http://localhost:3010',
    'http://127.0.0.1:3010',
]);

function userDataPath() {
    if (process.platform === 'win32' && process.env.APPDATA) {
        return path.join(process.env.APPDATA, 'Open Generative AI');
    }
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Open Generative AI');
    }
    return path.join(os.homedir(), '.config', 'Open Generative AI');
}

function bridgeSafeStorage(secretPath) {
    function secret() {
        if (!fs.existsSync(secretPath)) {
            fs.mkdirSync(path.dirname(secretPath), { recursive: true });
            fs.writeFileSync(secretPath, crypto.randomBytes(32), { mode: 0o600 });
        }
        const key = fs.readFileSync(secretPath);
        if (key.length !== 32) throw new Error('bridge key is invalid');
        return key;
    }
    return {
        isEncryptionAvailable: () => true,
        encryptString(value) {
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', secret(), iv);
            const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
            return Buffer.concat([iv, cipher.getAuthTag(), enc]);
        },
        decryptString(buffer) {
            const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            const iv = buf.subarray(0, 12);
            const tag = buf.subarray(12, 28);
            const data = buf.subarray(28);
            const decipher = crypto.createDecipheriv('aes-256-gcm', secret(), iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        },
    };
}

function openExternal(url) {
    const child = process.platform === 'win32'
        ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true })
        : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
}

function openPath(target) {
    openExternal(target);
    return '';
}

const dataRoot = userDataPath();
const store = vorkPaths(dataRoot);
let latestProgress = { engine: 'vork', status: 'idle' };
const handlers = createHandlers({
    userDataPath: dataRoot,
    safeStorage: bridgeSafeStorage(path.join(store.dataDir, 'bridge.key')),
    openPath,
    openExternal,
    onProgress: (data) => {
        latestProgress = data && typeof data === 'object' ? data : { engine: 'vork', status: 'idle' };
    },
});

function isLoopback(req) {
    const addr = req.socket.remoteAddress || '';
    return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function readBody(req, limit = 80 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                reject(new Error('upload is too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function send(res, status, payload) {
    const body = Buffer.from(JSON.stringify(payload));
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
    });
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && STUDIO_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename');
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    if (!isLoopback(req)) {
        send(res, 403, { error: 'vork bridge accepts localhost only' });
        return;
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1');
    try {
        if (req.method === 'GET' && url.pathname === '/v1/health') {
            send(res, 200, { ok: true });
            return;
        }
        if (req.method === 'GET' && url.pathname === '/v1/progress') {
            send(res, 200, latestProgress);
            return;
        }
        if (req.method === 'GET' && url.pathname === '/v1/status') {
            send(res, 200, await handlers.getStatus());
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/binary') {
            const body = JSON.parse((await readBody(req, 1024 * 64)).toString('utf8') || '{}');
            send(res, 200, await handlers.setBinaryPath(body.binaryPath));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/probe') {
            send(res, 200, await handlers.probe());
            return;
        }
        if (req.method === 'GET' && url.pathname === '/v1/scene') {
            send(res, 200, await handlers.getScene());
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/scene') {
            const scene = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            send(res, 200, await handlers.writeScene(scene));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/setup') {
            send(res, 200, await handlers.setup());
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/import') {
            const type = String(req.headers['content-type'] || '');
            if (type.includes('application/json')) {
                const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
                send(res, 200, await handlers.importGltf(body));
                return;
            }
            const rawName = String(req.headers['x-filename'] || 'model.glb');
            const filename = path.basename(rawName);
            if (!/\.glb$/i.test(filename)) throw new Error('only .glb files can be imported');
            const bytes = await readBody(req);
            const tmpDir = path.join(store.dataDir, 'tmp');
            fs.mkdirSync(tmpDir, { recursive: true });
            const tmpFile = path.join(tmpDir, `${Date.now()}-${filename}`);
            fs.writeFileSync(tmpFile, bytes);
            try {
                send(res, 200, await handlers.importGltf({ sourcePath: tmpFile }));
            } finally {
                fs.rmSync(tmpFile, { force: true });
            }
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/render') {
            const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            send(res, 200, await handlers.render(body));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/open-output') {
            const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            send(res, 200, { ok: true, result: await handlers.openOutput(body.outPath) });
            return;
        }
        if (req.method === 'GET' && url.pathname === '/v1/runpod/status') {
            send(res, 200, await handlers.runpodStatus());
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/runpod/key') {
            const body = JSON.parse((await readBody(req, 1024 * 64)).toString('utf8') || '{}');
            send(res, 200, await handlers.setRunpodKey(body.apiKey));
            return;
        }
        if (req.method === 'GET' && url.pathname === '/v1/runpod/quote') {
            send(res, 200, await handlers.runpodQuote());
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/runpod/render') {
            const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
            send(res, 200, await handlers.runpodRender(body));
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/runpod/billing') {
            await handlers.openBilling();
            send(res, 200, { ok: true });
            return;
        }
        if (req.method === 'POST' && url.pathname === '/v1/cancel') {
            send(res, 200, await handlers.cancel());
            return;
        }
        send(res, 404, { error: 'not found' });
    } catch (err) {
        send(res, 500, { error: err && err.message ? err.message : String(err) });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Vork bridge listening on http://127.0.0.1:${PORT}`);
});
