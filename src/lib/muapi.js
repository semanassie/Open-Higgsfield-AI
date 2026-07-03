import { buildApiPayload, buildAppPayload, buildAudioPayload, getAudioModelDefinition, getEndpointForModel, validateModelParams } from './modelRequirements.js';
import { CHARACTER_FACE_I2I, CHARACTER_PORTRAIT_T2I } from './phase2Models.js';

export class MuapiClient {
    constructor() {
        // Ideally user provides this in settings
        this.baseUrl = import.meta.env.DEV ? '' : 'https://api.muapi.ai';
    }

    getKey() {
        const key = localStorage.getItem('muapi_key');
        if (!key) throw new Error('API Key missing. Please set it in Settings.');
        return key;
    }

    getKlingKey() {
        return localStorage.getItem('kling_key') || null;
    }

    /**
     * POST JSON with retries on transient server errors (503/502/429).
     */
    async postJsonWithRetry(url, key, body, retries = 4) {
        let lastErr = '';
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': key },
                body: JSON.stringify(body),
            });

            if (response.ok) return response;

            lastErr = await response.text();
            const retryable = [503, 502, 429].includes(response.status);
            if (retryable && attempt < retries) {
                const delay = attempt * 2500;
                console.warn(`[Muapi] ${response.status} on ${url}, retry ${attempt}/${retries - 1} in ${delay}ms`);
                await new Promise((r) => setTimeout(r, delay));
                continue;
            }

            throw new Error(`API Failed: ${response.status} - ${lastErr.slice(0, 200)}`);
        }
        throw new Error(`API Failed: ${lastErr.slice(0, 200)}`);
    }

    /**
     * Generates an image (Text-to-Image or Image-to-Image)
     * @param {Object} params
     * @param {string} params.model
     * @param {string} params.prompt
     * @param {string} params.negative_prompt
     * @param {string} params.aspect_ratio
     * @param {number} params.steps
     * @param {number} params.guidance_scale
     * @param {number} params.seed
     * @param {string} [params.image_url] - If present, treats as Image-to-Image
     */
    async generateImage(params) {
        const key = this.getKey();

        const endpoint = getEndpointForModel('t2i', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('t2i', params.model, params);

        console.log('[Muapi] Requesting:', url);
        console.log('[Muapi] Payload:', finalPayload);

        try {
            // Step 1: Submit the task
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[Muapi] API Error Body:', errText);
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] Submit Response:', submitData);

            // Extract request_id for polling
            const requestId = submitData.request_id || submitData.id;
            if (!requestId) {
                // Some endpoints return the result directly
                return submitData;
            }

            // Notify caller of requestId so they can persist it before polling begins
            if (params.onRequestId) params.onRequestId(requestId);

            // Step 2: Poll for results
            console.log('[Muapi] Polling for results, request_id:', requestId);
            const result = await this.pollForResult(requestId, key);

            // Normalize: extract image URL from outputs array
            const imageUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] Image URL:', imageUrl);
            return { ...result, url: imageUrl };

        } catch (error) {
            console.error("Muapi Client Error:", error);
            throw error;
        }
    }

    /**
     * Polls the predictions endpoint until the result is ready.
     * @param {string} requestId - The request ID from the submit response
     * @param {string} key - The API key
     * @param {number} maxAttempts - Maximum polling attempts (default 60 = ~2 min)
     * @param {number} interval - Polling interval in ms (default 2000)
     */
    extractAudioUrl(result) {
        if (!result) return null;
        const candidates = [
            ...(Array.isArray(result.outputs) ? result.outputs : []),
            result.audio,
            result.url,
            result.output?.audio,
            result.output?.url,
        ];
        for (const c of candidates) {
            if (typeof c === 'string' && /^https?:\/\//i.test(c)) return c;
            if (c?.url && /^https?:\/\//i.test(c.url)) return c.url;
        }
        return null;
    }

    async pollForResult(requestId, key, maxAttempts = 60, interval = 2000, options = {}) {
        const quiet = options?.quiet === true;
        const pollUrl = `${this.baseUrl}/api/v1/predictions/${requestId}/result`;
        const shouldLogAttempt = (attempt) => !quiet || attempt === 1 || attempt % 10 === 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, interval));

            if (shouldLogAttempt(attempt)) {
                console.log(`[Muapi] Polling attempt ${attempt}/${maxAttempts}...`);
            }

            try {
                const response = await fetch(pollUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': key
                    }
                });

                if (!response.ok) {
                    const errText = await response.text();
                    if (!quiet || shouldLogAttempt(attempt)) {
                        console.warn(`[Muapi] Poll error (${response.status}):`, errText);
                    }
                    // Continue polling on non-fatal errors
                    if (response.status >= 500) continue;
                    throw new Error(`Poll Failed: ${response.status} - ${errText.slice(0, 100)}`);
                }

                const data = await response.json();
                const status = data.status?.toLowerCase();
                const terminal = status === 'completed' || status === 'succeeded' || status === 'success'
                    || status === 'failed' || status === 'error';

                if (!quiet || terminal) {
                    console.log('[Muapi] Poll Response:', data);
                }

                if (status === 'completed' || status === 'succeeded' || status === 'success') {
                    const hasOutput = Array.isArray(data.outputs) && data.outputs.length > 0 && data.outputs[0];
                    if (!hasOutput && attempt < maxAttempts) continue;
                    if (quiet) {
                        console.log(`[Muapi] Poll succeeded on attempt ${attempt}/${maxAttempts}`);
                    }
                    return data;
                }

                if (status === 'failed' || status === 'error') {
                    const errMsg = data.error || 'Unknown error';
                    if (quiet) {
                        console.warn(`[Muapi] Poll failed on attempt ${attempt}:`, errMsg);
                    }
                    throw new Error(`Generation failed: ${errMsg}`);
                }

                // Otherwise (processing, pending, etc.) keep polling
            } catch (error) {
                if (attempt === maxAttempts) {
                    if (quiet) {
                        console.warn(`[Muapi] Poll gave up after ${maxAttempts} attempts:`, error.message);
                    }
                    throw error;
                }
                if (!quiet || shouldLogAttempt(attempt)) {
                    console.warn('[Muapi] Poll attempt failed, retrying...', error.message);
                }
            }
        }

        if (quiet) {
            console.warn(`[Muapi] Poll timed out after ${maxAttempts} attempts`);
        }
        throw new Error('Generation timed out after polling.');
    }

    async generateVideo(params) {
        const key = this.getKey();

        const endpoint = getEndpointForModel('t2v', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('t2v', params.model, params);

        console.log('[Muapi] Video Request:', url);
        console.log('[Muapi] Video Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[Muapi] API Error Body:', errText);
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] Video Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            console.log('[Muapi] Polling for video results, request_id:', requestId);
            const result = await this.pollForResult(requestId, key, 900, 2000);

            const videoUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] Video URL:', videoUrl);
            return { ...result, url: videoUrl };

        } catch (error) {
            console.error("Muapi Video Client Error:", error);
            throw error;
        }
    }

    /**
     * Generates an image using an Image-to-Image model.
     * The model's imageField determines which payload key receives the uploaded image URL.
     * @param {Object} params
     * @param {string} params.model - i2iModel id
     * @param {string} params.image_url - The uploaded reference image URL
     * @param {string} [params.prompt] - Optional text prompt
     * @param {string} [params.aspect_ratio]
     * @param {string} [params.resolution]
     */
    async generateI2I(params) {
        const key = this.getKey();
        const endpoint = getEndpointForModel('i2i', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('i2i', params.model, params);

        console.log('[Muapi] I2I Request:', url);
        console.log('[Muapi] I2I Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': key },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] I2I Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            const result = await this.pollForResult(requestId, key);
            const imageUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] I2I Result URL:', imageUrl);
            return { ...result, url: imageUrl };
        } catch (error) {
            console.error('Muapi I2I Error:', error);
            throw error;
        }
    }

    /**
     * Generates a video using an Image-to-Video model.
     * @param {Object} params
     * @param {string} params.model - i2vModel id
     * @param {string} params.image_url - The uploaded start frame image URL
     * @param {string} [params.prompt]
     * @param {string} [params.aspect_ratio]
     * @param {string} [params.resolution]
     * @param {number} [params.duration]
     * @param {string} [params.quality]
     */
    async generateI2V(params) {
        const key = this.getKey();
        const endpoint = getEndpointForModel('i2v', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('i2v', params.model, params);

        console.log('[Muapi] I2V Request:', url);
        console.log('[Muapi] I2V Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': key },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] I2V Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            const pollOpts = params.quiet ? { quiet: true } : {};
            const result = await this.pollForResult(requestId, key, 900, 2000, pollOpts);
            const videoUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] I2V Result URL:', videoUrl);
            return { ...result, url: videoUrl };
        } catch (error) {
            console.error('Muapi I2V Error:', error);
            throw error;
        }
    }

    /**
     * Uploads a file to muapi and returns the hosted URL.
     * @param {File} file - The image file to upload
     * @returns {Promise<string>} The hosted URL of the uploaded file
     */
    async uploadFile(file) {
        const key = this.getKey();
        const url = `${this.baseUrl}/api/v1/upload_file`;

        const formData = new FormData();
        formData.append('file', file);

        console.log('[Muapi] Uploading file:', file.name);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': key },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`File upload failed: ${response.status} - ${errText.slice(0, 100)}`);
        }

        const data = await response.json();
        console.log('[Muapi] Upload response:', data);

        const fileUrl = data.url || data.file_url || data.data?.url;
        if (!fileUrl) throw new Error('No URL returned from file upload');
        return fileUrl;
    }

    /**
     * Processes a video through a Video-to-Video model (e.g. watermark remover).
     * @param {Object} params
     * @param {string} params.model - v2vModel id
     * @param {string} params.video_url - The uploaded video URL
     */
    async processV2V(params) {
        const key = this.getKey();
        const endpoint = getEndpointForModel('v2v', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('v2v', params.model, params);

        console.log('[Muapi] V2V Request:', url);
        console.log('[Muapi] V2V Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': key },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] V2V Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            const result = await this.pollForResult(requestId, key, 900, 2000);
            const videoUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] V2V Result URL:', videoUrl);
            return { ...result, url: videoUrl };
        } catch (error) {
            console.error('Muapi V2V Error:', error);
            throw error;
        }
    }

    /**
     * Processes lipsync / speech-to-video generation.
     * Supports image+audio → video and video+audio → video models.
     * @param {Object} params
     * @param {string} params.model - lipsyncModel id
     * @param {string} [params.image_url] - Portrait image URL (image-based models)
     * @param {string} [params.video_url] - Source video URL (video-based models)
     * @param {string} params.audio_url - Audio file URL
     * @param {string} [params.prompt] - Optional prompt (for models that support it)
     * @param {string} [params.resolution] - Output resolution
     * @param {number} [params.seed] - Optional seed (-1 for random)
     * @param {Function} [params.onRequestId] - Called when request_id is received
     */
    async processLipSync(params) {
        const key = this.getKey();
        const endpoint = getEndpointForModel('lipsync', params.model);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        const finalPayload = buildApiPayload('lipsync', params.model, params);

        console.log('[Muapi] LipSync Request:', url);
        console.log('[Muapi] LipSync Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': key },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[Muapi] LipSync API Error:', errText);
                throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] LipSync Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            const result = await this.pollForResult(requestId, key, 900, 2000);
            const videoUrl = result.outputs?.[0] || result.url || result.output?.url;
            console.log('[Muapi] LipSync Result URL:', videoUrl);
            return { ...result, url: videoUrl };
        } catch (error) {
            console.error('Muapi LipSync Error:', error);
            throw error;
        }
    }

    getDimensionsFromAR(ar) {
        // Base unit 1024 (Flux standard)
        switch (ar) {
            case '1:1': return [1024, 1024];
            case '16:9': return [1280, 720]; // 1024*1024 area approx
            case '9:16': return [720, 1280];
            case '4:3': return [1152, 864];
            case '3:2': return [1216, 832];
            case '21:9': return [1536, 640];
            default: return [1024, 1024];
        }
    }

    /**
     * Generates audio (TTS, music, or SFX).
     * Works with: minimax-speech-*, suno-*, mmaudio-*
     * @param {Object} params
     * @param {string} params.endpoint - The API endpoint name (e.g. 'minimax-speech-2.6-hd')
     * @param {Object} params.payload - The request body to send
     */
    async generateAudio(params) {
        const key = this.getKey();
        const modelId = params.endpoint;
        const category = params.category || 'tts';
        const modelDef = getAudioModelDefinition(category, modelId);
        const apiPath = modelDef?.endpoint || modelId;
        const finalPayload = buildAudioPayload(category, modelId, params.payload || {});
        const url = `${this.baseUrl}/api/v1/${apiPath}`;

        console.log('[Muapi] Audio Request:', url);
        console.log('[Muapi] Audio Payload:', finalPayload);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Request Failed: ${response.status} - ${errText.slice(0, 200)}`);
            }

            const submitData = await response.json();
            console.log('[Muapi] Audio Submit Response:', submitData);

            const requestId = submitData.request_id || submitData.id;
            if (!requestId) return submitData;

            if (params.onRequestId) params.onRequestId(requestId);

            // Poll for result (same pattern as images/videos)
            const pollOpts = params.quiet ? { quiet: true } : {};
            const result = await this.pollForResult(requestId, key, 120, 2000, pollOpts);

            const audioUrl = this.extractAudioUrl(result);
            console.log('[Muapi] Audio URL:', audioUrl);
            if (!audioUrl) throw new Error('No audio URL in API response');
            return { ...result, url: audioUrl };
        } catch (error) {
            console.error('Muapi Audio Error:', error);
            throw error;
        }
    }

    /**
     * Runs a generic "app" endpoint (effects, tools, etc.)
     * Same submit-and-poll pattern used everywhere.
     * @param {string} endpoint - e.g. 'ai-background-remover'
     * @param {Object} payload - whatever the endpoint expects
     */
    async runApp(endpoint, payload) {
        const key = this.getKey();
        const finalPayload = buildAppPayload(endpoint, payload);
        const url = `${this.baseUrl}/api/v1/${endpoint}`;

        console.log('[Muapi] App Request:', url, finalPayload);

        const response = await this.postJsonWithRetry(url, key, finalPayload);

        const submitData = await response.json();
        const requestId = submitData.request_id || submitData.id;
        if (!requestId) return submitData;

        const result = await this.pollForResult(requestId, key, 120, 2000);

        // Result could be image, video, or audio — try all common fields
        const outputUrl = result.outputs?.[0] || result.url || result.video ||
                          result.image || result.audio || result.output?.url;
        return { ...result, url: outputUrl };
    }

    /**
     * Extract plain text from an any-llm-models poll result.
     */
    extractLLMText(result) {
        if (!result) return '';
        if (typeof result.text === 'string' && result.text.trim()) return result.text.trim();
        if (typeof result.output === 'string' && result.output.trim()) return result.output.trim();
        if (result.output?.text) return String(result.output.text).trim();
        const out = result.outputs?.[0];
        if (typeof out === 'string' && out.trim() && !/^https?:\/\//i.test(out)) return out.trim();
        if (out?.text) return String(out.text).trim();
        return '';
    }

    /**
     * Submit to MuAPI any-llm-models (Text to Text).
     * @see https://muapi.ai/playground/any-llm/llms.txt
     */
    async submitLLM(body) {
        const key = this.getKey();
        const url = `${this.baseUrl}/api/v1/any-llm-models`;

        const payload = {
            model: 'google/gemini-2.5-flash',
            system_prompt: 'You are a helpful creative AI assistant.',
            ...body,
        };
        if (payload.system_prompt == null) payload.system_prompt = '';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`LLM Failed: ${response.status} - ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        const requestId = data.request_id || data.id;
        if (!requestId) {
            return this.extractLLMText(data) || data.text || data.output || JSON.stringify(data);
        }

        const result = await this.pollForResult(requestId, key, 60, 2000);
        return this.extractLLMText(result) || result.text || result.output?.text || JSON.stringify(result);
    }

    /**
     * Calls an LLM (e.g. for backstory generation, prompt enhancement).
     * Uses the any-llm-models endpoint on Muapi.
     * @param {string} prompt - The text prompt to send
     * @param {{ systemPrompt?: string, model?: string }} [options]
     * @returns {Promise<string>} The LLM's text response
     */
    async callLLM(prompt, options = {}) {
        const body = {
            prompt,
            system_prompt: options.systemPrompt ?? 'You are a helpful creative AI assistant.',
        };
        if (options.model) body.model = options.model;
        return this.submitLLM(body);
    }

    /**
     * Generates a character portrait reference image.
     * - With referenceImageUrl: Flux PuLID (face-preserving restyle)
     * - Without reference: photoreal T2I portrait from text description
     * @param {string} prompt - Description of the character's appearance
     * @param {string} [referenceImageUrl] - Optional existing face to preserve
     * @param {{ aspect_ratio?: string, model?: string }} [options]
     * @returns {Promise<{url: string}>} The generated image
     */
    async generateFaceId(prompt, referenceImageUrl, options = {}) {
        const aspectRatio = options.aspect_ratio || '1:1';

        if (!referenceImageUrl) {
            return this.generateImage({
                model: options.model || CHARACTER_PORTRAIT_T2I,
                prompt,
                aspect_ratio: aspectRatio,
            });
        }

        const check = validateModelParams('i2i', CHARACTER_FACE_I2I, {
            prompt,
            image_url: referenceImageUrl,
            aspect_ratio: aspectRatio,
        });
        if (!check.valid) {
            throw new Error(check.errors.join(' '));
        }

        const key = this.getKey();
        const url = `${this.baseUrl}/api/v1/flux-pulid`;
        const payload = buildApiPayload('i2i', CHARACTER_FACE_I2I, check.normalized);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`PuLID Failed: ${response.status} - ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        const requestId = data.request_id || data.id;
        if (!requestId) return data;

        const result = await this.pollForResult(requestId, key, 60, 2000);
        const imageUrl = result.outputs?.[0] || result.url || result.output?.url;
        return { ...result, url: imageUrl };
    }
    /**
     * Multi-turn chat with an LLM (for Assist copilot).
     * @param {Array<{role: string, content: string}>} messages - Chat history
     * @param {string} [systemPrompt] - Optional system-level instruction
     * @returns {Promise<string>} The assistant's text reply
     */
    async callLLMChat(messages, systemPrompt) {
        const flatPrompt = messages.map(m => {
            const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
            return `${prefix}: ${m.content}`;
        }).join('\n\n') + '\n\nAssistant:';

        const body = {
            prompt: flatPrompt,
            model: 'google/gemini-2.5-flash',
        };
        if (systemPrompt) body.system_prompt = systemPrompt;

        try {
            return await this.submitLLM(body);
        } catch (err) {
            throw new Error(err.message.replace(/^LLM Failed:/, 'LLM Chat Failed:'));
        }
    }
}

export const muapi = new MuapiClient();
