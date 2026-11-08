import { getTemplateWorkflows } from 'studio/src/muapi.js';
import { localWorkflowThumbnail } from 'studio/src/lib/workflowThumbs.js';
import { t } from '../lib/i18n.js';

function coverUrl(workflow) {
    return localWorkflowThumbnail(workflow?.slug) || workflow?.thumbnail || '';
}

function fileNameFromUrl(url) {
    if (!url) return '';
    const clean = url.split('?')[0];
    return clean.slice(clean.lastIndexOf('/') + 1);
}

export function WorkflowStudio() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto bg-app-bg text-white';

    const wrap = document.createElement('div');
    wrap.className = 'max-w-[1400px] mx-auto px-6 py-8';

    const title = document.createElement('h1');
    title.className = 'text-2xl font-bold mb-1';
    title.textContent = t('workflows.title');

    const sub = document.createElement('p');
    sub.className = 'text-sm text-white/50 mb-6';
    sub.textContent = t('workflows.desktopHint');

    const grid = document.createElement('div');
    grid.className = 'grid gap-4';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';

    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(grid);
    container.appendChild(wrap);

    const status = document.createElement('p');
    status.className = 'text-sm text-white/50';
    status.textContent = t('workflows.loading');
    grid.appendChild(status);

    const apiKey = localStorage.getItem('muapi_key');
    if (!apiKey) {
        status.textContent = t('workflows.needKey');
        return container;
    }

    getTemplateWorkflows(apiKey)
        .then((data) => {
            const workflows = Array.isArray(data) ? data : [];
            grid.innerHTML = '';
            if (workflows.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'text-sm text-white/50';
                empty.textContent = t('workflows.empty');
                grid.appendChild(empty);
                return;
            }
            workflows.forEach((workflow) => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a] text-left group';

                const src = coverUrl(workflow);
                if (src) {
                    const img = document.createElement('img');
                    img.alt = workflow.name || workflow.slug || '';
                    img.className = 'absolute inset-0 w-full h-full object-cover';
                    img.src = src;
                    const localFile = fileNameFromUrl(localWorkflowThumbnail(workflow?.slug) || src);
                    img.onerror = () => {
                        img.onerror = null;
                        if (localFile) img.src = `./workflow-thumbs/${localFile}`;
                    };
                    card.appendChild(img);
                }

                const shade = document.createElement('div');
                shade.className = 'absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent';
                card.appendChild(shade);

                const label = document.createElement('div');
                label.className = 'absolute inset-x-0 bottom-0 p-3';
                const cat = document.createElement('div');
                cat.className = 'text-[10px] font-bold text-[#22d3ee] uppercase tracking-wider mb-1';
                cat.textContent = workflow.category || 'General';
                const name = document.createElement('div');
                name.className = 'text-sm font-bold truncate';
                name.textContent = workflow.name || workflow.slug || 'Untitled';
                label.appendChild(cat);
                label.appendChild(name);
                card.appendChild(label);
                grid.appendChild(card);
            });
        })
        .catch((err) => {
            status.textContent = err?.message || t('workflows.loadError');
        });

    return container;
}
