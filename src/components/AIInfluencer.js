import { muapi } from '../lib/muapi.js';
import { getCharacters } from '../lib/characterLibrary.js';

const PLATFORMS = [
    { id: 'tiktok',    name: 'TikTok',           ar: '9:16', icon: '📱' },
    { id: 'reels',     name: 'Instagram Reels',   ar: '9:16', icon: '🎞️' },
    { id: 'ytshorts',  name: 'YouTube Shorts',    ar: '9:16', icon: '▶️' },
    { id: 'youtube',   name: 'YouTube',           ar: '16:9', icon: '📺' },
    { id: 'igpost',    name: 'Instagram Post',    ar: '1:1',  icon: '📷' },
    { id: 'twitter',   name: 'X / Twitter',       ar: '16:9', icon: '🐦' },
];

const CONTENT_TYPES = [
    { id: 'pose',      name: 'Pose Shot',         prompt: 'confident pose, professional photo shoot, studio lighting' },
    { id: 'lifestyle', name: 'Lifestyle Scene',    prompt: 'candid lifestyle photography, natural setting, warm ambient light' },
    { id: 'product',   name: 'Product Placement',  prompt: 'holding a product, commercial photography, clean background, brand promotion' },
    { id: 'fashion',   name: 'Fashion Look',       prompt: 'high fashion editorial, runway style, dramatic lighting, designer outfit' },
    { id: 'portrait',  name: 'Close-up Portrait',  prompt: 'close-up portrait, soft bokeh background, editorial beauty photography' },
    { id: 'outdoor',   name: 'Outdoor Adventure',  prompt: 'outdoor adventure lifestyle, golden hour, scenic landscape background' },
];

export function AIInfluencer() {
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.overflowY = 'auto';
    container.style.padding = '2rem';

    // State
    let selectedPlatform = PLATFORMS[0].id;
    let selectedContent = CONTENT_TYPES[0].id;
    let selectedCharId = '';
    let autoCaption = true;
    let isGenerating = false;

    const characters = getCharacters();

    // --- Hero ---
    const hero = document.createElement('div');
    hero.style.marginBottom = '2rem';
    hero.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <div style="width:48px;height:48px;border-radius:14px;background:rgba(217,255,0,0.1);border:1px solid rgba(217,255,0,0.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">
                🌟
            </div>
            <div>
                <h1 style="font-size:1.5rem;font-weight:800;color:white;margin:0;">AI Influencer</h1>
                <p style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin:0;">Generate social-media-ready content with your AI characters</p>
            </div>
        </div>
    `;
    container.appendChild(hero);

    // --- Layout ---
    const layout = document.createElement('div');
    layout.style.display = 'grid';
    layout.style.gridTemplateColumns = '1fr 1fr';
    layout.style.gap = '2rem';
    layout.style.alignItems = 'start';
    container.appendChild(layout);

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.gap = '1.25rem';
    layout.appendChild(leftCol);

    const rightCol = document.createElement('div');
    layout.appendChild(rightCol);

    function makeSection(title) {
        const sec = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = title;
        h.style.fontSize = '0.75rem';
        h.style.fontWeight = '700';
        h.style.textTransform = 'uppercase';
        h.style.letterSpacing = '0.05em';
        h.style.color = 'rgba(255,255,255,0.4)';
        h.style.marginBottom = '0.5rem';
        sec.appendChild(h);
        return sec;
    }

    // --- 1. Character Selector ---
    const charSec = makeSection('Character');

    if (characters.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '1rem';
        empty.style.border = '1px dashed rgba(255,255,255,0.1)';
        empty.style.borderRadius = '12px';
        empty.style.textAlign = 'center';
        empty.innerHTML = `
            <p style="color:rgba(255,255,255,0.4);font-size:0.85rem;margin-bottom:0.5rem;">No characters yet</p>
            <button id="go-char-btn" style="padding:0.4rem 1rem;border-radius:8px;background:rgba(217,255,0,0.1);border:1px solid rgba(217,255,0,0.3);color:var(--color-primary,#d9ff00);font-size:0.8rem;cursor:pointer;">
                Go to Character Builder
            </button>
        `;
        empty.querySelector('#go-char-btn').onclick = () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'character' } }));
        };
        charSec.appendChild(empty);
    } else {
        const charGrid = document.createElement('div');
        charGrid.style.display = 'flex';
        charGrid.style.flexWrap = 'wrap';
        charGrid.style.gap = '0.5rem';

        characters.forEach((ch, idx) => {
            const card = document.createElement('button');
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '0.5rem';
            card.style.padding = '0.5rem 0.75rem';
            card.style.borderRadius = '10px';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.2s';
            card.style.border = (selectedCharId === ch.id || (idx === 0 && !selectedCharId)) ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
            card.style.background = (selectedCharId === ch.id || (idx === 0 && !selectedCharId)) ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';

            if (ch.referenceImageUrl) {
                const img = document.createElement('img');
                img.src = ch.referenceImageUrl;
                img.style.width = '28px';
                img.style.height = '28px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                card.appendChild(img);
            }
            const nameSpan = document.createElement('span');
            nameSpan.textContent = ch.name;
            nameSpan.style.fontSize = '0.8rem';
            nameSpan.style.color = 'white';
            nameSpan.style.fontWeight = '600';
            card.appendChild(nameSpan);

            card.onclick = () => {
                selectedCharId = ch.id;
                Array.from(charGrid.children).forEach((c, i) => {
                    const active = characters[i].id === selectedCharId;
                    c.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
                    c.style.background = active ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';
                });
            };

            // Auto-select first
            if (idx === 0 && !selectedCharId) selectedCharId = ch.id;
            charGrid.appendChild(card);
        });
        charSec.appendChild(charGrid);
    }
    leftCol.appendChild(charSec);

    // --- 2. Platform Selector ---
    const platSec = makeSection('Platform');
    const platGrid = document.createElement('div');
    platGrid.style.display = 'flex';
    platGrid.style.flexWrap = 'wrap';
    platGrid.style.gap = '0.5rem';

    PLATFORMS.forEach(p => {
        const btn = document.createElement('button');
        btn.innerHTML = `${p.icon} <span style="font-size:0.75rem;">${p.name}</span>`;
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '0.3rem';
        btn.style.padding = '0.4rem 0.75rem';
        btn.style.borderRadius = '8px';
        btn.style.border = p.id === selectedPlatform ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
        btn.style.background = p.id === selectedPlatform ? 'rgba(217,255,0,0.08)' : 'transparent';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '0.8rem';
        btn.onclick = () => {
            selectedPlatform = p.id;
            Array.from(platGrid.children).forEach((b, i) => {
                const active = PLATFORMS[i].id === selectedPlatform;
                b.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.1)';
                b.style.background = active ? 'rgba(217,255,0,0.08)' : 'transparent';
            });
        };
        platGrid.appendChild(btn);
    });
    platSec.appendChild(platGrid);
    leftCol.appendChild(platSec);

    // --- 3. Content Type ---
    const contentSec = makeSection('Content Type');
    const contentGrid = document.createElement('div');
    contentGrid.style.display = 'grid';
    contentGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    contentGrid.style.gap = '0.5rem';

    CONTENT_TYPES.forEach(ct => {
        const card = document.createElement('button');
        card.textContent = ct.name;
        card.style.padding = '0.5rem 0.75rem';
        card.style.borderRadius = '10px';
        card.style.border = ct.id === selectedContent ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
        card.style.background = ct.id === selectedContent ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';
        card.style.color = 'white';
        card.style.fontSize = '0.8rem';
        card.style.fontWeight = '600';
        card.style.cursor = 'pointer';
        card.style.textAlign = 'left';
        card.onclick = () => {
            selectedContent = ct.id;
            Array.from(contentGrid.children).forEach((c, i) => {
                const active = CONTENT_TYPES[i].id === selectedContent;
                c.style.border = active ? '1px solid rgba(217,255,0,0.5)' : '1px solid rgba(255,255,255,0.08)';
                c.style.background = active ? 'rgba(217,255,0,0.08)' : 'rgba(255,255,255,0.03)';
            });
        };
        contentGrid.appendChild(card);
    });
    contentSec.appendChild(contentGrid);
    leftCol.appendChild(contentSec);

    // --- 4. Auto-caption toggle ---
    const captionSec = makeSection('Options');
    const captionRow = document.createElement('label');
    captionRow.style.display = 'flex';
    captionRow.style.alignItems = 'center';
    captionRow.style.gap = '0.5rem';
    captionRow.style.cursor = 'pointer';

    const captionCheck = document.createElement('input');
    captionCheck.type = 'checkbox';
    captionCheck.checked = autoCaption;
    captionCheck.onchange = () => { autoCaption = captionCheck.checked; };

    const captionLabel = document.createElement('span');
    captionLabel.textContent = 'Auto-generate caption & hashtags';
    captionLabel.style.color = 'rgba(255,255,255,0.7)';
    captionLabel.style.fontSize = '0.8rem';
    captionRow.appendChild(captionCheck);
    captionRow.appendChild(captionLabel);
    captionSec.appendChild(captionRow);
    leftCol.appendChild(captionSec);

    // --- Generate Button ---
    const genBtn = document.createElement('button');
    genBtn.textContent = 'Generate Content';
    genBtn.style.width = '100%';
    genBtn.style.padding = '0.85rem';
    genBtn.style.borderRadius = '14px';
    genBtn.style.background = 'var(--color-primary, #d9ff00)';
    genBtn.style.color = 'black';
    genBtn.style.fontWeight = '800';
    genBtn.style.fontSize = '0.9rem';
    genBtn.style.border = 'none';
    genBtn.style.cursor = 'pointer';
    leftCol.appendChild(genBtn);

    // --- Right col: Result area ---
    const resultArea = document.createElement('div');
    resultArea.style.minHeight = '400px';
    resultArea.style.border = '1px solid rgba(255,255,255,0.05)';
    resultArea.style.borderRadius = '16px';
    resultArea.style.background = 'rgba(0,0,0,0.2)';
    resultArea.style.display = 'flex';
    resultArea.style.flexDirection = 'column';
    resultArea.style.alignItems = 'center';
    resultArea.style.justifyContent = 'center';
    resultArea.style.padding = '1.5rem';
    resultArea.style.gap = '1rem';

    const placeholder = document.createElement('p');
    placeholder.textContent = 'Your influencer content will appear here';
    placeholder.style.color = 'rgba(255,255,255,0.25)';
    placeholder.style.fontSize = '0.85rem';
    resultArea.appendChild(placeholder);
    rightCol.appendChild(resultArea);

    // --- Generate logic ---
    genBtn.onclick = async () => {
        if (isGenerating) return;

        const character = characters.find(c => c.id === selectedCharId);
        if (!character) {
            alert('Please select a character first. Create one in the Character Builder.');
            return;
        }
        if (!character.referenceImageUrl) {
            alert('Selected character has no reference image. Please regenerate in Character Builder.');
            return;
        }

        isGenerating = true;
        genBtn.textContent = 'Generating image...';
        genBtn.style.opacity = '0.6';
        resultArea.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">Generating...</p>';

        try {
            const platform = PLATFORMS.find(p => p.id === selectedPlatform);
            const contentType = CONTENT_TYPES.find(c => c.id === selectedContent);

            // Build prompt from character + content type
            const charDesc = [
                character.appearance,
                character.outfit,
                character.details
            ].filter(Boolean).join(', ');

            const fullPrompt = `${charDesc}, ${contentType.prompt}, ${platform.name} format, high quality, photorealistic`;

            // Generate face-consistent image
            const imageResult = await muapi.generateFaceId(fullPrompt, character.referenceImageUrl);

            resultArea.innerHTML = '';

            if (imageResult.url) {
                // Image container styled to platform aspect ratio
                const imgWrap = document.createElement('div');
                imgWrap.style.width = '100%';
                imgWrap.style.maxWidth = platform.ar === '1:1' ? '360px' : platform.ar === '9:16' ? '240px' : '400px';
                imgWrap.style.borderRadius = '12px';
                imgWrap.style.overflow = 'hidden';
                imgWrap.style.border = '1px solid rgba(255,255,255,0.1)';

                const img = document.createElement('img');
                img.src = imageResult.url;
                img.style.width = '100%';
                img.style.display = 'block';
                imgWrap.appendChild(img);
                resultArea.appendChild(imgWrap);

                // Platform badge
                const badge = document.createElement('div');
                badge.textContent = `${platform.icon} ${platform.name} · ${platform.ar}`;
                badge.style.fontSize = '0.7rem';
                badge.style.color = 'rgba(255,255,255,0.4)';
                badge.style.padding = '0.25rem 0.75rem';
                badge.style.borderRadius = '999px';
                badge.style.border = '1px solid rgba(255,255,255,0.1)';
                resultArea.appendChild(badge);

                // Download
                const dlLink = document.createElement('a');
                dlLink.href = imageResult.url;
                dlLink.download = `${character.name}-${selectedPlatform}.png`;
                dlLink.textContent = 'Download Image';
                dlLink.style.color = 'var(--color-primary, #d9ff00)';
                dlLink.style.fontSize = '0.8rem';
                resultArea.appendChild(dlLink);
            }

            // Auto-caption
            if (autoCaption && imageResult.url) {
                genBtn.textContent = 'Generating caption...';
                try {
                    const captionPrompt = `Write a short, engaging ${platform.name} caption for a ${contentType.name.toLowerCase()} photo of an influencer named "${character.name}". Include 5-8 relevant hashtags. Keep it under 200 characters plus hashtags. Be trendy and authentic.`;
                    const captionText = await muapi.callLLM(captionPrompt);

                    const captionBox = document.createElement('div');
                    captionBox.style.width = '100%';
                    captionBox.style.padding = '0.75rem 1rem';
                    captionBox.style.borderRadius = '12px';
                    captionBox.style.background = 'rgba(255,255,255,0.05)';
                    captionBox.style.border = '1px solid rgba(255,255,255,0.08)';

                    const captionTitle = document.createElement('p');
                    captionTitle.textContent = 'Caption';
                    captionTitle.style.fontSize = '0.65rem';
                    captionTitle.style.fontWeight = '700';
                    captionTitle.style.textTransform = 'uppercase';
                    captionTitle.style.color = 'rgba(255,255,255,0.3)';
                    captionTitle.style.marginBottom = '0.35rem';

                    const captionContent = document.createElement('p');
                    captionContent.textContent = captionText;
                    captionContent.style.color = 'rgba(255,255,255,0.8)';
                    captionContent.style.fontSize = '0.8rem';
                    captionContent.style.lineHeight = '1.5';
                    captionContent.style.whiteSpace = 'pre-wrap';

                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Copy Caption';
                    copyBtn.style.marginTop = '0.5rem';
                    copyBtn.style.padding = '0.3rem 0.75rem';
                    copyBtn.style.borderRadius = '8px';
                    copyBtn.style.border = '1px solid rgba(255,255,255,0.1)';
                    copyBtn.style.background = 'transparent';
                    copyBtn.style.color = 'rgba(255,255,255,0.6)';
                    copyBtn.style.fontSize = '0.7rem';
                    copyBtn.style.cursor = 'pointer';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(captionText).then(() => {
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => { copyBtn.textContent = 'Copy Caption'; }, 1500);
                        });
                    };

                    captionBox.appendChild(captionTitle);
                    captionBox.appendChild(captionContent);
                    captionBox.appendChild(copyBtn);
                    resultArea.appendChild(captionBox);
                } catch (capErr) {
                    console.warn('Caption generation failed:', capErr);
                }
            }

            genBtn.textContent = 'Generate Content';
            genBtn.style.opacity = '1';
        } catch (err) {
            resultArea.innerHTML = `<p style="color:rgba(255,100,100,0.8);font-size:0.85rem;">Error: ${err.message}</p>`;
            genBtn.textContent = 'Generate Content';
            genBtn.style.opacity = '1';
        } finally {
            isGenerating = false;
        }
    };

    return container;
}
