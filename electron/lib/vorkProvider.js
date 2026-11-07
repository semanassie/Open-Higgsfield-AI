// Desktop-only vork engine. Electron launches the official binary.
// The renderer never renders and never receives a shell. This slice covers
// binary discovery, scene JSON written by the agent, and a still PNG launch.
// No MP4, no glTF, no `vork setup` button.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveLocalAiPaths } = require('./localInferencePaths');
const {
    DEFAULT_SHOT_ID,
    discoverBinary,
    planRender,
    stubScene,
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

function runRender({
    binaryPath,
    paths,
    scene,
    profile,
    spawnImpl = spawn,
    onProgress,
}) {
    if (activeChild) throw new Error('A vork render is already running');
    const binary = binaryPath || resolveBinary(paths);
    if (!binary) {
        throw new Error('vork binary was not found. Install the official release or set its path.');
    }
    const plan = planRender({
        shotsRoot: paths.shotsRoot,
        scene: scene || readCurrentScene(paths),
        profile,
        shotId: DEFAULT_SHOT_ID,
    });
    fs.mkdirSync(plan.shotDir, { recursive: true });
    fs.mkdirSync(paths.cacheDir, { recursive: true });
    fs.writeFileSync(plan.shotPath, JSON.stringify(plan.scene, null, 2));

    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const send = (extra = {}) => {
            onProgress?.({
                engine: 'vork',
                status: 'rendering',
                progress: 0,
                elapsedMs: Date.now() - startedAt,
                ...extra,
            });
        };
        send({ status: 'starting' });
        const heartbeat = setInterval(() => send(), 5000);

        let child;
        try {
            child = spawnImpl(binary, plan.args, {
                shell: false,
                env: { ...process.env, VORK_CACHE_DIR: paths.cacheDir },
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
        child.on('error', (err) => {
            clearInterval(heartbeat);
            if (activeChild === child) activeChild = null;
            reject(err);
        });
        child.on('close', (code) => {
            clearInterval(heartbeat);
            if (activeChild === child) activeChild = null;
            if (code !== 0) {
                const tail = output.trim().split('\n').slice(-20).join('\n');
                reject(new Error(tail || `vork exited ${code ?? 'signal'}`));
                return;
            }
            if (!fs.existsSync(plan.outPath)) {
                reject(new Error('vork finished without an output image'));
                return;
            }
            try {
                const img = fs.readFileSync(plan.outPath);
                const url = `data:image/png;base64,${img.toString('base64')}`;
                onProgress?.({ engine: 'vork', status: 'done', progress: 1 });
                resolve({ url, profile, shotPath: plan.shotPath, outPath: plan.outPath });
            } catch (err) {
                reject(err);
            }
        });
    });
}

function cancelRender() {
    if (activeChild) {
        activeChild.kill('SIGTERM');
        activeChild = null;
    }
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
        return { found: Boolean(binaryPath), binaryPath: binaryPath || '' };
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
        if (!binaryPath) return { ok: false, binaryPath: '', error: 'vork binary was not found' };
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

    ipcMain.handle('vork:render', (_event, params = {}) => {
        const store = paths();
        return runRender({
            binaryPath: resolveBinary(store),
            paths: store,
            scene: params.scene,
            profile: params.profile,
            onProgress: sendProgress,
        });
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
    cancelRender,
};
