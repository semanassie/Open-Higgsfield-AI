/**
 * Same-origin copies of workflow template covers.
 * Files live in the host app at public/workflow-thumbs/.
 * A few official cdn.muapi.ai/outputs covers are private (S3 403). Those
 * slugs point at another public image already embedded in that workflow.
 * paper-cutting and phoenix had no other public image; their files are the
 * same output objects, fetched from the Wayback snapshot that still returns 200.
 */
const WORKFLOW_LOCAL_THUMBS = {
  "indie-anime-maker-qwen-flux-2-pro-wan2-2": "/workflow-thumbs/indie-anime-maker-qwen-flux-2-pro-wan2-2.jpg",
  "3d-logo-animation-nano-banana-2-veo-3-1": "/workflow-thumbs/3d-logo-animation-nano-banana-2-veo-3-1.jpg",
  "logo-transformer-nano-banana-2": "/workflow-thumbs/logo-transformer-nano-banana-2.jpg",
  "viral-talking-baby-video-maker-kling-grok-imagine": "/workflow-thumbs/viral-talking-baby-video-maker-kling-grok-imagine.jpg",
  "ugc-ads-workflow-seedance-2-omni": "/workflow-thumbs/ugc-ads-workflow-seedance-2-omni.png",
  "virtual-try-on-seedream-flux-kling-o1": "/workflow-thumbs/virtual-try-on-seedream-flux-kling-o1.jpg",
  "product-video-ad-maker-flux-2-pro-wan2-5": "/workflow-thumbs/product-video-ad-maker-flux-2-pro-wan2-5.jpg",
  "product-mockup-creation-nano-banana-pro": "/workflow-thumbs/product-mockup-creation-nano-banana-pro.jpg",
  "product-showcase-video-seedream-v5-seedance-v1-5": "/workflow-thumbs/product-showcase-video-seedream-v5-seedance-v1-5.jpg",
  "street-portrait-photography-seedream-v5-chroma": "/workflow-thumbs/street-portrait-photography-seedream-v5-chroma.jpg",
  "virtual-try-on-indian-ethnic-wear-nano-banana": "/workflow-thumbs/virtual-try-on-indian-ethnic-wear-nano-banana.png",
  "multi-angle-photo-reshoot-nano-banana-2": "/workflow-thumbs/multi-angle-photo-reshoot-nano-banana-2.png",
  "character-story-video-nano-banana-2-seedance-pro": "/workflow-thumbs/character-story-video-nano-banana-2-seedance-pro.jpg",
  "ai-wig-try-on-nano-banana": "/workflow-thumbs/ai-wig-try-on-nano-banana.png",
  "product-redesigner-seedream-v4-kling-o1": "/workflow-thumbs/product-redesigner-seedream-v4-kling-o1.jpg",
  "cartoon-dance-animation-nano-banana-2-kling-motion-control": "/workflow-thumbs/cartoon-dance-animation-nano-banana-2-kling-motion-control.jpg",
  "interior-design-visualizer-seedream-v5-flux-2-pro": "/workflow-thumbs/interior-design-visualizer-seedream-v5-flux-2-pro.jpg",
  "virtual-furniture-staging-qwen-flux-2-flex": "/workflow-thumbs/virtual-furniture-staging-qwen-flux-2-flex.png",
  "ai-real-estate-photographer-nano-banana-2": "/workflow-thumbs/ai-real-estate-photographer-nano-banana-2.jpg",
  "product-advertisement-wan2-6-image-edit": "/workflow-thumbs/product-advertisement-wan2-6-image-edit.png",
  "monkey-video-generator-nano-banana-veo-3-1": "/workflow-thumbs/monkey-video-generator-nano-banana-veo-3-1.jpg",
  "product-photoshoot-video-nano-banana-2-kling-v2-6": "/workflow-thumbs/product-photoshoot-video-nano-banana-2-kling-v2-6.jpg",
  "influencer-content-package-generator-seedance-lite": "/workflow-thumbs/influencer-content-package-generator-seedance-lite.png",
  "ai-interior-makeover-nano-banana": "/workflow-thumbs/ai-interior-makeover-nano-banana.jpg",
  "product-360-video-flux-2-flex-wan2-5": "/workflow-thumbs/product-360-video-flux-2-flex-wan2-5.png",
  "ai-action-figure-generator-nano-banana-2": "/workflow-thumbs/ai-action-figure-generator-nano-banana-2.jpg",
  "fashion-video-generator-qwen-image-seedance-v1-5": "/workflow-thumbs/fashion-video-generator-qwen-image-seedance-v1-5.jpg",
  "3d-floor-plan-rendering-nano-banana-2": "/workflow-thumbs/3d-floor-plan-rendering-nano-banana-2.jpg",
  "giant-product-vfx-ad-nano-banana-2": "/workflow-thumbs/giant-product-vfx-ad-nano-banana-2.jpg",
  "couple-photo-grid-creator-qwen-image": "/workflow-thumbs/couple-photo-grid-creator-qwen-image.jpg",
  "professional-fashion-headshots-flux-2-pro": "/workflow-thumbs/professional-fashion-headshots-flux-2-pro.png",
  "selfie-with-celebrities-kling-o1-pixverse-v5": "/workflow-thumbs/selfie-with-celebrities-kling-o1-pixverse-v5.png",
  "kinetic-recall-effect-nano-banana-2-kling-o1": "/workflow-thumbs/kinetic-recall-effect-nano-banana-2-kling-o1.jpg",
  "photography-editing-wan2-5-nano-banana-2-seedream-v5": "/workflow-thumbs/photography-editing-wan2-5-nano-banana-2-seedream-v5.png",
  "furniture-photography-studio-seedream-v5-nano-banana": "/workflow-thumbs/furniture-photography-studio-seedream-v5-nano-banana.png",
  "room-style-transformation-qwen-image-nano-banana": "/workflow-thumbs/room-style-transformation-qwen-image-nano-banana.png",
  "ai-book-cover-design-wan2-5-qwen-image": "/workflow-thumbs/ai-book-cover-design-wan2-5-qwen-image.png",
  "jewelry-product-video-nano-banana-2-grok-imagine": "/workflow-thumbs/jewelry-product-video-nano-banana-2-grok-imagine.jpg",
  "ai-home-decor-designer-nano-banana": "/workflow-thumbs/ai-home-decor-designer-nano-banana.jpg",
  "ai-interior-designer-midjourney-v7-kling-o1": "/workflow-thumbs/ai-interior-designer-midjourney-v7-kling-o1.jpg",
  "giant-product-showcase-animation-veo-3-1-nano-banana": "/workflow-thumbs/giant-product-showcase-animation-veo-3-1-nano-banana.jpg",
  "double-exposure-portrait-maker-nano-banana-2": "/workflow-thumbs/double-exposure-portrait-maker-nano-banana-2.png",
  "keyboard-art-image-maker-ideogram-v3": "/workflow-thumbs/keyboard-art-image-maker-ideogram-v3.jpg",
  "soccer-collectable-card-maker-nano-banana": "/workflow-thumbs/soccer-collectable-card-maker-nano-banana.png",
  "ai-sculpture-maker-nano-banana-2": "/workflow-thumbs/ai-sculpture-maker-nano-banana-2.png",
  "furniture-campaign-generator-seedream-v5-qwen-nano": "/workflow-thumbs/furniture-campaign-generator-seedream-v5-qwen-nano.png",
  "paper-cutting-art-seedream-v5": "/workflow-thumbs/paper-cutting-art-seedream-v5.jpg",
  "phoenix-multi-model-image-to-video-wan2-seedream": "/workflow-thumbs/phoenix-multi-model-image-to-video-wan2-seedream.png",
};

export function localWorkflowThumbnail(slug) {
  if (!slug) return null;
  return WORKFLOW_LOCAL_THUMBS[slug] || null;
}
