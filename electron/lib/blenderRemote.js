// SSH session against a pod rented for Blender Cycles stills.
// The official Blender Linux archive is downloaded on the pod.

const fs = require('fs');
const { officialLinuxArchive, REMOTE_JOB_TIMEOUT_MS } = require('./blenderScene');

function installScript(version) {
    const archive = officialLinuxArchive(version);
    return [
        'set -euo pipefail',
        'export DEBIAN_FRONTEND=noninteractive',
        'apt-get update',
        'apt-get install -y xz-utils libxi6 libxrender1 libxkbcommon0 libsm6 libxxf86vm1 libgl1 libx11-6 ca-certificates curl',
        'cd /tmp',
        `curl -fL --retry 5 --retry-all-errors --retry-delay 2 -o ${archive.file} ${archive.url}`,
        'rm -rf /tmp/blender-tree /usr/local/lib/blender',
        'mkdir -p /tmp/blender-tree /usr/local/lib/blender',
        `tar -xJf ${archive.file} -C /tmp/blender-tree --strip-components=1`,
        'cp -a /tmp/blender-tree/. /usr/local/lib/blender/',
        'ln -sfn /usr/local/lib/blender/blender /usr/local/bin/blender',
        'chmod +x /usr/local/lib/blender/blender',
        'export PATH="/usr/local/bin:$PATH"',
        'blender --version',
    ].join('\n');
}

const GPU_SCRIPT = `# Enable Cycles GPU when available. Samples/resolution come from scene.blend.
import bpy

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.render.filepath = "/tmp/frame####"
scene.render.image_settings.file_format = "PNG"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"
    for device in prefs.get_devices_for_type("OPTIX"):
        device.use = True
    scene.cycles.device = "GPU"
except Exception:
    try:
        prefs.compute_device_type = "CUDA"
        for device in prefs.get_devices_for_type("CUDA"):
            device.use = True
        scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"
`;

function renderCommand() {
    return [
        'export PATH="/usr/local/bin:$PATH"',
        'export NVIDIA_VISIBLE_DEVICES=all',
        'blender --background --factory-startup /tmp/scene.blend',
        '--python /tmp/enable_gpu.py',
        '--render-output /tmp/frame####',
        '--render-frame 1',
    ].join(' ');
}

function defaultConnect({ host, port, username = 'root', privateKey }) {
    const { Client } = require('ssh2');
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const fail = (err) => {
            conn.end();
            reject(err);
        };
        conn.on('ready', () => resolve(wrap(conn)));
        conn.on('error', fail);
        conn.connect({
            host,
            port,
            username,
            privateKey,
            readyTimeout: 30000,
        });
    });
}

function wrap(conn) {
    return {
        exec(command) {
            return new Promise((resolve, reject) => {
                const timeoutMs = command.startsWith('echo ') ? 20000 : 7 * 60 * 1000;
                const timer = setTimeout(() => {
                    try { conn.end(); } catch { /* closing a dead socket */ }
                    const error = new Error('remote command timed out');
                    error.retryable = true;
                    reject(error);
                }, timeoutMs);
                conn.exec(command, { pty: true }, (err, stream) => {
                    if (err) {
                        clearTimeout(timer);
                        reject(err);
                        return;
                    }
                    let stdout = '';
                    let stderr = '';
                    stream.on('data', (chunk) => { stdout += chunk.toString(); });
                    stream.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
                    stream.on('close', (code) => {
                        clearTimeout(timer);
                        resolve({ code: code ?? 0, stdout, stderr });
                    });
                });
            });
        },
        putFile(localPath, remotePath) {
            return new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const source = fs.createReadStream(localPath);
                    const dest = sftp.createWriteStream(remotePath);
                    source.on('error', reject);
                    dest.on('error', reject);
                    dest.on('close', () => resolve());
                    source.pipe(dest);
                });
            });
        },
        getFile(remotePath, localPath) {
            return new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const source = sftp.createReadStream(remotePath);
                    const dest = fs.createWriteStream(localPath);
                    source.on('error', reject);
                    dest.on('error', reject);
                    dest.on('close', () => resolve());
                    source.pipe(dest);
                });
            });
        },
        close() {
            conn.end();
        },
    };
}

function retryableSsh(message) {
    return /container not found|is not running|not ready|connection refused|timed out|ECONNREFUSED|ECONNRESET|error response from daemon|remote command timed out|curl: \(22\)|error: 504|error: 502|error: 503/i.test(message);
}

async function openReadySession({ connect, host, port, username, privateKey, sleep }) {
    const deadline = Date.now() + REMOTE_JOB_TIMEOUT_MS;
    let last = 'SSH is not ready';
    while (Date.now() <= deadline) {
        let session;
        try {
            session = await connect({ host, port, username, privateKey });
            const probe = await session.exec('echo READY');
            const text = `${probe.stdout || ''}\n${probe.stderr || ''}`;
            if (!text.trim() || retryableSsh(text)) {
                last = tail(probe) || text.trim() || 'container did not respond';
                session.close();
                await sleep(5000);
                continue;
            }
            if (probe.code !== 0) {
                session.close();
                throw new Error(tail(probe) || 'remote command failed');
            }
            return session;
        } catch (error) {
            try { session?.close(); } catch { /* already closed */ }
            last = error.message || last;
            if (!retryableSsh(last)) throw error;
        }
        await sleep(5000);
    }
    throw new Error(last);
}

async function putRemote(session, localPath, remotePath, sftp) {
    if (sftp !== false) {
        await session.putFile(localPath, remotePath);
        return;
    }
    const payload = fs.readFileSync(localPath).toString('base64');
    const written = await session.exec(`base64 -d > ${remotePath} << 'B64'\n${payload}\nB64`);
    if (written.code !== 0) throw new Error(tail(written) || 'could not copy the scene to the pod');
}

async function getRemote(session, remotePath, localPath, sftp) {
    if (sftp !== false) {
        await session.getFile(remotePath, localPath);
        return;
    }
    const encoded = await session.exec(`base64 ${remotePath}`);
    if (encoded.code !== 0) throw new Error(tail(encoded) || 'could not read the render from the pod');
    fs.writeFileSync(localPath, Buffer.from(encoded.stdout.replace(/\s+/g, ''), 'base64'));
}

function tail(result) {
    return `${result.stderr || ''}\n${result.stdout || ''}`.trim().split('\n').slice(-20).join('\n');
}

async function renderOnPod({
    connect = defaultConnect,
    host,
    port,
    username = 'root',
    sftp = true,
    privateKey,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    blendPath,
    outPath,
    version,
    samples,
    resolution,
    onProgress,
}) {
    const deadline = Date.now() + REMOTE_JOB_TIMEOUT_MS;
    let last = 'SSH is not ready';
    while (Date.now() <= deadline) {
        const session = await openReadySession({ connect, host, port, username, privateKey, sleep });
        try {
            onProgress?.({ engine: 'blender', task: 'install', status: 'install' });
            const installed = await session.exec(installScript(version));
            const installText = `${installed.stdout || ''}\n${installed.stderr || ''}`;
            if (retryableSsh(installText)) {
                last = tail(installed) || 'container is not running';
                await sleep(5000);
                continue;
            }
            if (installed.code !== 0 || !/Blender\s+\d+\.\d+/i.test(installed.stdout || '')) {
                throw new Error(tail(installed) || 'Blender install failed on the pod');
            }
            onProgress?.({ engine: 'blender', task: 'transfer', status: 'transfer' });
            await putRemote(session, blendPath, '/tmp/scene.blend', sftp);
            const gpuScript = '/tmp/enable_gpu.py';
            if (sftp !== false) {
                const { writeFileSync, unlinkSync } = fs;
                const tmp = `${outPath}.enable_gpu.py`;
                writeFileSync(tmp, GPU_SCRIPT);
                try {
                    await putRemote(session, tmp, gpuScript, sftp);
                } finally {
                    try { unlinkSync(tmp); } catch { /* temp cleanup */ }
                }
            } else {
                const payload = Buffer.from(GPU_SCRIPT, 'utf8').toString('base64');
                const written = await session.exec(`base64 -d > ${gpuScript} << 'B64'\n${payload}\nB64`);
                if (written.code !== 0) throw new Error(tail(written) || 'could not write the GPU script');
            }
            onProgress?.({ engine: 'blender', task: 'render', status: 'render' });
            const rendered = await session.exec(renderCommand());
            if (rendered.code !== 0) {
                throw new Error(tail(rendered) || 'Blender render failed on the pod');
            }
            onProgress?.({ engine: 'blender', task: 'fetch', status: 'fetch' });
            // Cycles writes frame0001.png for --render-frame 1 with frame#### pattern.
            let fetched = false;
            for (const candidate of ['/tmp/frame0001.png', '/tmp/frame1.png', '/tmp/frame0001.png.png']) {
                try {
                    await getRemote(session, candidate, outPath, sftp);
                    fetched = true;
                    break;
                } catch {
                    // try next name
                }
            }
            if (!fetched) {
                throw new Error('could not read the render from the pod');
            }
            return;
        } catch (error) {
            last = error.message || last;
            if (!error.retryable && !retryableSsh(last)) throw error;
            await sleep(5000);
        } finally {
            try { session.close(); } catch { /* already closed */ }
        }
    }
    throw new Error(last);
}

module.exports = {
    installScript,
    renderCommand,
    renderOnPod,
    defaultConnect,
};
