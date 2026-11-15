// User-owned RunPod rental for Blender Cycles stills.
// Reuses the encrypted vork RunPod key and SSH material so the user
// does not paste the key again. Pods are named blender-* and destroyed after.

const fs = require('fs');
const { pathToFileURL } = require('url');
const {
    API_ROOT,
    BILLING_URL,
    GPU_4090,
    loadApiKey,
    ensureSshKey,
    localStatus: vorkLocalStatus,
    createPod,
    registerSshKey,
    waitUntilReady,
    terminateOwned,
    storeApiKey,
    accountQuote,
} = (() => {
    const vork = require('./vorkRunpod');
    return {
        API_ROOT: vork.API_ROOT,
        BILLING_URL: vork.BILLING_URL,
        GPU_4090: vork.GPU_4090,
        loadApiKey: vork.loadApiKey,
        ensureSshKey: vork.ensureSshKey,
        localStatus: vork.localStatus,
        createPod: vork.createPod,
        registerSshKey: vork.registerSshKey,
        waitUntilReady: vork.waitUntilReady,
        storeApiKey: vork.storeApiKey,
        accountQuote: vork.accountQuote,
    };
})();
const { renderOnPod } = require('./blenderRemote');
const {
    DEFAULT_SHOT_ID,
    REMOTE_JOB_TIMEOUT_MS,
    normalizeSettings,
    planRemoteRender,
} = require('./blenderScene');

let job = null;

function localStatus({ paths, safeStorage }) {
    return vorkLocalStatus({ paths, safeStorage });
}

function isRemoteBusy() {
    return job !== null;
}

function beginJob() {
    if (job) throw new Error('A Blender task is already running');
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

async function blenderTerminateOwned({ apiKey, podId, fetchImpl, owned }) {
    // vork terminateOwned only allows vork-* names; Blender pods use blender-*.
    if (!owned.has(podId)) throw new Error('Refusing to terminate a pod this app did not rent');
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await fetchImpl(`${API_ROOT}/pods/${encodeURIComponent(podId)}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: 'application/json',
                },
            });
            if (response.status === 404) return { ok: true, gone: true };
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text.slice(0, 180) || `RunPod ${response.status}`);
            }
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
        options.onProgress?.({ engine: 'blender', task: 'shutdown', status: 'shutdown' });
        try {
            await blenderTerminateOwned({
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
        safeStorage,
        fetchImpl = globalThis.fetch,
        connect,
        sleep = sleepDefault,
        onProgress,
        blendPath,
    } = options;
    const settings = normalizeSettings(options.settings);
    if (!blendPath || !fs.existsSync(blendPath)) {
        throw new Error('scene.blend is missing. Build the scene on this computer first.');
    }
    const plan = planRemoteRender({
        shotsRoot: paths.shotsRoot,
        scene: options.scene,
        settings,
        shotId: DEFAULT_SHOT_ID,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    const outPath = plan.outPath;
    const ssh = ensureSshKey({ paths, safeStorage });
    const version = options.version || { major: 4, minor: 5, patch: 0 };

    throwIfCancelled(current);
    onProgress?.({ engine: 'blender', task: 'rent', status: 'rent' });
    await registerSshKey({ apiKey, publicKey: ssh.publicKey, fetchImpl });

    // Reuse createPod but rename after — createPod uses vork- prefix via podName.
    // Call createPod then we track the id; prefix check only matters for terminate.
    const pod = await createPod({
        apiKey,
        fetchImpl,
        publicKey: ssh.publicKey,
        clouds: options.clouds,
        name: `blender-${require('crypto').randomBytes(4).toString('hex')}`,
    });
    current.podId = pod.id;
    current.owned.add(pod.id);
    if (pod.gpu && pod.gpu.id && pod.gpu.id !== GPU_4090) {
        throw new Error('RunPod offered a GPU other than an RTX 4090');
    }

    // waitUntilReady sends engine:'vork' progress — wrap to rewrite engine.
    const endpoint = await waitUntilReady({
        apiKey,
        podId: pod.id,
        fetchImpl,
        sleep,
        onProgress: (data) => onProgress?.({ ...data, engine: 'blender' }),
        current,
    });
    throwIfCancelled(current);

    const started = Date.now();
    const watchdog = setTimeout(() => {
        current.cancelled = true;
        try { current.close?.(); } catch { /* closing */ }
    }, REMOTE_JOB_TIMEOUT_MS);

    try {
        await renderOnPod({
            connect,
            host: endpoint.host,
            port: endpoint.port,
            privateKey: ssh.privateKey,
            username: endpoint.username,
            sftp: endpoint.sftp,
            blendPath,
            outPath,
            version,
            samples: settings.samples,
            resolution: settings.resolution,
            onProgress,
            sleep,
        });
    } finally {
        clearTimeout(watchdog);
    }
    if (Date.now() - started > REMOTE_JOB_TIMEOUT_MS) {
        throw new Error('Blender RunPod job timed out after 10 minutes');
    }

    let stat = null;
    try {
        stat = fs.statSync(outPath);
    } catch {
        stat = null;
    }
    if (!stat || !stat.isFile() || stat.size === 0) {
        return {
            kind: 'image',
            missing: true,
            message: 'Blender finished without an output image.',
            blendPath,
            outPath,
            podId: pod.id,
        };
    }
    const image = fs.readFileSync(outPath);
    onProgress?.({ engine: 'blender', task: 'render', status: 'done', progress: 1 });
    return {
        kind: 'image',
        url: `data:image/png;base64,${image.toString('base64')}`,
        blendPath,
        outPath,
        fileUrl: pathToFileURL(outPath).href,
        settings,
        podId: pod.id,
    };
}

module.exports = {
    BILLING_URL,
    GPU_4090,
    localStatus,
    storeApiKey,
    accountQuote,
    runRemoteStill,
    cancelRemote,
    isRemoteBusy,
    loadApiKey,
};
