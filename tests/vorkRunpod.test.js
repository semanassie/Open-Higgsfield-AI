const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { vorkPaths } = require('../electron/lib/vorkProvider');
const { installScript, renderCommand } = require('../electron/lib/vorkRemote');
const {
    BILLING_URL,
    GPU_4090,
    POD_IMAGE,
    sshEndpoint,
    accountQuote,
    createBody,
    ensureSshKey,
    parseBalance,
    parseHourlyPrice,
    runRemoteStill,
    saveApiKey,
    storeApiKey,
    terminateOwned,
} = require('../electron/lib/vorkRunpod');

function safeStorage(available = true) {
    return {
        isEncryptionAvailable: () => available,
        encryptString: (value) => Buffer.from(`enc:${value}`),
        decryptString: (buffer) => buffer.toString().replace(/^enc:/, ''),
    };
}

function tempPaths() {
    const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'vork-runpod-'));
    return vorkPaths(userDataPath);
}

test('install script includes libegl1 and checks the official archive', () => {
    const script = installScript();
    assert.match(script, /libegl1/);
    assert.match(script, /ffmpeg/);
    assert.match(script, /libvulkan1/);
    assert.match(script, /sha256sum -c/);
    assert.match(script, /\/usr\/local\/lib\/vork/);
    assert.match(script, /vork setup/);
    assert.match(renderCommand('std/final'), /--profile std\/final/);
    assert.match(renderCommand('std/final'), /\/tmp\/final\.png/);
    const clip = renderCommand({ profile: 'std/final', output: 'mp4', frameStart: 0, frameEnd: 47 });
    assert.match(clip, /--frame-start 0 --frame-end 47/);
    assert.match(clip, /\/tmp\/clip\.mp4/);
    assert.equal(clip.includes('/tmp/final.png'), false);
});

test('API key is encrypted and refused when the OS cannot encrypt', () => {
    const paths = tempPaths();
    const storage = safeStorage();
    saveApiKey({ paths, apiKey: ' rp-secret ', safeStorage: storage });
    const raw = fs.readFileSync(path.join(paths.dataDir, 'vork-runpod.bin'));
    assert.equal(raw.toString(), 'enc:rp-secret');
    assert.notEqual(raw.toString(), 'rp-secret');
    assert.throws(
        () => saveApiKey({ paths, apiKey: 'other', safeStorage: safeStorage(false) }),
        /securely/,
    );
    assert.equal(fs.readFileSync(path.join(paths.dataDir, 'vork-runpod.bin')).toString(), 'enc:rp-secret');
});

test('SSH public key is OpenSSH ed25519 and the private key stays encrypted', () => {
    const paths = tempPaths();
    const ssh = ensureSshKey({ paths, safeStorage: safeStorage() });
    assert.match(ssh.publicKey, /^ssh-ed25519 /);
    assert.match(ssh.privateKey, /OPENSSH PRIVATE KEY/);
    const stored = fs.readFileSync(path.join(paths.dataDir, 'vork-runpod-ssh.bin')).toString();
    assert.equal(stored.startsWith('enc:'), true);
    assert.notEqual(stored, ssh.privateKey);
});

test('ssh endpoint prefers the direct host from the pod', () => {
    const endpoint = sshEndpoint({
        status: 'RUNNING',
        ssh: { direct: { host: '203.0.113.10', port: 22123, username: 'root' }, proxy: null },
    });
    assert.equal(endpoint.host, '203.0.113.10');
    assert.equal(endpoint.sftp, true);
    const proxy = sshEndpoint({
        ssh: { direct: null, proxy: { host: 'ssh.runpod.io', port: 22, username: 'pod-token' } },
    });
    assert.equal(proxy.sftp, false);
    assert.equal(proxy.host, 'ssh.runpod.io');
});

test('create body requests one on-demand 4090 and enables graphics', () => {
    const body = createBody('vork-abc', 'COMMUNITY');
    assert.equal(body.gpu.id, GPU_4090);
    assert.equal(body.gpu.count, 1);
    assert.equal(body.cloud, 'COMMUNITY');
    assert.equal(body.startSsh, true);
    assert.equal(body.interruptible, undefined);
    assert.equal(body.env.NVIDIA_DRIVER_CAPABILITIES, 'all');
    assert.equal(body.image, POD_IMAGE);
    assert.equal(body.disk >= 20, true);
    assert.deepEqual(body.ports, ['22/tcp']);
    assert.match(body.name, /^vork-/);
});

test('balance and hourly price parse, and a short balance is marked low', async () => {
    assert.deepEqual(parseBalance({ data: { myself: { clientBalance: 10.37 } } }), {
        amount: 10.37,
        currency: 'USD',
    });
    assert.equal(parseHourlyPrice({
        gpus: [
            { id: 'NVIDIA A100 80GB PCIe', communityPrice: 1.5 },
            { id: GPU_4090, pricing: { community: 0.69 } },
        ],
    }), 0.69);
    const paths = tempPaths();
    saveApiKey({ paths, apiKey: 'rp-secret', safeStorage: safeStorage() });
    const quote = await accountQuote({
        paths,
        safeStorage: safeStorage(),
        fetchImpl: async (url) => {
            if (url.endsWith('/graphql')) {
                return json(200, { data: { myself: { clientBalance: 0.2 } } });
            }
            return json(200, { gpus: [{ id: GPU_4090, communityPrice: 0.69 }] });
        },
    });
    assert.equal(quote.ok, true);
    assert.equal(quote.low, true);
    assert.equal(quote.billingUrl, BILLING_URL);
    assert.equal(quote.hourlyPrice, 0.69);
});

test('a failed key check does not keep the key', async () => {
    const paths = tempPaths();
    await assert.rejects(
        () => storeApiKey({
            paths,
            apiKey: 'rp-bad',
            safeStorage: safeStorage(),
            fetchImpl: async () => json(401, { error: 'unauthorized' }),
        }),
        /unauthorized/,
    );
    assert.equal(fs.existsSync(path.join(paths.dataDir, 'vork-runpod.bin')), false);
});

test('SSH registration keeps keys already on the account', async () => {
    const paths = tempPaths();
    const storage = safeStorage();
    const calls = [];
    await storeApiKey({
        paths,
        apiKey: 'rp-good',
        safeStorage: storage,
        fetchImpl: async (url, options) => {
            calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
            if (url.endsWith('/pods') && options.method === 'GET') return json(200, { pods: [] });
            if (url.endsWith('/ssh-keys') && options.method === 'GET') {
                return json(200, { keys: ['ssh-ed25519 AAAAexisting user'] });
            }
            if (url.endsWith('/ssh-keys') && options.method === 'PUT') return json(200, { ok: true });
            return json(500, { error: 'unexpected' });
        },
    });
    const put = calls.find((call) => call.method === 'PUT');
    assert.equal(put.body.keys[0], 'ssh-ed25519 AAAAexisting user');
    assert.match(put.body.keys[1], /^ssh-ed25519 /);
});

test('a still rents a 4090, renders, fetches the image, and terminates the pod', async () => {
    const paths = tempPaths();
    const storage = safeStorage();
    saveApiKey({ paths, apiKey: 'rp-secret', safeStorage: storage });
    const calls = [];
    let polls = 0;
    const result = await runRemoteStill({
        paths,
        profile: 'std/final',
        safeStorage: storage,
        sleep: async () => {},
        connect: async () => ({
            exec: async (command) => ({
                code: 0,
                stdout: command.includes('--version') || command.includes('vork setup')
                    ? 'vork 0.1.0\n'
                    : 'rendered\n',
                stderr: '',
            }),
            putFile: async () => {},
            getFile: async (_remote, local) => {
                fs.writeFileSync(local, Buffer.from('png-bytes'));
            },
            close: () => {},
        }),
        fetchImpl: async (url, options) => {
            calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
            if (url.endsWith('/ssh-keys') && options.method === 'GET') return json(200, { keys: [] });
            if (url.endsWith('/ssh-keys') && options.method === 'PUT') return json(200, {});
            if (url.endsWith('/pods') && options.method === 'POST') {
                assert.equal(options.body.includes('NVIDIA A100'), false);
                const body = JSON.parse(options.body);
                assert.equal(body.gpu.id, GPU_4090);
                assert.equal(body.env.NVIDIA_DRIVER_CAPABILITIES, 'all');
                return json(201, { id: 'pod-1', name: body.name });
            }
            if (url.endsWith('/pods/pod-1') && options.method === 'GET') {
                polls += 1;
                if (polls === 1) return json(200, { id: 'pod-1', name: 'vork-test', desiredStatus: 'STARTING' });
                return json(200, {
                    id: 'pod-1',
                    name: 'vork-test',
                    desiredStatus: 'RUNNING',
                    publicIp: '203.0.113.8',
                    portMappings: { 22: 22022 },
                });
            }
            if (url.endsWith('/pods/pod-1') && options.method === 'DELETE') return json(200, { ok: true });
            return json(500, { error: `unexpected ${options.method} ${url}` });
        },
    });
    assert.match(result.url, /^data:image\/png;base64,/);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
    assert.equal(calls.filter((call) => call.method === 'POST' && call.url.endsWith('/pods')).length, 1);
});

test('the pod is terminated when the render fails', async () => {
    const paths = tempPaths();
    const storage = safeStorage();
    saveApiKey({ paths, apiKey: 'rp-secret', safeStorage: storage });
    const calls = [];
    await assert.rejects(() => runRemoteStill({
        paths,
        profile: 'std/previs',
        safeStorage: storage,
        sleep: async () => {},
        connect: async () => ({
            exec: async () => ({ code: 1, stdout: '', stderr: 'vulkan failed' }),
            putFile: async () => {},
            getFile: async () => {},
            close: () => {},
        }),
        fetchImpl: podFetch(calls, { ready: true }),
    }), /vulkan failed/);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
});

test('a pod this app did not rent is not terminated', async () => {
    await assert.rejects(
        () => terminateOwned({
            apiKey: 'rp-secret',
            podId: 'someone-else',
            owned: new Set(),
            fetchImpl: async () => json(200, { id: 'someone-else', name: 'my-notebook' }),
        }),
        /did not rent/,
    );
});

test('a clip rents a 4090, requests an mp4 frame range, and terminates without billing a real account', async () => {
    const paths = tempPaths();
    const storage = safeStorage();
    saveApiKey({ paths, apiKey: 'rp-secret', safeStorage: storage });
    const calls = [];
    const commands = [];
    const result = await runRemoteStill({
        paths,
        profile: 'std/final',
        output: 'mp4',
        safeStorage: storage,
        sleep: async () => {},
        connect: async () => ({
            exec: async (command) => {
                commands.push(command);
                return { code: 0, stdout: 'vork 0.1.0\n', stderr: '' };
            },
            putFile: async () => {},
            getFile: async (remote, local) => {
                assert.equal(remote, '/tmp/clip.mp4');
                fs.writeFileSync(local, Buffer.from('mp4-bytes'));
            },
            close: () => {},
        }),
        fetchImpl: podFetch(calls, { ready: true }),
    });
    assert.equal(result.kind, 'video');
    assert.equal(result.frameStart, 0);
    assert.equal(result.frameEnd, 47);
    assert.equal(result.url, undefined);
    assert.match(result.fileUrl, /^file:/);
    assert.match(commands.find((command) => command.includes('vork render')), /--frame-start 0 --frame-end 47/);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
    assert.equal(calls.some((call) => String(call.url).includes('api.runpod.io') && call.method === 'POST'), true);
});

test('an empty image is reported missing and the pod is still shut down', async () => {
    const paths = tempPaths();
    const storage = safeStorage();
    saveApiKey({ paths, apiKey: 'rp-secret', safeStorage: storage });
    const calls = [];
    const result = await runRemoteStill({
        paths,
        profile: 'std/final',
        safeStorage: storage,
        sleep: async () => {},
        connect: async () => ({
            exec: async () => ({ code: 0, stdout: 'vork 0.1.0\n', stderr: '' }),
            putFile: async () => {},
            getFile: async (_remote, local) => fs.writeFileSync(local, Buffer.alloc(0)),
            close: () => {},
        }),
        fetchImpl: podFetch(calls, { ready: true }),
    });
    assert.equal(result.missing, true);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
});

function json(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async text() { return JSON.stringify(body); },
    };
}

function podFetch(calls, { ready }) {
    return async (url, options) => {
        calls.push({ url, method: options.method });
        if (url.endsWith('/ssh-keys') && options.method === 'GET') return json(200, { keys: [] });
        if (url.endsWith('/ssh-keys') && options.method === 'PUT') return json(200, {});
        if (url.endsWith('/pods') && options.method === 'POST') {
            const body = JSON.parse(options.body);
            return json(201, { id: 'pod-9', name: body.name });
        }
        if (url.endsWith('/pods/pod-9') && options.method === 'GET') {
            return json(200, ready
                ? {
                    id: 'pod-9',
                    name: 'vork-ready',
                    desiredStatus: 'RUNNING',
                    publicIp: '203.0.113.9',
                    portMappings: { 22: 2222 },
                }
                : { id: 'pod-9', name: 'vork-ready', desiredStatus: 'STARTING' });
        }
        if (url.endsWith('/pods/pod-9') && options.method === 'DELETE') return json(200, {});
        return json(500, { error: 'unexpected' });
    };
}
