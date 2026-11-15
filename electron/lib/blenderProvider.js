// Desktop-only Blender bridge. Electron launches the official binary headless.
// Local builds write scene.blend without rendering. Cloud render is separate.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { resolveLocalAiPaths } = require('./localInferencePaths');
const {
    DEFAULT_SHOT_ID,
    LOCAL_BUILD_TIMEOUT_MS,
    discoverBinary,
    missingBinaryMessage,
    parseVersionText,
    isSupportedVersion,
    planBuild,
    buildScriptSource,
    parseSummaryOutput,
    readSummaryFile,
    formatAuditLine,
    normalizeSettings,
    stubScene,
} = require('./blenderScene');
const runpod = require('./blenderRunpod');
const { validateScene } = require('./vorkScene');

let activeChild = null;

function blenderPaths(userDataPath, env = process.env) {
    const { dataDir } = resolveLocalAiPaths({ userDataPath, env });
    const root = path.join(dataDir, 'blender');
    return {
        dataDir,
        root,
        configPath: path.join(dataDir, 'blender.json'),
        shotsRoot: path.join(root, 'shots'),
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
        readdirSync: (dir, options) => fs.readdirSync(dir, options),
    });
}

function readSettings(paths) {
    return normalizeSettings(readConfig(paths.configPath).settings || {});
}

function writeSettings(paths, settings) {
    const config = readConfig(paths.configPath);
    const next = normalizeSettings(settings);
    writeConfig(paths.configPath, { ...config, settings: next });
    return next;
}

function copyGlbIfNeeded(plan, sourceSceneDir) {
    if (!plan.glbName) return;
    if (fs.existsSync(plan.glbPath)) return;
    if (!sourceSceneDir) {
        throw new Error(`glTF file ${plan.glbName} is not in the Blender shot folder`);
    }
    const source = path.join(sourceSceneDir, plan.glbName);
    if (!fs.existsSync(source)) {
        throw new Error(`glTF file ${plan.glbName} is not in the shot folder`);
    }
    fs.copyFileSync(source, plan.glbPath);
}

function prepareShot({ paths, scene, settings, sourceSceneDir }) {
    const plan = planBuild({
        shotsRoot: paths.shotsRoot,
        scene: scene || stubScene(),
        settings: settings || readSettings(paths),
        shotId: DEFAULT_SHOT_ID,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));
    copyGlbIfNeeded(plan, sourceSceneDir);
    const script = buildScriptSource({
        scene: plan.scene,
        settings: plan.settings,
        blendPath: plan.blendPath,
        summaryPath: plan.summaryPath,
        glbPath: plan.glbPath || '',
    });
    fs.writeFileSync(plan.scriptPath, script, 'utf8');
    return plan;
}

function probeBinary(binaryPath, spawnImpl = spawn) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { child.kill('SIGTERM'); } catch { /* already exited */ }
            resolve(result);
        };
        const child = spawnImpl(binaryPath, ['--version'], {
            shell: false,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        const timer = setTimeout(() => {
            finish({ ok: false, binaryPath, error: 'blender --version timed out' });
        }, 15000);
        child.on('error', (error) => {
            finish({ ok: false, binaryPath, error: error.message || String(error) });
        });
        child.on('close', (code) => {
            const text = `${stdout}\n${stderr}`;
            const version = parseVersionText(text);
            if (code === 0 && version) {
                finish({
                    ok: isSupportedVersion(version),
                    binaryPath,
                    version: version.text,
                    major: version.major,
                    minor: version.minor,
                    patch: version.patch,
                    error: isSupportedVersion(version)
                        ? ''
                        : `Blender ${version.text} is too old. Install 4.5 or newer.`,
                });
                return;
            }
            finish({
                ok: false,
                binaryPath,
                error: version ? `blender exited ${code}` : (text.trim() || `blender exited ${code}`),
            });
        });
    });
}

function runLocalBuild({
    binaryPath,
    paths,
    scene,
    settings,
    sourceSceneDir,
    onProgress,
    spawnImpl = spawn,
    timeoutMs = LOCAL_BUILD_TIMEOUT_MS,
}) {
    if (activeChild) throw new Error('A Blender task is already running');
    if (!binaryPath) throw new Error(missingBinaryMessage({ platform: process.platform }));
    const plan = prepareShot({ paths, scene, settings, sourceSceneDir });
    const started = Date.now();
    onProgress?.({ engine: 'blender', task: 'build', status: 'build', progress: 0, elapsedMs: 0 });

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearInterval(tick);
            activeChild = null;
            fn(value);
        };
        const child = spawnImpl(binaryPath, plan.args, {
            shell: false,
            windowsHide: true,
            cwd: plan.shotDir,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        activeChild = child;
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        const tick = setInterval(() => {
            onProgress?.({
                engine: 'blender',
                task: 'build',
                status: 'build',
                elapsedMs: Date.now() - started,
            });
        }, 700);
        const timer = setTimeout(() => {
            try { child.kill('SIGTERM'); } catch { /* already exited */ }
            finish(reject, new Error('Blender build timed out after 120s'));
        }, timeoutMs);
        child.on('error', (error) => {
            finish(reject, error);
        });
        child.on('close', (code) => {
            if (code !== 0) {
                const tail = `${stderr}\n${stdout}`.trim().split('\n').slice(-20).join('\n');
                finish(reject, new Error(tail || `Blender exited ${code ?? 'signal'}`));
                return;
            }
            let summary = null;
            try {
                summary = parseSummaryOutput(stdout) || readSummaryFile(plan.summaryPath);
            } catch (error) {
                finish(reject, error);
                return;
            }
            if (!summary || typeof summary.objectCount !== 'number') {
                finish(reject, new Error('Blender finished without an object summary'));
                return;
            }
            if (!fs.existsSync(plan.blendPath)) {
                finish(reject, new Error('Blender finished without scene.blend'));
                return;
            }
            onProgress?.({ engine: 'blender', task: 'build', status: 'done', progress: 1 });
            finish(resolve, {
                ok: true,
                kind: 'blend',
                blendPath: plan.blendPath,
                shotPath: plan.shotPath,
                summary,
                audit: formatAuditLine(summary),
                settings: plan.settings,
                fileUrl: pathToFileURL(plan.blendPath).href,
            });
        });
    });
}

function cancelBuild() {
    if (activeChild) {
        activeChild.kill('SIGTERM');
        activeChild = null;
    }
    runpod.cancelRemote();
    return { ok: true };
}

function createHandlers(options) {
    const paths = () => blenderPaths(options.userDataPath);
    const sendProgress = (data) => options.onProgress?.(data);
    const safeStorage = options.safeStorage;
    const vorkShotsRoot = () => {
        const { dataDir } = resolveLocalAiPaths({ userDataPath: options.userDataPath });
        return path.join(dataDir, 'vork', 'shots', DEFAULT_SHOT_ID);
    };

    return {
        getStatus() {
            const store = paths();
            const binaryPath = resolveBinary(store);
            const settings = readSettings(store);
            return {
                found: Boolean(binaryPath),
                binaryPath: binaryPath || '',
                settings,
            };
        },

        setBinaryPath(binaryPath) {
            const candidate = typeof binaryPath === 'string' ? binaryPath.trim() : '';
            if (!candidate || !fs.existsSync(candidate)) {
                throw new Error('Blender binary was not found at that path');
            }
            const resolved = path.resolve(candidate);
            const store = paths();
            writeConfig(store.configPath, { ...readConfig(store.configPath), binaryPath: resolved });
            return { ok: true, binaryPath: resolved };
        },

        getSettings() {
            return readSettings(paths());
        },

        setSettings(settings) {
            return writeSettings(paths(), settings);
        },

        probe() {
            const binaryPath = resolveBinary(paths());
            if (!binaryPath) {
                return { ok: false, binaryPath: '', error: missingBinaryMessage({ platform: process.platform }) };
            }
            return probeBinary(binaryPath);
        },

        async build(params = {}) {
            if (runpod.isRemoteBusy()) throw new Error('A Blender task is already running');
            const store = paths();
            const binaryPath = resolveBinary(store);
            let scene = params.scene;
            if (!scene) {
                try {
                    scene = validateScene(JSON.parse(fs.readFileSync(
                        path.join(vorkShotsRoot(), 'shot.json'),
                        'utf8',
                    )));
                } catch {
                    scene = stubScene();
                }
            }
            return runLocalBuild({
                binaryPath,
                paths: store,
                scene,
                settings: params.settings || readSettings(store),
                sourceSceneDir: vorkShotsRoot(),
                onProgress: sendProgress,
            });
        },

        runpodStatus() {
            return runpod.localStatus({ paths: paths(), safeStorage });
        },

        setRunpodKey(apiKey) {
            return runpod.storeApiKey({ paths: paths(), apiKey, safeStorage });
        },

        runpodQuote() {
            return runpod.accountQuote({ paths: paths(), safeStorage });
        },

        async render(params = {}) {
            if (activeChild) throw new Error('A Blender task is already running');
            const store = paths();
            const binaryPath = resolveBinary(store);
            let scene = params.scene;
            if (!scene) {
                try {
                    scene = validateScene(JSON.parse(fs.readFileSync(
                        path.join(vorkShotsRoot(), 'shot.json'),
                        'utf8',
                    )));
                } catch {
                    scene = stubScene();
                }
            }
            const settings = params.settings || readSettings(store);
            const probed = await probeBinary(binaryPath);
            if (!probed.ok) throw new Error(probed.error || 'Blender is not usable');
            const built = await runLocalBuild({
                binaryPath,
                paths: store,
                scene,
                settings,
                sourceSceneDir: vorkShotsRoot(),
                onProgress: sendProgress,
            });
            const remote = await runpod.runRemoteStill({
                paths: store,
                blendPath: built.blendPath,
                settings,
                version: {
                    major: probed.major,
                    minor: probed.minor,
                    patch: probed.patch,
                },
                safeStorage,
                onProgress: sendProgress,
                keepPod: params.keepPod === true,
            });
            return {
                ...remote,
                audit: built.audit,
                summary: built.summary,
                blendPath: built.blendPath,
            };
        },

        openBilling() {
            if (typeof options.openExternal === 'function') {
                return options.openExternal(runpod.BILLING_URL);
            }
            return runpod.BILLING_URL;
        },

        cancel() {
            return cancelBuild();
        },
    };
}

function register() {
    const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
    const handlers = createHandlers({
        userDataPath: app.getPath('userData'),
        safeStorage,
        openExternal: (url) => shell.openExternal(url),
        onProgress: (data) => {
            const win = BrowserWindow.getAllWindows()[0] || null;
            win?.webContents.send('local-ai:progress', data);
        },
    });

    ipcMain.handle('blender:get-status', () => handlers.getStatus());
    ipcMain.handle('blender:set-binary-path', (_event, binaryPath) => handlers.setBinaryPath(binaryPath));
    ipcMain.handle('blender:get-settings', () => handlers.getSettings());
    ipcMain.handle('blender:set-settings', (_event, settings) => handlers.setSettings(settings));
    ipcMain.handle('blender:probe', () => handlers.probe());
    ipcMain.handle('blender:build', (_event, params) => handlers.build(params));
    ipcMain.handle('blender:render', (_event, params) => handlers.render(params));
    ipcMain.handle('blender:runpod-status', () => handlers.runpodStatus());
    ipcMain.handle('blender:runpod-set-key', (_event, apiKey) => handlers.setRunpodKey(apiKey));
    ipcMain.handle('blender:runpod-quote', () => handlers.runpodQuote());
    ipcMain.handle('blender:runpod-open-billing', () => handlers.openBilling());
    ipcMain.handle('blender:cancel', () => handlers.cancel());
}

module.exports = {
    register,
    createHandlers,
    blenderPaths,
    resolveBinary,
    probeBinary,
    runLocalBuild,
    cancelBuild,
    prepareShot,
    readSettings,
    writeSettings,
};
