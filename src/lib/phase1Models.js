// Phase 1 featured models — prepended to models.js arrays (defaults + new capabilities)

const VIDEO_STD = {
  prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'The prompt to generate the video' },
  aspect_ratio: {
    enum: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
    title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string',
    description: 'Aspect ratio of the output video.', default: '16:9',
  },
  duration: {
    enum: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    title: 'Duration', name: 'duration', type: 'int',
    description: 'Duration in seconds', default: 5,
  },
  resolution: {
    enum: ['480p', '720p', '1080p'],
    title: 'Resolution', name: 'resolution', type: 'string',
    description: 'Output resolution', default: '720p',
  },
};

const NANO_AR = {
  enum: ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9', 'auto'],
  title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string',
  description: 'Aspect ratio of the generated image.', default: 'auto',
};

export const PHASE1_T2I = [
  {
    id: 'nano-banana-2-lite',
    name: 'Nano Banana 2 Lite',
    endpoint: 'nano-banana-2-lite',
    family: 'nano',
    badge: 'Featured',
    inputs: {
      prompt: {
        type: 'string', title: 'Prompt', name: 'prompt',
        description: 'Fast T2I with sharp in-image text and character consistency.',
      },
      aspect_ratio: NANO_AR,
      resolution: { enum: ['1k', '2k', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '1k' },
    },
  },
  {
    id: 'flux-2-klein-4b-turbo',
    name: 'Flux Klein 4B Turbo',
    endpoint: 'flux-2-klein-4b-turbo',
    family: 'flux',
    badge: 'Fast',
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Ultra-fast text-to-image.' },
      aspect_ratio: {
        enum: ['16:9', '9:16', '1:1', '3:4', '4:3', '21:9', '9:21'],
        title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '1:1',
      },
    },
  },
  {
    id: 'flux-2-klein-9b-turbo',
    name: 'Flux Klein 9B Turbo',
    endpoint: 'flux-2-klein-9b-turbo',
    family: 'flux',
    badge: 'Fast',
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Fast mid-size T2I with richer detail.' },
      aspect_ratio: {
        enum: ['16:9', '9:16', '1:1', '3:4', '4:3', '21:9', '9:21'],
        title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '1:1',
      },
    },
  },
  {
    id: 'kling-o3-image',
    name: 'Kling O3 Image',
    endpoint: 'kling-o3-image',
    family: 'kling',
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Photoreal and stylised T2I up to 4K.' },
      aspect_ratio: {
        enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
        title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '1:1',
      },
      resolution: { enum: ['1k', '2k', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '2k' },
    },
  },
];

export const PHASE1_I2I = [
  {
    id: 'nano-banana-2-lite-edit',
    name: 'Nano Banana 2 Lite Edit',
    endpoint: 'nano-banana-2-lite-edit',
    family: 'nano',
    imageField: 'images_list',
    hasPrompt: true,
    maxImages: 14,
    badge: 'Featured',
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Fast image edit with up to 14 reference images.' },
      aspect_ratio: NANO_AR,
      resolution: { enum: ['1k', '2k', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '1k' },
    },
  },
  {
    id: 'flux-2-klein-4b-turbo-edit',
    name: 'Flux Klein 4B Turbo Edit',
    endpoint: 'flux-2-klein-4b-turbo-edit',
    family: 'flux',
    imageField: 'image_url',
    hasPrompt: true,
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Ultra-fast instruction-based edit.' },
      aspect_ratio: {
        enum: ['16:9', '9:16', '1:1', '3:4', '4:3'],
        title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '1:1',
      },
    },
  },
  {
    id: 'kling-o3-image-edit',
    name: 'Kling O3 Image Edit',
    endpoint: 'kling-o3-image-edit',
    family: 'kling',
    imageField: 'images_list',
    hasPrompt: true,
    maxImages: 10,
    inputs: {
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Natural language image edit up to 10 refs.' },
      aspect_ratio: {
        enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
        title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '1:1',
      },
      resolution: { enum: ['1k', '2k', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '2k' },
    },
  },
];

export const PHASE1_T2V = [
  {
    id: 'seedance-2-mini-text-to-video',
    name: 'Seedance 2 Mini T2V',
    endpoint: 'seedance-2-mini-text-to-video',
    family: 'seedance-2',
    badge: 'Budget',
    inputs: { ...VIDEO_STD },
  },
  {
    id: 'seedance-2.5-text-to-video',
    name: 'Seedance 2.5 T2V',
    endpoint: 'seedance-2.5-text-to-video',
    family: 'seedance-2',
    badge: 'Featured',
    inputs: {
      ...VIDEO_STD,
      duration: { enum: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], title: 'Duration', name: 'duration', type: 'int', default: 8 },
      resolution: { enum: ['720p', '1080p', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '1080p' },
    },
  },
  {
    id: 'seedance-2.1-text-to-video',
    name: 'Seedance 2.1 T2V',
    endpoint: 'seedance-2.1-text-to-video',
    family: 'seedance-2',
    inputs: { ...VIDEO_STD },
  },
  {
    id: 'kling-v3-turbo-standard-text-to-video',
    name: 'Kling v3 Turbo Standard T2V',
    endpoint: 'kling-v3-turbo-standard-text-to-video',
    family: 'kling-v3',
    inputs: {
      prompt: VIDEO_STD.prompt,
      aspect_ratio: { enum: ['16:9', '9:16', '1:1'], title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '16:9' },
      duration: { enum: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], title: 'Duration', name: 'duration', type: 'int', default: 5 },
    },
  },
  {
    id: 'kling-v3-turbo-pro-text-to-video',
    name: 'Kling v3 Turbo Pro T2V',
    endpoint: 'kling-v3-turbo-pro-text-to-video',
    family: 'kling-v3',
    inputs: {
      prompt: VIDEO_STD.prompt,
      aspect_ratio: { enum: ['16:9', '9:16', '1:1'], title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string', default: '16:9' },
      duration: { enum: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], title: 'Duration', name: 'duration', type: 'int', default: 5 },
    },
  },
  {
    id: 'seedance-2-extend',
    name: 'Seedance 2 Extend',
    endpoint: 'seedance-2-extend',
    family: 'seedance-2',
    requiresRequestId: true,
    inputs: {
      request_id: { type: 'string', title: 'Request ID', name: 'request_id', description: 'Request ID of the original Seedance video.' },
      prompt: { type: 'string', title: 'Prompt', name: 'prompt', description: 'Optional prompt to guide the extension.' },
      duration: { enum: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], title: 'Duration', name: 'duration', type: 'int', default: 5 },
    },
  },
];

export const PHASE1_I2V = [
  {
    id: 'seedance-2-mini-image-to-video',
    name: 'Seedance 2 Mini I2V',
    endpoint: 'seedance-2-mini-image-to-video',
    family: 'seedance-2',
    imageField: 'images_list',
    hasPrompt: true,
    badge: 'Budget',
    inputs: { ...VIDEO_STD },
  },
  {
    id: 'seedance-2.5-image-to-video',
    name: 'Seedance 2.5 I2V',
    endpoint: 'seedance-2.5-image-to-video',
    family: 'seedance-2',
    imageField: 'images_list',
    hasPrompt: true,
    badge: 'Featured',
    inputs: {
      ...VIDEO_STD,
      duration: { enum: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], title: 'Duration', name: 'duration', type: 'int', default: 8 },
      resolution: { enum: ['720p', '1080p', '4k'], title: 'Resolution', name: 'resolution', type: 'string', default: '1080p' },
    },
  },
  {
    id: 'seedance-2.1-image-to-video',
    name: 'Seedance 2.1 I2V',
    endpoint: 'seedance-2.1-image-to-video',
    family: 'seedance-2',
    imageField: 'images_list',
    hasPrompt: true,
    inputs: { ...VIDEO_STD },
  },
  {
    id: 'seedance-2-i2v',
    name: 'Seedance 2.0 I2V',
    endpoint: 'seedance-2-i2v',
    family: 'seedance-2',
    imageField: 'images_list',
    hasPrompt: true,
    inputs: { ...VIDEO_STD },
  },
  {
    id: 'kling-v3-turbo-standard-image-to-video',
    name: 'Kling v3 Turbo Standard I2V',
    endpoint: 'kling-v3-turbo-standard-image-to-video',
    family: 'kling-v3',
    imageField: 'image_url',
    hasPrompt: true,
    inputs: {
      prompt: VIDEO_STD.prompt,
      duration: { enum: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], title: 'Duration', name: 'duration', type: 'int', default: 5 },
    },
  },
  {
    id: 'kling-v3-turbo-pro-image-to-video',
    name: 'Kling v3 Turbo Pro I2V',
    endpoint: 'kling-v3-turbo-pro-image-to-video',
    family: 'kling-v3',
    imageField: 'image_url',
    hasPrompt: true,
    inputs: {
      prompt: VIDEO_STD.prompt,
      duration: { enum: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], title: 'Duration', name: 'duration', type: 'int', default: 5 },
    },
  },
];

// Seedance models that support extend/remix chaining
export const SEEDANCE_EXTEND_MODEL_IDS = new Set([
  'seedance-v2.0-t2v', 'seedance-v2.0-i2v',
  'seedance-2-t2v', 'seedance-2-i2v',
  'seedance-2-mini-text-to-video', 'seedance-2-mini-image-to-video',
  'seedance-2.1-text-to-video', 'seedance-2.1-image-to-video',
  'seedance-2.5-text-to-video', 'seedance-2.5-image-to-video',
  'seedance-2-text-to-video',
]);

export const SEEDANCE_EXTEND_ENDPOINT = 'seedance-2-extend';

export const VEO_EXTEND_ENDPOINT = 'veo3.1-extend-video';

export const VEO_EXTENDABLE_MODEL_IDS = new Set([
  'veo3.1-text-to-video',
  'veo3.1-fast-text-to-video',
  'veo3.1-image-to-video',
  'veo3.1-fast-image-to-video',
  'veo3.1-reference-to-video',
]);

export function isSeedanceExtendable(modelId) {
  return SEEDANCE_EXTEND_MODEL_IDS.has(modelId);
}

export function isVeoExtendable(modelId) {
  return VEO_EXTENDABLE_MODEL_IDS.has(modelId);
}
