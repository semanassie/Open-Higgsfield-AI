/**
 * Local default workflow chain via studio muapi (not /api/workflow/.../run).
 * PromptConcate / text → generateImage.url → generateI2V(image_url) → generateAudio.url
 */
import {
  generateImage,
  generateI2V,
  generateAudio,
} from "../muapi.js";

const DEFAULT_IMAGE_MODEL = "nano-banana";
const DEFAULT_I2V_MODEL = "wan2.1-image-to-video";
const DEFAULT_AUDIO_MODEL = "suno-create-music";

/**
 * @param {string} apiKey
 * @param {{
 *   prompt: string,
 *   imageModel?: string,
 *   i2vModel?: string,
 *   audioModel?: string,
 *   imageParams?: Record<string, unknown>,
 *   i2vParams?: Record<string, unknown>,
 *   audioParams?: Record<string, unknown>,
 * }} opts
 */
export async function runLocalDefaultChain(apiKey, opts) {
  const prompt = String(opts.prompt || "").trim();
  if (!prompt) {
    throw new Error("Local chain needs a prompt from PromptConcate or a text field");
  }
  if (!apiKey) {
    throw new Error("Missing API key for local workflow chain");
  }

  const imageRes = await generateImage(apiKey, {
    model: opts.imageModel || DEFAULT_IMAGE_MODEL,
    prompt,
    ...(opts.imageParams || {}),
  });
  const imageUrl = imageRes?.url;
  if (!imageUrl) {
    throw new Error("generateImage returned no url");
  }

  const videoRes = await generateI2V(apiKey, {
    model: opts.i2vModel || DEFAULT_I2V_MODEL,
    prompt,
    image_url: imageUrl,
    ...(opts.i2vParams || {}),
  });
  const videoUrl = videoRes?.url;
  if (!videoUrl) {
    throw new Error("generateI2V returned no url");
  }

  const audioParams = {
    _modelId: opts.audioModel || DEFAULT_AUDIO_MODEL,
    prompt,
    style: opts.audioParams?.style || "Cinematic",
    ...(opts.audioParams || {}),
  };
  const audioRes = await generateAudio(apiKey, audioParams);
  const audioUrl = audioRes?.url;
  if (!audioUrl) {
    throw new Error("generateAudio returned no url");
  }

  return {
    prompt,
    imageUrl,
    videoUrl,
    audioUrl,
    image: imageRes,
    video: videoRes,
    audio: audioRes,
  };
}

/** Single image node via studio generateImage (not runSingleNode). */
export async function runLocalImageNode(apiKey, params) {
  return generateImage(apiKey, params);
}

/** Single video node via studio generateI2V (image_url required from upstream). */
export async function runLocalVideoNode(apiKey, params) {
  return generateI2V(apiKey, params);
}

/** Single audio node via studio generateAudio. */
export async function runLocalAudioNode(apiKey, params) {
  return generateAudio(apiKey, params);
}

/**
 * Shape compatible with upstream pollNodeStatus success records.
 * @param {string} url
 * @param {string} [kind]
 */
export function localSucceededRecord(url, kind = "url") {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    status: "succeeded",
    result: {
      id,
      outputs: [{ type: kind, value: url }],
    },
  };
}
