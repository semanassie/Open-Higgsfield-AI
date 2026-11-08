// SSH session against a pod the desktop app rented on the user's account.
// The official vork archive is downloaded on the pod. Nothing here is a queue.

const fs = require('fs');

const VORK_VERSION = '0.1.0';
const VORK_RELEASE = `https://github.com/voyager-so/vork/releases/download/v${VORK_VERSION}`;

function installScript() {
    const archive = `vork-${VORK_VERSION}-linux-x64.tar.gz`;
    return [
        'set -euo pipefail',
        'export DEBIAN_FRONTEND=noninteractive',
        'apt-get update',
        'apt-get install -y libegl1 libvulkan1 libgomp1 ca-certificates curl ffmpeg',
        'cd /tmp',
        `curl -fL -o SHA256SUMS ${VORK_RELEASE}/SHA256SUMS`,
        `curl -fL -o ${archive} ${VORK_RELEASE}/${archive}`,
        `grep ${archive} SHA256SUMS | sha256sum -c`,
        'rm -rf /tmp/vork-tree /usr/local/lib/vork',
        'mkdir -p /tmp/vork-tree /usr/local/lib/vork',
        `tar -xzf ${archive} -C /tmp/vork-tree`,
        'cp -a /tmp/vork-tree/. /usr/local/lib/vork/',
        'ln -sfn /usr/local/lib/vork/vork /usr/local/bin/vork',
        'chmod +x /usr/local/lib/vork/vork',
        'export PATH="/usr/local/bin:$PATH"',
        'vork --version',
        'vork setup',
    ].join('\n');
}

function renderCommand(profile, options = {}) {
    if (profile && typeof profile === 'object') {
        options = profile;
        profile = options.profile;
    }
    if (profile !== 'std/previs' && profile !== 'std/final') {
        throw new Error('profile must be std/previs or std/final');
    }
    const output = options.output === 'mp4' ? 'mp4' : 'png';
    const remoteOut = output === 'mp4' ? '/tmp/clip.mp4' : '/tmp/final.png';
    let frames = '';
    if (output === 'mp4') {
        if (!Number.isInteger(options.frameStart) || !Number.isInteger(options.frameEnd)) {
            throw new Error('frame range is invalid');
        }
        frames = ` --frame-start ${options.frameStart} --frame-end ${options.frameEnd}`;
    }
    return `export PATH="/usr/local/bin:$PATH"; export NVIDIA_VISIBLE_DEVICES=all; export VK_ICD_FILENAMES=/etc/vulkan/icd.d/nvidia_icd.json; vork render /tmp/shot.json --profile ${profile}${frames} --out ${remoteOut}`;
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
                conn.exec(command, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    let stdout = '';
                    let stderr = '';
                    stream.on('data', (chunk) => { stdout += chunk.toString(); });
                    stream.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
                    stream.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
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

function tail(result) {
    return `${result.stderr || ''}\n${result.stdout || ''}`.trim().split('\n').slice(-20).join('\n');
}

async function renderOnPod({
    connect = defaultConnect,
    host,
    port,
    privateKey,
    profile,
    output = 'png',
    frameStart,
    frameEnd,
    shotPath,
    glbPath,
    outPath,
    onProgress,
}) {
    const remoteOut = output === 'mp4' ? '/tmp/clip.mp4' : '/tmp/final.png';
    const session = await connect({ host, port, username: 'root', privateKey });
    try {
        onProgress?.({ engine: 'vork', task: 'install', status: 'install' });
        const installed = await session.exec(installScript());
        if (installed.code !== 0 || !installed.stdout.includes(VORK_VERSION)) {
            throw new Error(tail(installed) || 'vork install failed on the pod');
        }
        onProgress?.({ engine: 'vork', task: 'transfer', status: 'transfer' });
        await session.putFile(shotPath, '/tmp/shot.json');
        if (glbPath) await session.putFile(glbPath, '/tmp/model.glb');
        onProgress?.({ engine: 'vork', task: 'render', status: 'render' });
        const rendered = await session.exec(renderCommand({ profile, output, frameStart, frameEnd }));
        if (rendered.code !== 0) {
            throw new Error(tail(rendered) || 'vork render failed on the pod');
        }
        onProgress?.({ engine: 'vork', task: 'fetch', status: 'fetch' });
        await session.getFile(remoteOut, outPath);
    } finally {
        session.close();
    }
}

module.exports = {
    VORK_VERSION,
    installScript,
    renderCommand,
    renderOnPod,
    defaultConnect,
};
