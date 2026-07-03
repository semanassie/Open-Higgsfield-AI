# Video Model Fields Audit

Generated: 2026-07-03T21:32:52.268Z

## Summary
- I2V: 71 | T2V: 54 | V2V: 5
- API test hints: 57
- **BROKEN**: 0 | **SUSPECT**: 0 | **UNVERIFIED**: 53

## BROKEN (metadata ≠ API)
(none)

## I2V full table
| Model | imageField | API expects | Payload | Status | Studio |
|-------|------------|-------------|---------|--------|--------|
| seedance-2-mini-image-to-video | images_list | - | images_list | UNVERIFIED | SeedanceStudio, ShortsStudio |
| seedance-2.5-image-to-video | images_list | - | images_list | UNVERIFIED | SeedanceStudio |
| seedance-2.1-image-to-video | images_list | - | images_list | UNVERIFIED | SeedanceStudio |
| seedance-2-i2v | images_list | - | images_list | UNVERIFIED | SeedanceStudio |
| kling-v3-turbo-standard-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v3-turbo-pro-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| seedance-2-omni-reference-no-video | image_url | - | image_url | UNVERIFIED | SeedanceStudio |
| pixverse-v6-i2v | images_list | images_list | images_list | OK | VideoStudio |
| wan2.7-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.7-reference-to-video | videos_list | videos_list | videos_list | OK | VideoStudio |
| ai-video-effects | image_url | - | image_url | UNVERIFIED | VideoStudio |
| motion-controls | image_url | - | image_url | UNVERIFIED | VideoStudio |
| vfx | image_url | - | image_url | UNVERIFIED | VideoStudio |
| veo3-image-to-video | images_list | images_list | images_list | OK | VideoStudio |
| veo3-fast-image-to-video | images_list | images_list | images_list | OK | VideoStudio |
| runway-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.1-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| midjourney-v7-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| hunyuan-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v2.1-master-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v2.1-standard-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v2.1-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.2-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| runway-act-two-i2v | reference_video_url | reference_video_url | image_url | OK | VideoStudio |
| pixverse-v4.5-i2v | images_list | images_list | images_list | OK | VideoStudio |
| vidu-v2.0-i2v | images_list | images_list | images_list | OK | VideoStudio |
| vidu-q1-reference | images_list | images_list | images_list | OK | VideoStudio |
| minimax-hailuo-02-standard-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| minimax-hailuo-02-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| video-effects | image_url | - | image_url | UNVERIFIED | VideoStudio |
| seedance-lite-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| seedance-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| pixverse-v5-i2v | images_list | images_list | images_list | OK | VideoStudio |
| seedance-lite-reference-video | images_list | images_list | images_list | OK | VideoStudio |
| wan2.1-reference-video | images_list | images_list | images_list | OK | VideoStudio |
| kling-v2.5-turbo-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.5-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.5-image-to-video-fast | image_url | - | image_url | UNVERIFIED | VideoStudio |
| openai-sora-2-image-to-video | images_list | images_list | images_list | OK | VideoStudio |
| ovi-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| openai-sora-2-pro-image-to-video | images_list | images_list | images_list | OK | VideoStudio |
| leonardoai-motion-2.0 | image_url | - | image_url | UNVERIFIED | VideoStudio |
| higgsfield-dop-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| veo3.1-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| veo3.1-fast-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| veo3.1-reference-to-video | images_list | images_list | images_list | OK | VideoStudio |
| seedance-pro-i2v-fast | image_url | - | image_url | UNVERIFIED | VideoStudio |
| ltx-2-pro-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| ltx-2-fast-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| vidu-q2-reference | images_list | images_list | images_list | OK | VideoStudio |
| vidu-q2-turbo-start-end-video | last_image | last_image | image_url | OK | VideoStudio |
| vidu-q2-pro-start-end-video | last_image | last_image | image_url | OK | VideoStudio |
| minimax-hailuo-2.3-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| minimax-hailuo-2.3-standard-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| minimax-hailuo-2.3-fast | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v2.5-turbo-std-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| grok-imagine-image-to-video | images_list | images_list | images_list | OK | VideoStudio |
| kling-o1-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-o1-reference-to-video | images_list | images_list | images_list | OK | VideoStudio |
| kling-v2.6-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| pixverse-v5.5-i2v | images_list | images_list | images_list | OK | VideoStudio |
| wan2.2-spicy-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| wan2.6-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-o1-standard-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-o1-standard-reference-to-video | images_list | images_list | images_list | OK | VideoStudio |
| seedance-v1.5-pro-i2v | image_url | - | image_url | UNVERIFIED | VideoStudio |
| seedance-v1.5-pro-i2v-fast | image_url | - | image_url | UNVERIFIED | VideoStudio |
| ltx-2-19b-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v3.0-pro-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| kling-v3.0-standard-image-to-video | image_url | - | image_url | UNVERIFIED | VideoStudio |
| seedance-v2.0-i2v | images_list | - | images_list | UNVERIFIED | VideoStudio |