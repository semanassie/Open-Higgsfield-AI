// Each app is a Muapi endpoint with a simple input schema.
// The UI will auto-generate a form from the `inputs` object.

import { viralPresets } from './viralPresets.js';

export { viralPresets };

export const appCategories = [
  {
    name: 'Image Effects',
    apps: [
      { id: 'nano-banana-effects', name: 'Artistic Effects', icon: '🎨',
        description: '3D Figurine, 16bit, Cartoon, Y2K, and more',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true },
          name: { type: 'select', title: 'Effect',
            enum: ['3D Figurine', '16bit Game Character', 'Cartoon', 'Pop Art',
                   '1950s Photo', 'Watercolor', 'Pixel Art', 'Neon Glow'] },
          aspect_ratio: { type: 'select', title: 'Ratio',
            enum: ['Auto', '1:1', '16:9', '9:16', '4:3'], default: 'Auto' }
        }
      },
      { id: 'ai-ghibli-style', name: 'Ghibli Style', icon: '🏯',
        description: 'Transform any image into Studio Ghibli style',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true },
          prompt: { type: 'text', title: 'Prompt (optional)' }
        }
      },
      { id: 'ai-anime-generator', name: 'Anime Style', icon: '⚔️',
        description: 'Convert photos to anime art',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true }
        }
      },
      { id: 'portrait-stylist', name: 'Portrait Stylist', icon: '💄',
        description: 'Professional portrait styling and enhancement',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true }
        }
      },
    ]
  },
  {
    name: 'Image Tools',
    apps: [
      { id: 'ai-background-remover', name: 'Remove Background', icon: '✂️',
        description: 'One-click background removal',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
      { id: 'ai-object-eraser', name: 'Erase Object', icon: '🧹',
        description: 'Remove unwanted objects from images',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
      { id: 'ai-image-extension', name: 'Expand Image', icon: '↔️',
        description: 'Outpaint — extend your image beyond its edges',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
      { id: 'ai-image-upscaler', name: 'Upscale Image', icon: '🔍',
        description: 'Enhance resolution and sharpen details',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
      { id: 'ai-color-photo', name: 'Colorize Photo', icon: '🌈',
        description: 'Add color to black & white photos',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
      { id: 'ai-skin-enhancer', name: 'Skin Enhancer', icon: '✨',
        description: 'Professional skin retouching',
        inputType: 'image',
        inputs: { image_url: { type: 'image', title: 'Image', required: true } }
      },
    ]
  },
  {
    name: 'Face Tools',
    apps: [
      { id: 'ai-image-face-swap', name: 'Face Swap (Image)', icon: '🎭',
        description: 'Swap faces between two images',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Target Image', required: true },
          swap_url: { type: 'image', title: 'Face to Swap In', required: true }
        }
      },
      { id: 'ai-dress-change', name: 'Change Outfit', icon: '👗',
        description: 'Change clothing on a person in an image',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true },
          prompt: { type: 'text', title: 'Describe new outfit' }
        }
      },
    ]
  },
  {
    name: 'Video Effects',
    apps: [
      { id: 'ai-video-effects', name: 'Video Effects', icon: '🎬',
        description: 'Cakeify, Film Noir, Watercolor, and more',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Start Image', required: true },
          prompt: { type: 'text', title: 'Prompt' },
          effect_type: { type: 'select', title: 'Effect',
            enum: ['Cakeify', 'Film Noir', 'Watercolor', 'Pixelate', 'Neon Dreams'] }
        }
      },
      { id: 'vfx', name: 'VFX (Explosions)', icon: '💥',
        description: 'Building explosion, car explosion, energy pulse',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true },
          prompt: { type: 'text', title: 'Prompt' },
          effect_type: { type: 'select', title: 'Effect',
            enum: ['Building Explosion', 'Car Explosion', 'Energy Pulse'] }
        }
      },
      { id: 'motion-controls', name: 'Camera Motion', icon: '🎥',
        description: '360 Orbit, Dolly In, Pan, Tilt, Zoom',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Image', required: true },
          prompt: { type: 'text', title: 'Prompt' },
          effect_type: { type: 'select', title: 'Motion',
            enum: ['360 Orbit', 'Dolly In', 'Dolly Out', 'Pan Left', 'Pan Right',
                   'Tilt Up', 'Tilt Down', 'Zoom In', 'Zoom Out'] }
        }
      },
      { id: 'ai-video-upscaler', name: 'Upscale Video', icon: '📺',
        description: 'Enhance video resolution',
        inputType: 'video',
        inputs: { video_url: { type: 'video', title: 'Video', required: true } }
      },
    ]
  },
  {
    name: 'Social & Product',
    apps: [
      { id: 'ai-product-shot', name: 'Product Shot', icon: '📦',
        description: 'Generate professional product photography',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Product Image', required: true },
          prompt: { type: 'text', title: 'Scene Description' }
        }
      },
      { id: 'ai-captions', name: 'Auto Captions', icon: '💬',
        description: 'Add subtitles/captions to video',
        inputType: 'video',
        inputs: { video_url: { type: 'video', title: 'Video', required: true } }
      },
    ]
  },
  {
    name: 'Utilities',
    apps: [
      { id: 'seedance-2-watermark-remover', name: 'Watermark Remover', icon: '🧼',
        description: 'Remove SD 2.0 watermarks from videos (free for a limited time)',
        inputType: 'video',
        inputs: { video_url: { type: 'video', title: 'Video', required: true } }
      },
      { id: 'autocrop', name: 'Auto Crop', icon: '📐',
        description: 'AI subject-tracking crop to your chosen aspect ratio',
        inputType: 'video',
        inputs: {
          video_url: { type: 'video', title: 'Video', required: true },
          aspect_ratio: { type: 'select', title: 'Aspect Ratio',
            enum: ['16:9', '9:16', '1:1', '4:5', '4:3'], default: '9:16' }
        }
      },
      { id: 'video-combiner', name: 'Combine Videos', icon: '🎞️',
        description: 'Merge multiple short clips into one seamless video',
        inputType: 'video',
        inputs: {
          videos_list: { type: 'text', title: 'Video URLs (one per line)', required: true,
            description: 'Paste hosted video URLs, one per line, in playback order' },
          aspect_ratio: { type: 'select', title: 'Output Ratio',
            enum: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'], default: 'auto' }
        }
      },
      { id: 'ai-clipping', name: 'AI Clipping', icon: '✂️',
        description: 'Turn long-form video into engaging short clips',
        inputType: 'video',
        inputs: { video_url: { type: 'video', title: 'Long Video', required: true } }
      },
      { id: 'photo-pack', name: 'Photo Pack', icon: '📸',
        description: 'Professional portrait pack — LinkedIn, CEO, lifestyle styles',
        inputType: 'image',
        inputs: {
          image_url: { type: 'image', title: 'Face Photo', required: true },
          style: { type: 'select', title: 'Style Pack',
            enum: ['LinkedIn', 'CEO', 'Tinder', 'Professional', 'Creative'], default: 'LinkedIn' }
        }
      },
      { id: 'tiktok-carousel', name: 'TikTok Carousel', icon: '📱',
        description: 'Generate viral TikTok carousel slides from a text prompt',
        inputType: 'text',
        inputs: {
          prompt: { type: 'text', title: 'Story Prompt', required: true },
          format: { type: 'select', title: 'Format',
            enum: ['Problem-Solution', 'Listicle', 'Tutorial', 'Before & After'], default: 'Listicle' },
          slide_count: { type: 'select', title: 'Slides',
            enum: ['3', '4', '5', '6', '7', '8', '9', '10'], default: '5' }
        }
      },
    ]
  }
];
