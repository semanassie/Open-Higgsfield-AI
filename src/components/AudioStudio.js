import { t } from '../lib/i18n.js';

/**
 * Electron/Vite Audio aperture.
 * Full AudioStudio (React + audioModels) lives in Next StandaloneShell at /studio/audio.
 * Per TEAM-ARCH-GATE §7: Electron only opens the nav path — do not duplicate the catalog.
 */
export function AudioStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center justify-center bg-app-bg text-white gap-4 px-6';

    const icon = document.createElement('div');
    icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
    </svg>`;

    const title = document.createElement('p');
    title.textContent = t('audio.title');
    title.className = 'text-lg font-bold opacity-60';

    const sub = document.createElement('p');
    sub.textContent = t('audio.webOnly');
    sub.className = 'text-sm opacity-40 text-center max-w-md';

    const pathHint = document.createElement('code');
    pathHint.textContent = '/studio/audio';
    pathHint.className = 'text-xs font-mono text-primary/80 bg-white/5 px-3 py-1.5 rounded-md border border-white/10';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = t('audio.openWeb');
    openBtn.className = 'mt-2 px-4 py-2 rounded-md border border-white/10 bg-white/5 text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-primary/40 transition-colors';
    openBtn.onclick = () => {
        // Prefer local Next when available; otherwise public web app.
        const local = `${window.location.protocol}//localhost:3000/studio/audio`;
        const publicUrl = 'https://open-generative-ai.com/studio/audio';
        const target = window.location.port === '3000' ? '/studio/audio' : local;
        try {
            window.open(target, '_blank', 'noopener,noreferrer');
        } catch {
            window.open(publicUrl, '_blank', 'noopener,noreferrer');
        }
    };

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(sub);
    container.appendChild(pathHint);
    container.appendChild(openBtn);
    return container;
}
