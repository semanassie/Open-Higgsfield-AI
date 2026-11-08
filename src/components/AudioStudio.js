import { t } from '../lib/i18n.js';

/**
 * Electron/Vite Audio aperture.
 * Full AudioStudio (React + audioModels) lives in the hosted Next app.
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

    const link = document.createElement('a');
    link.href = t('audio.webUrl');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'muapi.ai/open-generative-ai';
    link.className = 'text-sm text-primary underline';

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(sub);
    container.appendChild(link);
    return container;
}
