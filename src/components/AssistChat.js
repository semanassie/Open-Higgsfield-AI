import { muapi } from '../lib/muapi.js';
import { AuthModal } from './AuthModal.js';
import { ASSIST_SYSTEM_PROMPT, TOOL_LABELS } from '../lib/assistPrompt.js';
import {
    parseToolCall, stripToolBlock, executeAssistTool, toolNeedsCreditConfirmation,
} from '../lib/assistTools.js';
import {
    LLM_MODELS, LLM_PREF_KEY, resolveLlmModelId,
} from '../lib/llmModels.js';

export function AssistChat() {
    const container = document.createElement('div');
    container.className = 'flex flex-col h-full w-full';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    let messages = [];
    let isLoading = false;
    let selectedModel = resolveLlmModelId('assist');

    const hero = document.createElement('div');
    hero.style.padding = '1.5rem 2rem 0.75rem';
    hero.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    hero.style.flexShrink = '0';

    const heroRow = document.createElement('div');
    heroRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;flex-wrap:wrap;';
    heroRow.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:12px;background:rgba(217,255,0,0.1);border:1px solid rgba(217,255,0,0.2);display:flex;align-items:center;justify-content:center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9ff00" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <div>
                <h1 style="font-size:1.25rem;font-weight:800;color:white;margin:0;">Assist</h1>
                <p style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin:0;">Creative Copilot · Tool Calling</p>
            </div>
        </div>
    `;

    const modelWrap = document.createElement('div');
    modelWrap.style.cssText = 'display:flex;flex-direction:column;gap:0.25rem;min-width:180px;';
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model';
    modelLabel.style.cssText = 'font-size:0.65rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;';
    const modelSelect = document.createElement('select');
    modelSelect.style.cssText = 'padding:0.4rem 0.6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.4);color:white;font-size:0.75rem;';
    const groups = [...new Set(LLM_MODELS.map((m) => m.group || 'Other'))];
    groups.forEach((group) => {
        const og = document.createElement('optgroup');
        og.label = group;
        LLM_MODELS.filter((m) => (m.group || 'Other') === group).forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.badge ? `${m.name} · ${m.badge}` : m.name;
            if (m.id === selectedModel) opt.selected = true;
            og.appendChild(opt);
        });
        modelSelect.appendChild(og);
    });
    modelSelect.onchange = () => {
        selectedModel = modelSelect.value;
        try { localStorage.setItem(LLM_PREF_KEY, selectedModel); } catch { /* ignore */ }
    };
    modelWrap.append(modelLabel, modelSelect);
    heroRow.appendChild(modelWrap);
    hero.appendChild(heroRow);
    container.appendChild(hero);

    const chatArea = document.createElement('div');
    chatArea.style.flex = '1';
    chatArea.style.overflowY = 'auto';
    chatArea.style.padding = '1rem 2rem';
    chatArea.style.display = 'flex';
    chatArea.style.flexDirection = 'column';
    chatArea.style.gap = '0.75rem';
    container.appendChild(chatArea);

    const chipsContainer = document.createElement('div');
    chipsContainer.style.display = 'flex';
    chipsContainer.style.flexWrap = 'wrap';
    chipsContainer.style.gap = '0.5rem';
    chipsContainer.style.justifyContent = 'center';
    chipsContainer.style.padding = '2rem 0';

    [
        'Generate a product photo of wireless earbuds',
        'Suggest a model for cinematic video',
        'Improve my prompt for a neon cityscape',
        'Open Shorts Studio',
        'Plan a 3-scene storyboard',
    ].forEach(text => {
        const chip = document.createElement('button');
        chip.textContent = text;
        chip.style.padding = '0.5rem 1rem';
        chip.style.borderRadius = '999px';
        chip.style.border = '1px solid rgba(255,255,255,0.1)';
        chip.style.background = 'rgba(255,255,255,0.03)';
        chip.style.color = 'rgba(255,255,255,0.7)';
        chip.style.fontSize = '0.8rem';
        chip.style.cursor = 'pointer';
        chip.onclick = () => sendMessage(text);
        chipsContainer.appendChild(chip);
    });
    chatArea.appendChild(chipsContainer);

    const inputBar = document.createElement('div');
    inputBar.style.padding = '0.75rem 2rem 1.5rem';
    inputBar.style.borderTop = '1px solid rgba(255,255,255,0.05)';
    inputBar.style.display = 'flex';
    inputBar.style.gap = '0.5rem';
    inputBar.style.flexShrink = '0';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Ask Assist or request a generation…';
    textInput.style.flex = '1';
    textInput.style.padding = '0.75rem 1rem';
    textInput.style.borderRadius = '12px';
    textInput.style.border = '1px solid rgba(255,255,255,0.1)';
    textInput.style.background = 'rgba(0,0,0,0.4)';
    textInput.style.color = 'white';
    textInput.style.fontSize = '0.875rem';
    textInput.style.outline = 'none';

    const sendBtn = document.createElement('button');
    sendBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>`;
    sendBtn.style.padding = '0.75rem';
    sendBtn.style.borderRadius = '12px';
    sendBtn.style.background = 'var(--color-primary, #d9ff00)';
    sendBtn.style.color = 'black';
    sendBtn.style.border = 'none';
    sendBtn.style.cursor = 'pointer';

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(textInput.value);
        }
    });
    sendBtn.onclick = () => sendMessage(textInput.value);
    inputBar.appendChild(textInput);
    inputBar.appendChild(sendBtn);
    container.appendChild(inputBar);

    function scrollDown() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function addBubble(role, content) {
        const bubble = document.createElement('div');
        bubble.style.maxWidth = '85%';
        bubble.style.padding = '0.75rem 1rem';
        bubble.style.borderRadius = '16px';
        bubble.style.fontSize = '0.875rem';
        bubble.style.lineHeight = '1.5';
        bubble.style.whiteSpace = 'pre-wrap';
        bubble.style.wordBreak = 'break-word';

        if (role === 'user') {
            bubble.style.alignSelf = 'flex-end';
            bubble.style.background = 'rgba(217,255,0,0.15)';
            bubble.style.color = 'white';
        } else {
            bubble.style.alignSelf = 'flex-start';
            bubble.style.background = 'rgba(255,255,255,0.05)';
            bubble.style.color = 'rgba(255,255,255,0.9)';
        }
        bubble.textContent = content;
        chatArea.appendChild(bubble);
        scrollDown();
        return bubble;
    }

    function addToolCard(toolCall, onConfirm, onCancel) {
        const card = document.createElement('div');
        card.style.alignSelf = 'flex-start';
        card.style.maxWidth = '90%';
        card.style.padding = '1rem';
        card.style.borderRadius = '16px';
        card.style.background = 'rgba(217,255,0,0.08)';
        card.style.border = '1px solid rgba(217,255,0,0.25)';

        const title = document.createElement('div');
        title.style.fontWeight = '800';
        title.style.fontSize = '0.8rem';
        title.style.color = '#d9ff00';
        title.style.marginBottom = '0.5rem';
        title.textContent = `🛠 ${TOOL_LABELS[toolCall.tool] || toolCall.tool}`;

        const summary = document.createElement('div');
        summary.style.fontSize = '0.8rem';
        summary.style.color = 'rgba(255,255,255,0.8)';
        summary.style.marginBottom = '0.5rem';
        summary.textContent = toolCall.summary || JSON.stringify(toolCall.params, null, 2).slice(0, 300);

        const params = document.createElement('pre');
        params.style.fontSize = '0.7rem';
        params.style.color = 'rgba(255,255,255,0.5)';
        params.style.overflow = 'auto';
        params.style.maxHeight = '120px';
        params.textContent = JSON.stringify(toolCall.params, null, 2);

        card.appendChild(title);
        card.appendChild(summary);
        card.appendChild(params);

        if (onConfirm) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '0.5rem';
            row.style.marginTop = '0.75rem';
            const yes = document.createElement('button');
            yes.textContent = toolNeedsCreditConfirmation(toolCall.tool) ? '✓ Confirm (uses credits)' : '✓ Run';
            yes.style.padding = '0.4rem 0.8rem';
            yes.style.borderRadius = '8px';
            yes.style.background = '#d9ff00';
            yes.style.color = 'black';
            yes.style.fontWeight = '700';
            yes.style.fontSize = '0.75rem';
            yes.style.border = 'none';
            yes.style.cursor = 'pointer';
            yes.onclick = onConfirm;
            const no = document.createElement('button');
            no.textContent = 'Cancel';
            no.style.padding = '0.4rem 0.8rem';
            no.style.borderRadius = '8px';
            no.style.background = 'transparent';
            no.style.color = 'rgba(255,255,255,0.6)';
            no.style.border = '1px solid rgba(255,255,255,0.2)';
            no.style.fontSize = '0.75rem';
            no.style.cursor = 'pointer';
            no.onclick = onCancel;
            row.appendChild(yes);
            row.appendChild(no);
            card.appendChild(row);
        }

        chatArea.appendChild(card);
        scrollDown();
        return card;
    }

    function addToolResult(result) {
        const wrap = document.createElement('div');
        wrap.style.alignSelf = 'flex-start';
        wrap.style.maxWidth = '90%';

        if (result.type === 'image' && result.url) {
            const img = document.createElement('img');
            img.src = result.url;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '12px';
            wrap.appendChild(img);
            const dl = document.createElement('a');
            dl.href = result.url;
            dl.download = '';
            dl.target = '_blank';
            dl.textContent = '⬇ Download';
            dl.style.display = 'inline-block';
            dl.style.marginTop = '0.5rem';
            dl.style.fontSize = '0.75rem';
            dl.style.color = '#d9ff00';
            wrap.appendChild(dl);
        } else if (result.type === 'video' && result.url) {
            const vid = document.createElement('video');
            vid.src = result.url;
            vid.controls = true;
            vid.style.maxWidth = '100%';
            vid.style.borderRadius = '12px';
            wrap.appendChild(vid);
        } else if (result.text) {
            const bubble = document.createElement('div');
            bubble.style.padding = '0.75rem 1rem';
            bubble.style.borderRadius = '12px';
            bubble.style.background = 'rgba(255,255,255,0.05)';
            bubble.style.fontSize = '0.85rem';
            bubble.style.whiteSpace = 'pre-wrap';
            bubble.textContent = result.text;
            wrap.appendChild(bubble);
        }

        chatArea.appendChild(wrap);
        scrollDown();
    }

    async function runTool(toolCall, cardEl) {
        try {
            muapi.getKey();
        } catch {
            document.body.appendChild(AuthModal());
            return;
        }
        if (cardEl) cardEl.style.opacity = '0.5';
        addBubble('assistant', '⏳ Running tool…');
        try {
            const result = await executeAssistTool(toolCall);
            chatArea.removeChild(chatArea.lastChild);
            if (cardEl) cardEl.remove();
            addToolResult(result);
        } catch (err) {
            chatArea.removeChild(chatArea.lastChild);
            addBubble('assistant', `Tool error: ${err.message}`);
        }
    }

    async function handleToolCall(toolCall) {
        if (toolNeedsCreditConfirmation(toolCall.tool)) {
            const card = addToolCard(toolCall,
                () => runTool(toolCall, card),
                () => card.remove()
            );
        } else {
            await runTool(toolCall, null);
        }
    }

    async function sendMessage(text) {
        text = text?.trim();
        if (!text || isLoading) return;
        if (chipsContainer.parentNode) chipsContainer.remove();

        messages.push({ role: 'user', content: text });
        addBubble('user', text);
        textInput.value = '';
        isLoading = true;
        sendBtn.style.opacity = '0.5';

        const loader = document.createElement('div');
        loader.id = 'assist-loader';
        loader.style.alignSelf = 'flex-start';
        loader.style.color = 'rgba(255,255,255,0.4)';
        loader.textContent = 'Thinking…';
        chatArea.appendChild(loader);
        scrollDown();

        try {
            const reply = await muapi.callLLMChat(messages, ASSIST_SYSTEM_PROMPT, { model: selectedModel });
            loader.remove();

            const toolCall = parseToolCall(reply);
            const displayText = stripToolBlock(reply) || (toolCall?.summary ?? '');

            if (displayText) {
                messages.push({ role: 'assistant', content: displayText });
                addBubble('assistant', displayText);
            }

            if (toolCall) {
                await handleToolCall(toolCall);
            } else if (!displayText) {
                messages.push({ role: 'assistant', content: reply });
                addBubble('assistant', reply);
            }
        } catch (err) {
            loader.remove();
            addBubble('assistant', 'Error: ' + err.message);
        } finally {
            isLoading = false;
            sendBtn.style.opacity = '1';
        }
    }

    return container;
}
