// Desktop-only vork engine. Electron launches the official binary.
// The page does not render. Stills, frame-range MP4, glTF copy, and
// `vork setup` all go through this process with shell disabled.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { resolveLocalAiPaths } = require('./localInferencePaths');
const runpod = require('./vorkRunpod');
const {
    DEFAULT_SHOT_ID,
    GLB_FILE,
    discoverBinary,
    glbFiles,
    missingBinaryMessage,
    planRender,
    stubScene,
    upsertAsset,
    validateScene,
} = require('./vorkScene');

let activeChild = null;

function vorkPaths(userDataPath, env = process.env) {
    const { dataDir } = resolveLocalAiPaths({ userDataPath, env });
    const root = path.join(dataDir, 'vork');
    return {
        dataDir,
        root,
        configPath: path.join(dataDir, 'vork.json'),
        shotsRoot: path.join(root, 'shots'),
        cacheDir: path.join(root, 'cache'),
    };
}

function readConfig(configPath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeConfig(configPath, config) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function resolveBinary(paths, env = process.env) {
    const savedPath = readConfig(paths.configPath).binaryPath || '';
    return discoverBinary({
        platform: process.platform,
        env,
        homedir: os.homedir(),
        savedPath,
        existsSync: (candidate) => fs.existsSync(candidate),
    });
}

function readCurrentScene(paths) {
    const shotPath = path.join(paths.shotsRoot, DEFAULT_SHOT_ID, 'shot.json');
    try {
        return validateScene(JSON.parse(fs.readFileSync(shotPath, 'utf8')));
    } catch (err) {
        if (err && err.code === 'ENOENT') return stubScene();
        if (err && err.code) return stubScene();
        throw err;
    }
}

function probeBinary(binaryPath, spawnImpl = spawn) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        let child;
        try {
            child = spawnImpl(binaryPath, ['--version'], { shell: false });
        } catch (err) {
            finish({ ok: false, binaryPath, error: err.message });
            return;
        }
        let output = '';
        const timer = setTimeout(() => {
            child.kill('SIGTERM');
            finish({ ok: false, binaryPath, error: 'vork --version timed out' });
        }, 20000);
        child.stdout?.on('data', (chunk) => { output += chunk.toString(); });
        child.stderr?.on('data', (chunk) => { output += chunk.toString(); });
        child.on('error', (err) => finish({ ok: false, binaryPath, error: err.message }));
        child.on('close', (code) => {
            const version = output.trim();
            if (code === 0) finish({ ok: true, binaryPath, version });
            else finish({ ok: false, binaryPath, error: version || `vork exited ${code}` });
        });
    });
}

function requireBinary(binaryPath, paths, lookup) {
    const binary = binaryPath || (typeof lookup === 'function' ? lookup() : resolveBinary(paths));
    if (!binary) throw new Error(missingBinaryMessage({ platform: process.platform }));
    return binary;
}

function spawnTracked({
    binary,
    args,
    cacheDir,
    spawnImpl = spawn,
    onProgress,
    task,
}) {
    if (activeChild) throw new Error('A vork task is already running');
    return new Promise((resolve, reject) => {
        let settled = false;
        const startedAt = Date.now();
        const send = (extra = {}) => {
            onProgress?.({
                engine: 'vork',
                task,
                status: task,
                progress: 0,
                elapsedMs: Date.now() - startedAt,
                ...extra,
            });
        };
        send({ status: 'starting' });
        const heartbeat = setInterval(() => send(), 5000);
        let child;
        try {
            child = spawnImpl(binary, args, {
                shell: false,
                env: { ...process.env, VORK_CACHE_DIR: cacheDir },
            });
        } catch (err) {
            clearInterval(heartbeat);
            reject(err);
            return;
        }
        activeChild = child;
        let output = '';
        const collect = (chunk) => { output += chunk.toString(); };
        child.stdout?.on('data', collect);
        child.stderr?.on('data', collect);
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearInterval(heartbeat);
            if (activeChild === child) activeChild = null;
            fn(value);
        };
        child.on('error', (err) => finish(reject, err));
        child.on('close', (code) => {
            if (code !== 0) {
                const tail = output.trim().split('\n').slice(-20).join('\n');
                finish(reject, new Error(tail || `vork exited ${code ?? 'signal'}`));
                return;
            }
            finish(resolve, undefined);
        });
    });
}

function missingGlb(plan) {
    return glbFiles(plan.scene).find((file) => !fs.existsSync(path.join(plan.shotDir, file)));
}

function runRender({
    binaryPath,
    paths,
    scene,
    profile,
    output = 'png',
    frameStart,
    frameEnd,
    spawnImpl = spawn,
    onProgress,
    lookup,
}) {
    const binary = requireBinary(binaryPath, paths, lookup);
    const plan = planRender({
        shotsRoot: paths.shotsRoot,
        scene: scene || readCurrentScene(paths),
        profile,
        shotId: DEFAULT_SHOT_ID,
        output,
        frameStart,
        frameEnd,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    fs.mkdirSync(paths.cacheDir, { recursive: true });
    fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));
    const missing = missingGlb(plan);
    if (missing) throw new Error(`glTF file ${missing} is not in the shot folder`);

    return spawnTracked({
        binary,
        args: plan.args,
        cacheDir: paths.cacheDir,
        spawnImpl,
        onProgress,
        task: 'render',
    }).then(() => {
        let outputStat = null;
        try {
            outputStat = fs.statSync(plan.outPath);
        } catch {
            outputStat = null;
        }
        if (!outputStat || !outputStat.isFile() || outputStat.size === 0) {
            const message = plan.kind === 'video'
                ? 'vork finished without an output video. Install ffmpeg, then render the clip again.'
                : 'vork finished without an output image. Check the binary path, then run Preview again.';
            return {
                kind: plan.kind,
                missing: true,
                message,
                profile,
                shotPath: plan.shotPath,
                outPath: plan.outPath,
                frameStart: plan.frameStart,
                frameEnd: plan.frameEnd,
            };
        }
        onProgress?.({ engine: 'vork', task: 'render', status: 'done', progress: 1 });
        if (plan.kind === 'video') {
            return {
                kind: 'video',
                profile,
                shotPath: plan.shotPath,
                outPath: plan.outPath,
                fileUrl: pathToFileURL(plan.outPath).href,
                frameStart: plan.frameStart,
                frameEnd: plan.frameEnd,
            };
        }
        const img = fs.readFileSync(plan.outPath);
        return {
            kind: 'image',
            url: `data:image/png;base64,${img.toString('base64')}`,
            profile,
            shotPath: plan.shotPath,
            outPath: plan.outPath,
        };
    });
}

function runSetup({
    binaryPath,
    paths,
    spawnImpl = spawn,
    onProgress,
}) {
    const binary = requireBinary(binaryPath, paths);
    fs.mkdirSync(paths.cacheDir, { recursive: true });
    return spawnTracked({
        binary,
        args: ['setup'],
        cacheDir: paths.cacheDir,
        spawnImpl,
        onProgress,
        task: 'setup',
    }).then(() => {
        writeConfig(paths.configPath, {
            ...readConfig(paths.configPath),
            setupComplete: true,
            setupCompletedAt: new Date().toISOString(),
        });
        onProgress?.({ engine: 'vork', task: 'setup', status: 'done', progress: 1 });
        return { ok: true };
    });
}

function importGltf({ paths, sourcePath, scene }) {
    if (typeof sourcePath !== 'string' || !sourcePath.trim()) {
        throw new Error('glTF file was not found');
    }
    const source = path.resolve(sourcePath.trim());
    if (!/\.glb$/i.test(source)) throw new Error('only .glb files can be imported');
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw new Error('glTF file was not found');
    }
    const next = upsertAsset(scene || readCurrentScene(paths), GLB_FILE);
    const plan = planRender({
        shotsRoot: paths.shotsRoot,
        scene: next,
        profile: 'std/previs',
        shotId: DEFAULT_SHOT_ID,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    const dest = path.join(plan.shotDir, GLB_FILE);
    fs.copyFileSync(source, dest);
    fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));
    return { ok: true, file: GLB_FILE, scene: plan.scene, shotPath: plan.shotPath };
}

function assertShotFile(paths, target) {
    if (typeof target !== 'string' || !target.trim()) throw new Error('output path is required');
    const root = path.resolve(paths.shotsRoot);
    const resolved = path.resolve(target);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error('path escapes the shot directory');
    }
    return resolved;
}

function cancelRender() {
    if (activeChild) {
        activeChild.kill('SIGTERM');
        activeChild = null;
    }
    runpod.cancelRemote();
    return { ok: true };
}

function register() {
    const { app, BrowserWindow, ipcMain } = require('electron');
    const paths = () => vorkPaths(app.getPath('userData'));
    const sendProgress = (data) => {
        const win = BrowserWindow.getAllWindows()[0] || null;
        win?.webContents.send('local-ai:progress', data);
    };

    ipcMain.handle('vork:get-status', () => {
        const store = paths();
        const binaryPath = resolveBinary(store);
        const config = readConfig(store.configPath);
        return {
            found: Boolean(binaryPath),
            binaryPath: binaryPath || '',
            setupComplete: Boolean(config.setupComplete),
        };
    });

    ipcMain.handle('vork:set-binary-path', (_event, binaryPath) => {
        const candidate = typeof binaryPath === 'string' ? binaryPath.trim() : '';
        if (!candidate || !fs.existsSync(candidate)) {
            throw new Error('vork binary was not found at that path');
        }
        const resolved = path.resolve(candidate);
        const store = paths();
        writeConfig(store.configPath, { ...readConfig(store.configPath), binaryPath: resolved });
        return { ok: true, binaryPath: resolved };
    });

    ipcMain.handle('vork:probe', () => {
        const binaryPath = resolveBinary(paths());
        if (!binaryPath) return { ok: false, binaryPath: '', error: missingBinaryMessage({ platform: process.platform }) };
        return probeBinary(binaryPath);
    });

    ipcMain.handle('vork:get-scene', () => readCurrentScene(paths()));

    ipcMain.handle('vork:write-scene', (_event, scene) => {
        const store = paths();
        const plan = planRender({
            shotsRoot: store.shotsRoot,
            scene,
            profile: 'std/previs',
            shotId: DEFAULT_SHOT_ID,
        });
        fs.mkdirSync(plan.shotDir, { recursive: true });
        fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));
        return { ok: true, shotPath: plan.shotPath, scene: plan.scene };
    });

    ipcMain.handle('vork:setup', () => {
        const store = paths();
        return runSetup({
            binaryPath: resolveBinary(store),
            paths: store,
            onProgress: sendProgress,
        });
    });

    ipcMain.handle('vork:import-gltf', async (_event, params = {}) => {
        const store = paths();
        let sourcePath = params.sourcePath;
        if (!sourcePath) {
            const { dialog, BrowserWindow } = require('electron');
            const win = BrowserWindow.getAllWindows()[0] || null;
            const dialogOptions = {
                title: 'Import glTF',
                properties: ['openFile'],
                filters: [{ name: 'glTF', extensions: ['glb'] }],
            };
            const picked = win
                ? await dialog.showOpenDialog(win, dialogOptions)
                : await dialog.showOpenDialog(dialogOptions);
            if (picked.canceled || !picked.filePaths[0]) return { ok: false, cancelled: true };
            sourcePath = picked.filePaths[0];
        }
        return importGltf({ paths: store, sourcePath });
    });

    ipcMain.handle('vork:render', async (_event, params = {}) => {
        if (runpod.isRemoteBusy()) throw new Error('A vork task is already running');
        const store = paths();
        const binaryPath = resolveBinary(store);
        if (!readConfig(store.configPath).setupComplete) {
            await runSetup({ binaryPath, paths: store, onProgress: sendProgress });
        }
        return runRender({
            binaryPath,
            paths: store,
            scene: params.scene,
            profile: params.profile,
            output: params.output,
            frameStart: params.frameStart,
            frameEnd: params.frameEnd,
            onProgress: sendProgress,
        });
    });

    ipcMain.handle('vork:open-output', (_event, outPath) => {
        const { shell } = require('electron');
        const target = assertShotFile(paths(), outPath);
        return shell.openPath(target);
    });

    ipcMain.handle('vork:runpod-status', () => {
        const { safeStorage } = require('electron');
        return runpod.localStatus({ paths: paths(), safeStorage });
    });

    ipcMain.handle('vork:runpod-set-key', (_event, apiKey) => {
        const { safeStorage } = require('electron');
        return runpod.storeApiKey({ paths: paths(), apiKey, safeStorage });
    });

    ipcMain.handle('vork:runpod-quote', () => {
        const { safeStorage } = require('electron');
        return runpod.accountQuote({ paths: paths(), safeStorage });
    });

    ipcMain.handle('vork:runpod-render', (_event, params = {}) => {
        if (activeChild) throw new Error('A vork task is already running');
        const { safeStorage } = require('electron');
        return runpod.runRemoteStill({
            paths: paths(),
            scene: params.scene,
            profile: params.profile,
            output: params.output,
            frameStart: params.frameStart,
            frameEnd: params.frameEnd,
            safeStorage,
            onProgress: sendProgress,
            keepPod: params.keepPod === true,
        });
    });

    ipcMain.handle('vork:runpod-open-billing', () => {
        const { shell } = require('electron');
        return shell.openExternal(runpod.BILLING_URL);
    });

    ipcMain.handle('vork:cancel', () => cancelRender());
}

module.exports = {
    register,
    vorkPaths,
    resolveBinary,
    readCurrentScene,
    probeBinary,
    runRender,
    runSetup,
    importGltf,
    cancelRender,
};
