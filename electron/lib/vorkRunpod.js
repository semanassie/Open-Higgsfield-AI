// User-owned RunPod rental. The desktop process calls RunPod with the user's
// key. There is no shared queue and no server of ours in the path.
// REST v1 retires on 15 Nov 2026, so pods use REST v2. Balance stays on
// GraphQL because the REST API does not return it.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { planRender, glbFiles, stubScene, DEFAULT_SHOT_ID } = require('./vorkScene');
const { renderOnPod } = require('./vorkRemote');

const API_ROOT = 'https://api.runpod.io/v2';
const GRAPHQL_URL = 'https://api.runpod.io/graphql';
const BILLING_URL = 'https://console.runpod.io/user/billing';
const GPU_4090 = 'NVIDIA GeForce RTX 4090';
const POD_IMAGE = 'runpod/pytorch:1.5.0-cu1281-torch280-ubuntu2404';
const READY_MS = 10 * 60 * 1000;
const POLL_MS = 5000;

let job = null;

function keyPath(paths) {
    return path.join(paths.dataDir, 'vork-runpod.bin');
}

function sshPrivatePath(paths) {
    return path.join(paths.dataDir, 'vork-runpod-ssh.bin');
}

function sshPublicPath(paths) {
    return path.join(paths.dataDir, 'vork-runpod-ssh.pub');
}

function encryptionAvailable(safeStorage) {
    return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable());
}

function saveApiKey({ paths, apiKey, safeStorage }) {
    const value = typeof apiKey === 'string' ? apiKey.trim() : '';
    if (!value) throw new Error('RunPod API key is required');
    if (!encryptionAvailable(safeStorage)) {
        throw new Error('This computer cannot store the RunPod key securely');
    }
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(keyPath(paths), safeStorage.encryptString(value));
    return { ok: true, hasKey: true };
}

function loadApiKey({ paths, safeStorage }) {
    const file = keyPath(paths);
    if (!fs.existsSync(file) || !encryptionAvailable(safeStorage)) return '';
    return safeStorage.decryptString(fs.readFileSync(file)).trim();
}

function hasApiKey(paths) {
    return fs.existsSync(keyPath(paths));
}

function clearApiKey(paths) {
    const file = keyPath(paths);
    if (fs.existsSync(file)) fs.unlinkSync(file);
}

function openSshPublicKey(publicKey) {
    const der = publicKey.export({ type: 'spki', format: 'der' });
    const raw = der.subarray(der.length - 32);
    const frame = (buf) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(buf.length);
        return Buffer.concat([len, buf]);
    };
    const blob = Buffer.concat([frame(Buffer.from('ssh-ed25519')), frame(raw)]);
    return `ssh-ed25519 ${blob.toString('base64')} vork-desktop`;
}

function ensureSshKey({ paths, safeStorage }) {
    if (!encryptionAvailable(safeStorage)) {
        throw new Error('This computer cannot store the RunPod key securely');
    }
    fs.mkdirSync(paths.dataDir, { recursive: true });
    const pubFile = sshPublicPath(paths);
    const privFile = sshPrivatePath(paths);
    if (fs.existsSync(pubFile) && fs.existsSync(privFile)) {
        return {
            publicKey: fs.readFileSync(pubFile, 'utf8').trim(),
            privateKey: safeStorage.decryptString(fs.readFileSync(privFile)),
        };
    }
    const pair = crypto.generateKeyPairSync('ed25519');
    const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKey = openSshPublicKey(pair.publicKey);
    fs.writeFileSync(privFile, safeStorage.encryptString(privateKey));
    fs.writeFileSync(pubFile, `${publicKey}\n`);
    return { publicKey, privateKey };
}

async function storeApiKey({ paths, apiKey, safeStorage, fetchImpl = globalThis.fetch }) {
    saveApiKey({ paths, apiKey, safeStorage });
    const key = loadApiKey({ paths, safeStorage });
    try {
        await listPods({ apiKey: key, fetchImpl });
    } catch (error) {
        clearApiKey(paths);
        throw error;
    }
    const ssh = ensureSshKey({ paths, safeStorage });
    const registered = await registerSshKey({ apiKey: key, publicKey: ssh.publicKey, fetchImpl });
    return {
        ok: true,
        hasKey: true,
        publicKey: ssh.publicKey,
        sshRegistered: registered.sshRegistered,
        billingUrl: BILLING_URL,
    };
}

async function accountQuote({ paths, safeStorage, fetchImpl = globalThis.fetch }) {
    const apiKey = loadApiKey({ paths, safeStorage });
    if (!apiKey) {
        return { ok: false, error: 'Save a RunPod API key first', billingUrl: BILLING_URL };
    }
    try {
        return await quote({ apiKey, fetchImpl });
    } catch (error) {
        return { ok: false, error: error.message, billingUrl: BILLING_URL };
    }
}

function isRemoteBusy() {
    return job !== null;
}

function localStatus({ paths, safeStorage }) {
    let publicKey = '';
    const pubFile = sshPublicPath(paths);
    if (fs.existsSync(pubFile)) publicKey = fs.readFileSync(pubFile, 'utf8').trim();
    return {
        encryptionAvailable: encryptionAvailable(safeStorage),
        hasKey: hasApiKey(paths) && encryptionAvailable(safeStorage),
        publicKey,
        billingUrl: BILLING_URL,
    };
}

async function api({ apiKey, method, url, body, fetchImpl }) {
    const response = await fetchImpl(url, {
        method,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed = null;
    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = null;
        }
    }
    if (!response.ok) {
        const message = parsed?.error || parsed?.message || text.slice(0, 180) || `RunPod ${response.status}`;
        const error = new Error(typeof message === 'string' ? message : `RunPod ${response.status}`);
        error.status = response.status;
        throw error;
    }
    if (parsed?.errors?.length) {
        throw new Error(parsed.errors[0].message || 'RunPod request failed');
    }
    return parsed;
}

function unwrapPod(body) {
    if (!body || typeof body !== 'object') return null;
    if (body.pod && body.pod.id) return body.pod;
    if (body.id) return body;
    return null;
}

function sshEndpoint(pod) {
    if (!pod) return null;
    const host = pod.publicIp || pod.ip || pod.runtime?.publicIp || null;
    const mappings = pod.portMappings || pod.runtime?.portMappings || null;
    let port = mappings ? Number(mappings['22'] || mappings[22]) : 0;
    const listed = pod.runtime?.ports;
    if (!port && Array.isArray(listed)) {
        const ssh = listed.find((entry) => Number(entry.privatePort) === 22);
        if (ssh) port = Number(ssh.publicPort);
    }
    if (!host || !port) return null;
    return { host, port };
}

function isRunning(pod) {
    const status = String(pod.desiredStatus || pod.status || 'RUNNING').toUpperCase();
    return status === 'RUNNING' || status === 'RUN';
}

function podName() {
    return `vork-${crypto.randomBytes(4).toString('hex')}`;
}

function createBody(name, cloudType) {
    return {
        name,
        image: POD_IMAGE,
        gpu: { id: GPU_4090, count: 1 },
        disk: 20,
        ports: ['22/tcp'],
        env: { NVIDIA_DRIVER_CAPABILITIES: 'all' },
        cloudType,
        interruptible: false,
    };
}

function capacityError(error) {
    const message = String(error?.message || '').toLowerCase();
    return /capacity|unavailable|not enough|no gpu|out of stock|no instances/.test(message);
}

async function createPod({ apiKey, fetchImpl, name = podName() }) {
    let lastError = null;
    for (const cloudType of ['COMMUNITY', 'SECURE']) {
        try {
            const created = await api({
                apiKey,
                method: 'POST',
                url: `${API_ROOT}/pods`,
                body: createBody(name, cloudType),
                fetchImpl,
            });
            const pod = unwrapPod(created);
            if (!pod?.id) throw new Error('RunPod did not return a pod id');
            return { ...pod, name: pod.name || name, cloudType };
        } catch (error) {
            lastError = error;
            if (cloudType === 'COMMUNITY' && capacityError(error)) continue;
            throw error;
        }
    }
    throw lastError || new Error('No RTX 4090 is available');
}

async function getPod({ apiKey, podId, fetchImpl }) {
    const body = await api({
        apiKey,
        method: 'GET',
        url: `${API_ROOT}/pods/${encodeURIComponent(podId)}`,
        fetchImpl,
    });
    return unwrapPod(body);
}

async function listPods({ apiKey, fetchImpl }) {
    return api({ apiKey, method: 'GET', url: `${API_ROOT}/pods`, fetchImpl });
}

function keyStrings(body) {
    if (Array.isArray(body)) return body.filter((entry) => typeof entry === 'string');
    const list = body?.sshKeys || body?.keys || body?.publicKeys || [];
    if (!Array.isArray(list)) return [];
    return list.map((entry) => {
        if (typeof entry === 'string') return entry;
        return entry?.key || entry?.publicKey || entry?.pubKey || '';
    }).filter(Boolean);
}

async function registerSshKey({ apiKey, publicKey, fetchImpl }) {
    let current = null;
    try {
        current = await api({
            apiKey,
            method: 'GET',
            url: `${API_ROOT}/account/ssh-keys`,
            fetchImpl,
        });
    } catch {
        return { sshRegistered: false };
    }
    const existing = keyStrings(current);
    if (existing.some((entry) => entry.trim() === publicKey.trim())) {
        return { sshRegistered: true };
    }
    const keys = [...existing, publicKey];
    const body = Array.isArray(current)
        ? keys
        : (current && Array.isArray(current.sshKeys)
            ? { ...current, sshKeys: keys.map((key) => ({ key })) }
            : { keys });
    try {
        await api({
            apiKey,
            method: 'PUT',
            url: `${API_ROOT}/account/ssh-keys`,
            body,
            fetchImpl,
        });
        return { sshRegistered: true };
    } catch {
        return { sshRegistered: false };
    }
}

function numberFrom(value) {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function parseBalance(body) {
    const myself = body?.data?.myself || body?.myself || body || {};
    const amount = numberFrom(myself.clientBalance ?? myself.balance ?? body?.clientBalance ?? body?.balance);
    const currency = myself.currency || body?.currency || 'USD';
    if (amount === null) return null;
    return { amount, currency };
}

function gpuRecords(body) {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.gpus)) return body.gpus;
    if (Array.isArray(body?.gpuTypes)) return body.gpuTypes;
    return [];
}

function hourlyFromGpu(gpu) {
    if (!gpu) return null;
    const pricing = gpu.pricing || gpu.price || {};
    const lowest = gpu.lowestPrice || {};
    return numberFrom(pricing.community)
        ?? numberFrom(pricing.onDemand)
        ?? numberFrom(pricing.hourly)
        ?? numberFrom(gpu.communityPrice)
        ?? numberFrom(gpu.securePrice)
        ?? numberFrom(gpu.onDemandPrice)
        ?? numberFrom(gpu.pricePerHour)
        ?? numberFrom(lowest.uninterruptablePrice)
        ?? numberFrom(lowest.minimumBidPrice);
}

function parseHourlyPrice(body) {
    const match = gpuRecords(body).find((gpu) => {
        const id = gpu.id || gpu.gpuId || gpu.displayName || '';
        return id === GPU_4090 || id === 'RTX 4090';
    });
    return hourlyFromGpu(match);
}

async function fetchBalance({ apiKey, fetchImpl }) {
    const body = await api({
        apiKey,
        method: 'POST',
        url: GRAPHQL_URL,
        body: { query: 'query { myself { clientBalance } }' },
        fetchImpl,
    });
    const parsed = parseBalance(body);
    if (!parsed) throw new Error('RunPod did not return a balance');
    return parsed;
}

async function fetchHourlyPrice({ apiKey, fetchImpl }) {
    try {
        const body = await api({
            apiKey,
            method: 'GET',
            url: `${API_ROOT}/catalog/gpus`,
            fetchImpl,
        });
        return parseHourlyPrice(body);
    } catch {
        return null;
    }
}

async function quote({ apiKey, fetchImpl }) {
    const balance = await fetchBalance({ apiKey, fetchImpl });
    const hourlyPrice = await fetchHourlyPrice({ apiKey, fetchImpl });
    const low = hourlyPrice !== null && balance.amount < hourlyPrice;
    return {
        ok: true,
        amount: balance.amount,
        currency: balance.currency,
        hourlyPrice,
        low,
        billingUrl: BILLING_URL,
    };
}

function beginJob() {
    if (job) throw new Error('A vork task is already running');
    job = { cancelled: false, podId: null, close: null, owned: new Set() };
    return job;
}

function finishJob() {
    job = null;
}

function throwIfCancelled(current) {
    if (current.cancelled) {
        const error = new Error('Render cancelled');
        error.code = 'CANCELLED';
        throw error;
    }
}

function cancelRemote() {
    if (job) {
        job.cancelled = true;
        try { job.close?.(); } catch { /* the session is already closing */ }
    }
    return { ok: true };
}

async function sleepDefault(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady({ apiKey, podId, fetchImpl, sleep, onProgress, current }) {
    const deadline = Date.now() + READY_MS;
    while (Date.now() < deadline) {
        throwIfCancelled(current);
        onProgress?.({ engine: 'vork', task: 'wait', status: 'wait', elapsedMs: READY_MS - (deadline - Date.now()) });
        const pod = await getPod({ apiKey, podId, fetchImpl });
        const endpoint = pod && isRunning(pod) ? sshEndpoint(pod) : null;
        if (endpoint) return endpoint;
        await sleep(POLL_MS);
    }
    throw new Error('The RunPod pod did not become ready in time');
}

async function terminateOwned({ apiKey, podId, fetchImpl, owned }) {
    if (!owned.has(podId)) throw new Error('Refusing to terminate a pod this app did not rent');
    let pod = null;
    try {
        pod = await getPod({ apiKey, podId, fetchImpl });
    } catch (error) {
        if (error.status === 404) return { ok: true, gone: true };
    }
    if (pod?.name && !String(pod.name).startsWith('vork-')) {
        throw new Error(`Refusing to terminate pod ${podId}`);
    }
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await api({
                apiKey,
                method: 'DELETE',
                url: `${API_ROOT}/pods/${encodeURIComponent(podId)}`,
                fetchImpl,
            });
            return { ok: true };
        } catch (error) {
            if (error.status === 404) return { ok: true, gone: true };
            lastError = error;
        }
    }
    const failure = new Error(`${lastError.message} Pod ${podId} may still be billing. Terminate it in the RunPod console.`);
    failure.podId = podId;
    throw failure;
}

async function runRemoteStill(options) {
    const apiKey = loadApiKey({ paths: options.paths, safeStorage: options.safeStorage });
    if (!apiKey) throw new Error('Save a RunPod API key first');
    let result;
    let failure;
    const owned = new Set();
    const current = beginJob();
    current.owned = owned;
    try {
        result = await runInside(options, current, apiKey);
    } catch (error) {
        failure = error;
    }
    const podId = current.podId;
    const keepPod = options.keepPod === true;
    let terminateError = null;
    if (podId && !keepPod) {
        options.onProgress?.({ engine: 'vork', task: 'shutdown', status: 'shutdown' });
        try {
            await terminateOwned({
                apiKey,
                podId,
                fetchImpl: options.fetchImpl || globalThis.fetch,
                owned,
            });
        } catch (error) {
            terminateError = error;
        }
    }
    finishJob();
    if (terminateError) {
        if (failure) {
            failure.message = `${failure.message} ${terminateError.message}`;
            throw failure;
        }
        throw terminateError;
    }
    if (failure) throw failure;
    return result;
}

async function runInside(options, current, apiKey) {
    const {
        paths,
        profile,
        safeStorage,
        fetchImpl = globalThis.fetch,
        connect,
        sleep = sleepDefault,
        onProgress,
        output = 'png',
        frameStart,
        frameEnd,
    } = options;
    const ssh = ensureSshKey({ paths, safeStorage });
    let scene = options.scene;
    if (!scene) {
        const shotFile = path.join(paths.shotsRoot, DEFAULT_SHOT_ID, 'shot.json');
        try {
            scene = JSON.parse(fs.readFileSync(shotFile, 'utf8'));
        } catch {
            scene = stubScene();
        }
    }
    const plan = planRender({
        shotsRoot: paths.shotsRoot,
        scene,
        profile,
        shotId: DEFAULT_SHOT_ID,
        output,
        frameStart,
        frameEnd,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));
    const glb = glbFiles(plan.scene)[0] || '';
    const glbPath = glb ? path.join(plan.shotDir, path.basename(glb)) : '';
    if (glb && !fs.existsSync(glbPath)) throw new Error(`glTF file ${glb} is not in the shot folder`);

    throwIfCancelled(current);
    onProgress?.({ engine: 'vork', task: 'rent', status: 'rent' });
    await registerSshKey({ apiKey, publicKey: ssh.publicKey, fetchImpl });
    const pod = await createPod({ apiKey, fetchImpl });
    current.podId = pod.id;
    current.owned.add(pod.id);
    if (pod.gpu && pod.gpu.id && pod.gpu.id !== GPU_4090) {
        throw new Error('RunPod offered a GPU other than an RTX 4090');
    }
    const endpoint = await waitUntilReady({
        apiKey,
        podId: pod.id,
        fetchImpl,
        sleep,
        onProgress,
        current,
    });
    throwIfCancelled(current);
    await renderOnPod({
        connect,
        host: endpoint.host,
        port: endpoint.port,
        privateKey: ssh.privateKey,
        profile,
        output: plan.output,
        frameStart: plan.frameStart,
        frameEnd: plan.frameEnd,
        shotPath: plan.shotPath,
        glbPath: glbPath || undefined,
        outPath: plan.outPath,
        onProgress,
    });
    let stat = null;
    try {
        stat = fs.statSync(plan.outPath);
    } catch {
        stat = null;
    }
    if (!stat || !stat.isFile() || stat.size === 0) {
        return {
            kind: plan.kind,
            missing: true,
            message: plan.kind === 'video'
                ? 'vork finished without an output video. ffmpeg is required on the pod.'
                : 'vork finished without an output image.',
            profile,
            shotPath: plan.shotPath,
            outPath: plan.outPath,
            frameStart: plan.frameStart,
            frameEnd: plan.frameEnd,
            podId: pod.id,
        };
    }
    if (plan.kind === 'video') {
        onProgress?.({ engine: 'vork', task: 'render', status: 'done', progress: 1 });
        return {
            kind: 'video',
            profile,
            shotPath: plan.shotPath,
            outPath: plan.outPath,
            fileUrl: pathToFileURL(plan.outPath).href,
            frameStart: plan.frameStart,
            frameEnd: plan.frameEnd,
            podId: pod.id,
        };
    }
    const image = fs.readFileSync(plan.outPath);
    onProgress?.({ engine: 'vork', task: 'render', status: 'done', progress: 1 });
    return {
        kind: 'image',
        url: `data:image/png;base64,${image.toString('base64')}`,
        profile,
        shotPath: plan.shotPath,
        outPath: plan.outPath,
        fileUrl: pathToFileURL(plan.outPath).href,
        podId: pod.id,
    };
}

module.exports = {
    API_ROOT,
    BILLING_URL,
    GPU_4090,
    POD_IMAGE,
    saveApiKey,
    loadApiKey,
    clearApiKey,
    hasApiKey,
    ensureSshKey,
    localStatus,
    createBody,
    createPod,
    parseBalance,
    parseHourlyPrice,
    quote,
    registerSshKey,
    sshEndpoint,
    terminateOwned,
    waitUntilReady,
    runRemoteStill,
    cancelRemote,
    isRemoteBusy,
    storeApiKey,
    accountQuote,
    keyPath,
};
