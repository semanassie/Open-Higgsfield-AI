# Model Parameters Audit
Generated: 2026-07-03T21:32:35.232Z
## Model counts
- **t2i**: 50
- **t2v**: 54
- **i2i**: 60
- **i2v**: 71
- **v2v**: 5
- **lipsync**: 9
- **tts**: 2
- **music**: 3
- **sfx**: 1
## Payload build tests: 249 pass, 0 fail
- (none)
## Audio validation: 5 pass, 0 fail
- (none)
## App validation: 24 pass, 0 fail
- (none)
## Missing in models_dump.json: 0
## Enum mismatches (models.js vs dump): 1
- `wan2.7-reference-to-video.resolution`
## Studio warnings: 0
## Studio unknown model IDs: 9
- AppsGallery: `portrait-stylist` (not in models.js arrays (may be app endpoint))
- AppsGallery: `ai-video-upscaler` (not in models.js arrays (may be app endpoint))
- AppsGallery: `ai-captions` (not in models.js arrays (may be app endpoint))
- AppsGallery: `seedance-2-watermark-remover` (not in models.js arrays (may be app endpoint))
- AppsGallery: `autocrop` (not in models.js arrays (may be app endpoint))
- AppsGallery: `video-combiner` (not in models.js arrays (may be app endpoint))
- AppsGallery: `ai-clipping` (not in models.js arrays (may be app endpoint))
- AppsGallery: `photo-pack` (not in models.js arrays (may be app endpoint))
- AppsGallery: `tiktok-carousel` (not in models.js arrays (may be app endpoint))
## Video field mismatches: 0 BROKEN
- (none)
See `video-fields-audit.md` for full I2V/T2V/V2V table.