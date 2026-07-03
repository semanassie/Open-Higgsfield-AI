export function SettingsModal(onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '100';

    const modal = document.createElement('div');
    modal.className = 'bg-card p-6 rounded-xl border border-border-color w-96 glass';
    modal.style.background = 'var(--bg-card)';
    modal.style.padding = '1.5rem';
    modal.style.borderRadius = 'var(--border-radius-xl)';
    modal.style.border = '1px solid var(--border-color)';
    modal.style.width = '28rem';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';

    const title = document.createElement('h2');
    title.textContent = 'API Keys';
    title.className = 'text-xl font-bold mb-4';
    title.style.marginBottom = '1rem';

    modal.appendChild(title);

    // --- Multi-provider API key fields ---
    const keys = [
        { id: 'muapi_key', label: 'Muapi API Key (Required)', placeholder: 'Enter your Muapi API key...', url: 'https://muapi.ai', urlLabel: 'Get key at muapi.ai' },
        { id: 'kling_key', label: 'Kling AI API Key (Optional)', placeholder: 'Enter your Kling API key...', url: 'https://klingai.com/global/dev', urlLabel: 'Get key at klingai.com' },
    ];

    const inputs = {};

    keys.forEach(k => {
        const label = document.createElement('label');
        label.textContent = k.label;
        label.className = 'block text-sm text-secondary mb-1';
        label.style.marginTop = '0.75rem';

        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'w-full mb-1 p-2 rounded bg-input border border-border-color';
        input.value = localStorage.getItem(k.id) || '';
        input.placeholder = k.placeholder;
        input.style.width = '100%';
        input.style.marginBottom = '0.25rem';
        inputs[k.id] = input;

        const link = document.createElement('a');
        link.href = k.url;
        link.target = '_blank';
        link.textContent = k.urlLabel + ' \u2192';
        link.style.fontSize = '0.75rem';
        link.style.color = 'var(--color-primary, #d9ff00)';
        link.style.opacity = '0.7';
        link.style.display = 'block';
        link.style.marginBottom = '0.75rem';

        modal.appendChild(label);
        modal.appendChild(input);
        modal.appendChild(link);
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex justify-end gap-2';
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.gap = '0.5rem';
    btnContainer.style.marginTop = '1rem';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'px-4 py-2 rounded hover:bg-white/5';
    cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        if (onClose) onClose();
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'px-4 py-2 rounded bg-primary text-black font-medium';
    saveBtn.style.backgroundColor = 'var(--color-primary)';
    saveBtn.style.color = 'black';
    saveBtn.style.fontWeight = '500';

    saveBtn.onclick = async () => {
        let saved = false;
        const envPayload = {};
        keys.forEach(k => {
            const val = inputs[k.id].value.trim();
            if (val) {
                localStorage.setItem(k.id, val);
                envPayload[k.id] = val;
                saved = true;
            }
        });
        if (!saved) {
            alert('Please enter at least the Muapi API key');
            return;
        }

        // Also persist to .env file via Vite dev-server middleware
        let envSaved = false;
        try {
            const res = await fetch('/local/save-env', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envPayload),
            });
            const json = await res.json();
            envSaved = json.ok === true;
        } catch {
            // Silently skip — not available in production builds
        }

        const msg = envSaved
            ? 'API Keys saved to localStorage and .env ✓'
            : 'API Keys saved! (localStorage only — restart app to update .env)';
        alert(msg);
        document.body.removeChild(overlay);
        if (onClose) onClose();
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(saveBtn);
    modal.appendChild(btnContainer);

    overlay.appendChild(modal);

    // Close on outside click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
            if (onClose) onClose();
        }
    });

    return overlay;
}
