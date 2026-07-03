import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.resolve(process.cwd(), '.env');

function readEnvPairs() {
    if (!fs.existsSync(ENV_FILE)) return {};
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    const pairs = {};
    for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) pairs[match[1].trim()] = match[2].trim();
    }
    return pairs;
}

function writeEnvPairs(pairs) {
    const content = Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    fs.writeFileSync(ENV_FILE, content, 'utf8');
}

function saveEnvPlugin() {
    return {
        name: 'save-env',
        configureServer(server) {
            server.middlewares.use('/local/save-env', (req, res) => {
                if (req.method !== 'POST') {
                    res.writeHead(405).end('Method Not Allowed');
                    return;
                }
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        const pairs = readEnvPairs();
                        if (data.muapi_key) pairs['VITE_MUAPI_KEY'] = data.muapi_key;
                        if (data.kling_key)  pairs['VITE_KLING_KEY']  = data.kling_key;
                        writeEnvPairs(pairs);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true }));
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, error: err.message }));
                    }
                });
            });
        }
    };
}

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        saveEnvPlugin(),
    ],
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
        proxy: {
            '/api': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false
            },
            '/muapi-cdn': {
                target: 'https://cdn.muapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/muapi-cdn/, ''),
            },
        }
    }
});
