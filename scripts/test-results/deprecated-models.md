# Model Endpoint Test Results

**Test Date:** 2026-04-09T15:04:31.830Z
**Total Models Tested:** 244

## Summary

| Category | Count |
|----------|-------|
| ✅ Available | 126 |
| ❌ Deprecated | 9 |
| ⚠️ Rate Limited | 0 |
| 🔥 Server Error | 1 |
| 📝 Client Error | 107 |
| ❓ Unknown Error | 1 |
| ⏭️ Skipped | 0 |

## Deprecated Models (Recommended for Removal)

These models returned 404 or explicit deprecation errors:

1. **flux-dev-lora** (Flux Dev Lora)
   - Category: t2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

2. **hidream-i1-fast** (Hidream I1 Fast)
   - Category: t2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

3. **hidream-i1-dev** (Hidream I1 Dev)
   - Category: t2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

4. **hidream-i1-full** (Hidream I1 Full)
   - Category: t2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

5. **bytedance-seedream-v3** (Bytedance Seedream v3)
   - Category: t2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

6. **image-passthrough** (Image Passthrough)
   - Category: i2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

7. **Api Node** (Api Node)
   - Category: i2iModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

8. **seedance-v2.0-omni-reference** (Seedance 2.0 Omni Reference I2V)
   - Category: i2vModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

9. **mmaudio-v2-text-to-audio** (MMAudio Text to Audio)
   - Category: sfxModels
   - Status: 404
   - Reason: 404 - Endpoint not found
   - Response: `{"detail":"Not Found"}`

## Models Needing Investigation

These models returned client errors (400-range) and may need different payloads:

1. **flux-pulid** (Flux Pulid)
   - Category: t2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","image_url"],"msg":"Field required","input":{"prompt":"test image","aspect_ratio":"1:1","num_images":1},"url":"https://errors.pydantic.dev/2.12/v/missing"}]}

2. **flux-redux** (Flux Redux)
   - Category: t2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","image_url"],"msg":"Field required","input":{"prompt":"test image","aspect_ratio":"1:1","num_images":1},"url":"https://errors.pydantic.dev/2.12/v/missing"}]}

3. **seedance-2.0-omni-reference-480p** (Seedance 2.0 Omni Reference 480p)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"greater_than_equal","loc":["body","duration"],"msg":"Input should be greater than or equal to 8","input":5,"ctx":{"ge":8},"url":"https://errors.pydantic.dev/2.12/v/greater_than_equ

4. **pixverse-v6-t2v** (Pixverse V6 T2V)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '360p', '540p', '720p' or '1080p'","input":"480p","ctx":{"expected":"'360p', '540p', '720p' or '1080p'"},"url":"ht

5. **wan2.7-text-to-video** (Wan 2.7 T2V)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

6. **veo3.1-4k-video** (Veo 3.1 4K T2V)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","request_id"],"msg":"Field required","input":{"prompt":"test video","aspect_ratio":"16:9","duration":5,"resolution":"480p"},"url":"https://errors.pydantic.de

7. **seedance-v1.5-pro-t2v-fast** (Seedance v1.5 Pro Fast)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

8. **seedance-v2.0-extend** (Seedance 2.0 Extend)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","request_id"],"msg":"Field required","input":{"prompt":"test video","aspect_ratio":"16:9","duration":5,"resolution":"480p"},"url":"https://errors.pydantic.de

9. **veo3.1-text-to-video** (Veo 3.1)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p', '1080p' or '4k'","input":"480p","ctx":{"expected":"'720p', '1080p' or '4k'"},"url":"https://errors.pydanti

10. **veo3.1-fast-text-to-video** (Veo 3.1 Fast)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p', '1080p' or '4k'","input":"480p","ctx":{"expected":"'720p', '1080p' or '4k'"},"url":"https://errors.pydanti

11. **wan2.5-text-to-video-fast** (Wan 2.5 Fast)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

12. **wan2.6-text-to-video** (Wan 2.6)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

13. **pixverse-v4.5-t2v** (Pixverse v4.5)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '360p', '540p', '720p' or '1080p'","input":"480p","ctx":{"expected":"'360p', '540p', '720p' or '1080p'"},"url":"ht

14. **pixverse-v5-t2v** (Pixverse v5)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '360p', '540p', '720p' or '1080p'","input":"480p","ctx":{"expected":"'360p', '540p', '720p' or '1080p'"},"url":"ht

15. **pixverse-v5.5-t2v** (Pixverse v5.5)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '360p', '540p', '720p' or '1080p'","input":"480p","ctx":{"expected":"'360p', '540p', '720p' or '1080p'"},"url":"ht

16. **minimax-hailuo-02-standard-t2v** (Hailuo 02 Standard)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6 or 10","input":5,"ctx":{"expected":"6 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"},{"type":"l

17. **minimax-hailuo-02-pro-t2v** (Hailuo 02 Pro)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6","input":5,"ctx":{"expected":"6"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"},{"type":"literal_error

18. **minimax-hailuo-2.3-pro-t2v** (Hailuo 2.3 Pro)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '1080p'","input":"480p","ctx":{"expected":"'1080p'"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

19. **minimax-hailuo-2.3-standard-t2v** (Hailuo 2.3 Standard)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6 or 10","input":5,"ctx":{"expected":"6 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

20. **openai-sora-2-text-to-video** (Sora 2)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 10 or 15","input":5,"ctx":{"expected":"10 or 15"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

21. **openai-sora-2-pro-text-to-video** (Sora 2 Pro)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

22. **vidu-v2.0-t2v** (Vidu v2.0)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","aspect_ratio"],"msg":"Input should be '9:16'","input":"16:9","ctx":{"expected":"'9:16'"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"},{"t

23. **grok-imagine-text-to-video** (Grok Imagine)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"greater_than_equal","loc":["body","duration"],"msg":"Input should be greater than or equal to 6","input":5,"ctx":{"ge":6},"url":"https://errors.pydantic.dev/2.12/v/greater_than_equ

24. **ltx-2-pro-text-to-video** (LTX 2 Pro)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6, 8 or 10","input":5,"ctx":{"expected":"6, 8 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

25. **ltx-2-fast-text-to-video** (LTX 2 Fast)
   - Category: t2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6, 8, 10, 12, 14, 16, 18 or 20","input":5,"ctx":{"expected":"6, 8, 10, 12, 14, 16, 18 or 20"},"url":"https://errors.

26. **wan2.7-image-edit** (Wan 2.7 Image Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

27. **wan2.7-image-edit-pro** (Wan 2.7 Image Edit Pro)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

28. **ai-image-face-swap** (AI Image Face Swap)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","swap_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text

29. **ai-dress-change** (AI Dress Change)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","model_image_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFF

30. **ai-product-shot** (AI Product Shot)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","scene_description"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FF

31. **ai-product-photography** (AI Product Photography)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","person_image_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFF

32. **ai-object-eraser** (AI Object Eraser)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","mask_image_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFF

33. **flux-kontext-pro-i2i** (Flux Kontext Pro I2I)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

34. **flux-kontext-max-i2i** (Flux Kontext Max I2I)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

35. **gpt4o-image-to-image** (GPT-4o Image To Image)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

36. **gpt4o-edit** (GPT-4o Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","mask_image_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFF

37. **nano-banana-edit** (Nano Banana Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

38. **bytedance-seedream-edit-v4** (Bytedance Seedream Edit v4)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

39. **qwen-image-edit-plus** (Qwen Image Edit Plus)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"value_error","loc":["body","images_list"],"msg":"Value error, You must provide between 1 to 3 image URLs","input":[],"ctx":{"error":{}},"url":"https://errors.pydantic.dev/2.12/v/va

40. **wan2.5-image-edit** (Wan2.5 Image Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

41. **qwen-image-edit-plus-lora** (Qwen Image Edit Plus Lora)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

42. **nano-banana-pro-edit** (Nano Banana Pro Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

43. **kling-o1-edit-image** (Kling O1 Edit Image)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

44. **flux-2-dev-edit** (Flux 2 Dev Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

45. **flux-2-flex-edit** (Flux 2 Flex Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

46. **flux-2-pro-edit** (Flux 2 Pro Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

47. **vidu-q2-reference-to-image** (Vidu Q2 Reference To Image)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

48. **bytedance-seedream-v4.5-edit** (Bytedance Seedream v4.5 Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

49. **qwen-image-edit-2511** (Qwen Image Edit 2511)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

50. **wan2.6-image-edit** (Wan2.6 Image Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

51. **gpt-image-1.5-edit** (Gpt Image 1.5 Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

52. **grok-imagine-image-to-image** (Grok Imagine Image To Image)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"value_error","loc":["body","images_list"],"msg":"Value error, You must provide either `image_url` or `images_list`","input":[],"ctx":{"error":{}},"url":"https://errors.pydantic.dev

53. **flux-2-klein-4b-edit** (Flux 2 Klein 4b Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

54. **flux-2-klein-9b-edit** (Flux 2 Klein 9b Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

55. **add-image-watermark** (Add Image Watermark)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","watermark_image_url"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/

56. **nano-banana-2-edit** (Nano Banana 2 Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

57. **seedream-5.0-edit** (Seedream 5.0 Edit)
   - Category: i2iModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"edit test","aspect_ratio":"1:1","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?t

58. **pixverse-v6-i2v** (Pixverse V6 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

59. **wan2.7-image-to-video** (Wan 2.7 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

60. **wan2.7-reference-to-video** (Wan 2.7 Reference To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","videos_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

61. **ai-video-effects** (AI Video Effects)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","name"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_ratio":

62. **motion-controls** (Motion Controls)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","name"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_ratio":

63. **vfx** (VFX)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","name"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_ratio":

64. **veo3-image-to-video** (Veo3 Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

65. **veo3-fast-image-to-video** (Veo3 Fast Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

66. **runway-image-to-video** (Runway Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

67. **runway-act-two-i2v** (Runway Act Two I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","reference_video_url"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test",

68. **pixverse-v4.5-i2v** (Pixverse v4.5 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

69. **vidu-v2.0-i2v** (Vidu v2.0 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

70. **vidu-q1-reference** (Vidu Q1 Reference)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

71. **minimax-hailuo-02-standard-i2v** (Minimax Hailuo 02 Standard I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6 or 10","input":5,"ctx":{"expected":"6 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"},{"type":"l

72. **minimax-hailuo-02-pro-i2v** (Minimax Hailuo 02 Pro I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6","input":5,"ctx":{"expected":"6"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"},{"type":"literal_error

73. **pixverse-v5-i2v** (Pixverse v5 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

74. **seedance-lite-reference-video** (Seedance Lite Reference Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

75. **wan2.1-reference-video** (Wan2.1 Reference Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

76. **wan2.5-image-to-video-fast** (Wan2.5 Image To Video Fast)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

77. **openai-sora-2-image-to-video** (Openai Sora 2 Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

78. **openai-sora-2-pro-image-to-video** (Openai Sora 2 Pro Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

79. **veo3.1-image-to-video** (Veo3.1 Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p', '1080p' or '4k'","input":"480p","ctx":{"expected":"'720p', '1080p' or '4k'"},"url":"https://errors.pydanti

80. **veo3.1-fast-image-to-video** (Veo3.1 Fast Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p', '1080p' or '4k'","input":"480p","ctx":{"expected":"'720p', '1080p' or '4k'"},"url":"https://errors.pydanti

81. **veo3.1-reference-to-video** (Veo3.1 Reference To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

82. **ltx-2-pro-image-to-video** (Ltx 2 Pro Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6, 8 or 10","input":5,"ctx":{"expected":"6, 8 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

83. **ltx-2-fast-image-to-video** (Ltx 2 Fast Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6, 8, 10, 12, 14, 16, 18 or 20","input":5,"ctx":{"expected":"6, 8, 10, 12, 14, 16, 18 or 20"},"url":"https://errors.

84. **vidu-q2-reference** (Vidu Q2 Reference)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

85. **vidu-q2-turbo-start-end-video** (Vidu Q2 Turbo Start End Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","last_image"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_r

86. **vidu-q2-pro-start-end-video** (Vidu Q2 Pro Start End Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","last_image"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_r

87. **minimax-hailuo-2.3-pro-i2v** (Minimax Hailuo 2.3 Pro I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '1080p'","input":"480p","ctx":{"expected":"'1080p'"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

88. **minimax-hailuo-2.3-standard-i2v** (Minimax Hailuo 2.3 Standard I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6 or 10","input":5,"ctx":{"expected":"6 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

89. **minimax-hailuo-2.3-fast** (Minimax Hailuo 2.3 Fast)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","duration"],"msg":"Input should be 6 or 10","input":5,"ctx":{"expected":"6 or 10"},"url":"https://errors.pydantic.dev/2.12/v/literal_error"}]}

90. **grok-imagine-image-to-video** (Grok Imagine Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

91. **kling-o1-reference-to-video** (Kling O1 Reference To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

92. **pixverse-v5.5-i2v** (Pixverse v5.5 I2V)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

93. **wan2.6-image-to-video** (Wan2.6 Image To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

94. **kling-o1-standard-reference-to-video** (Kling O1 Standard Reference To Video)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","images_list"],"msg":"Field required","input":{"prompt":"animate test","image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","aspect_

95. **seedance-v1.5-pro-i2v-fast** (Seedance v1.5 Pro I2V Fast)
   - Category: i2vModels
   - Status: 422
   - Response: {"detail":[{"type":"literal_error","loc":["body","resolution"],"msg":"Input should be '720p' or '1080p'","input":"480p","ctx":{"expected":"'720p' or '1080p'"},"url":"https://errors.pydantic.dev/2.12/v

96. **pixverse-v6-transition** (Pixverse V6 Transition)
   - Category: v2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","image_url"],"msg":"Field required","input":{"video_url":"https://via.placeholder.com/test.mp4","prompt":"extend"},"url":"https://errors.pydantic.dev/2.12/v/

97. **veo3.1-extend-video** (Veo 3.1 Extend Video)
   - Category: v2vModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","request_id"],"msg":"Field required","input":{"video_url":"https://via.placeholder.com/test.mp4","prompt":"extend"},"url":"https://errors.pydantic.dev/2.12/v

98. **sync-lipsync** (Sync Lipsync)
   - Category: lipsyncModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","video_url"],"msg":"Field required","input":{"image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","audio_url":"https://via.placehold

99. **latent-sync** (LatentSync)
   - Category: lipsyncModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","video_url"],"msg":"Field required","input":{"image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","audio_url":"https://via.placehold

100. **creatify-lipsync** (Creatify Lipsync)
   - Category: lipsyncModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","video_url"],"msg":"Field required","input":{"image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","audio_url":"https://via.placehold

101. **veed-lipsync** (Veed Lipsync)
   - Category: lipsyncModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","video_url"],"msg":"Field required","input":{"image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","audio_url":"https://via.placehold

102. **infinitetalk-video-to-video** (Infinite Talk V2V)
   - Category: lipsyncModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","video_url"],"msg":"Field required","input":{"image_url":"https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test","audio_url":"https://via.placehold

103. **minimax-speech-2.6-hd** (Minimax Speech HD)
   - Category: ttsModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","voice_id"],"msg":"Field required","input":{"prompt":"test audio","duration":5},"url":"https://errors.pydantic.dev/2.12/v/missing"}]}

104. **minimax-speech-2.6-turbo** (Minimax Speech Turbo)
   - Category: ttsModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","voice_id"],"msg":"Field required","input":{"prompt":"test audio","duration":5},"url":"https://errors.pydantic.dev/2.12/v/missing"}]}

105. **suno-create-music** (Suno Create Music)
   - Category: musicModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","style"],"msg":"Field required","input":{"prompt":"test audio","duration":5},"url":"https://errors.pydantic.dev/2.12/v/missing"}]}

106. **suno-remix-music** (Suno Remix)
   - Category: musicModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","audio_url"],"msg":"Field required","input":{"prompt":"test audio","duration":5},"url":"https://errors.pydantic.dev/2.12/v/missing"},{"type":"missing","loc":

107. **suno-extend-music** (Suno Extend)
   - Category: musicModels
   - Status: 422
   - Response: {"detail":[{"type":"missing","loc":["body","audio_url"],"msg":"Field required","input":{"prompt":"test audio","duration":5},"url":"https://errors.pydantic.dev/2.12/v/missing"},{"type":"missing","loc":

## Available Models

These models are confirmed working:

**Total:** 126 models available

<details>
<summary>Click to see full list</summary>

1. nano-banana (t2iModels) - 200 (658ms)
2. flux-dev (t2iModels) - 200 (212ms)
3. flux-kontext-dev-t2i (t2iModels) - 200 (210ms)
4. ai-anime-generator (t2iModels) - 200 (288ms)
5. wan2.1-text-to-image (t2iModels) - 200 (221ms)
6. flux-kontext-pro-t2i (t2iModels) - 200 (213ms)
7. flux-kontext-max-t2i (t2iModels) - 200 (274ms)
8. gpt4o-text-to-image (t2iModels) - 200 (209ms)
9. midjourney-v7-text-to-image (t2iModels) - 200 (541ms)
10. flux-schnell (t2iModels) - 200 (222ms)
11. qwen-image (t2iModels) - 200 (213ms)
12. ideogram-v3-t2i (t2iModels) - 200 (225ms)
13. google-imagen4 (t2iModels) - 200 (222ms)
14. google-imagen4-fast (t2iModels) - 200 (247ms)
15. google-imagen4-ultra (t2iModels) - 200 (206ms)
16. sdxl-image (t2iModels) - 200 (210ms)
17. bytedance-seedream-v4 (t2iModels) - 200 (250ms)
18. hunyuan-image-2.1 (t2iModels) - 200 (211ms)
19. chroma-image (t2iModels) - 200 (274ms)
20. flux-krea-dev (t2iModels) - 200 (205ms)
21. perfect-pony-xl (t2iModels) - 200 (226ms)
22. neta-lumina (t2iModels) - 200 (216ms)
23. wan2.5-text-to-image (t2iModels) - 200 (324ms)
24. hunyuan-image-3.0 (t2iModels) - 200 (264ms)
25. leonardoai-phoenix-1.0 (t2iModels) - 200 (2744ms)
26. leonardoai-lucid-origin (t2iModels) - 200 (215ms)
27. reve-text-to-image (t2iModels) - 200 (478ms)
28. grok-imagine-text-to-image (t2iModels) - 200 (269ms)
29. nano-banana-pro (t2iModels) - 200 (252ms)
30. kling-o1-text-to-image (t2iModels) - 200 (348ms)
31. z-image-turbo (t2iModels) - 200 (225ms)
32. flux-2-dev (t2iModels) - 200 (342ms)
33. flux-2-flex (t2iModels) - 200 (228ms)
34. flux-2-pro (t2iModels) - 200 (217ms)
35. vidu-q2-text-to-image (t2iModels) - 200 (255ms)
36. bytedance-seedream-v4.5 (t2iModels) - 200 (211ms)
37. gpt-image-1.5 (t2iModels) - 200 (243ms)
38. wan2.6-text-to-image (t2iModels) - 200 (797ms)
39. qwen-text-to-image-2512 (t2iModels) - 200 (302ms)
40. flux-2-klein-4b (t2iModels) - 200 (288ms)
41. flux-2-klein-9b (t2iModels) - 200 (228ms)
42. z-image-base (t2iModels) - 200 (216ms)
43. nano-banana-2 (t2iModels) - 200 (231ms)
44. seedream-5.0 (t2iModels) - 200 (236ms)
45. seedance-2.0-omni-reference (t2vModels) - 200 (196ms)
46. seedance-2-text-to-video (t2vModels) - 200 (197ms)
47. seedance-lite-t2v (t2vModels) - 200 (215ms)
48. seedance-pro-t2v (t2vModels) - 200 (542ms)
49. seedance-pro-t2v-fast (t2vModels) - 200 (356ms)
50. seedance-v1.5-pro-t2v (t2vModels) - 200 (251ms)
51. seedance-v2.0-t2v (t2vModels) - 200 (291ms)
52. kling-v2.1-master-t2v (t2vModels) - 200 (199ms)
53. kling-v2.5-turbo-pro-t2v (t2vModels) - 200 (200ms)
54. kling-v2.6-pro-t2v (t2vModels) - 200 (223ms)
55. kling-o1-text-to-video (t2vModels) - 200 (398ms)
56. kling-v3.0-pro-text-to-video (t2vModels) - 200 (199ms)
57. kling-v3.0-standard-text-to-video (t2vModels) - 200 (207ms)
58. veo3-text-to-video (t2vModels) - 200 (250ms)
59. veo3-fast-text-to-video (t2vModels) - 200 (226ms)
60. wan2.1-text-to-video (t2vModels) - 200 (5478ms)
61. wan2.2-text-to-video (t2vModels) - 200 (1181ms)
62. wan2.2-5b-fast-t2v (t2vModels) - 200 (201ms)
63. wan2.5-text-to-video (t2vModels) - 200 (257ms)
64. hunyuan-text-to-video (t2vModels) - 200 (279ms)
65. hunyuan-fast-text-to-video (t2vModels) - 200 (252ms)
66. openai-sora (t2vModels) - 200 (198ms)
67. ovi-text-to-video (t2vModels) - 200 (312ms)
68. ltx-2-19b-text-to-video (t2vModels) - 200 (248ms)
69. ai-image-upscaler (i2iModels) - 200 (226ms)
70. ai-background-remover (i2iModels) - 200 (222ms)
71. ai-skin-enhancer (i2iModels) - 200 (203ms)
72. ai-color-photo (i2iModels) - 200 (226ms)
73. flux-kontext-dev-i2i (i2iModels) - 200 (197ms)
74. ai-ghibli-style (i2iModels) - 200 (223ms)
75. midjourney-v7-image-to-image (i2iModels) - 200 (206ms)
76. bytedance-seededit-v3 (i2iModels) - 200 (208ms)
77. midjourney-v7-style-reference (i2iModels) - 200 (230ms)
78. midjourney-v7-omni-reference (i2iModels) - 200 (199ms)
79. minimax-image-01-subject-reference (i2iModels) - 200 (215ms)
80. ideogram-character (i2iModels) - 200 (198ms)
81. flux-pulid (i2iModels) - 200 (214ms)
82. qwen-image-edit (i2iModels) - 200 (203ms)
83. image-effects (i2iModels) - 200 (205ms)
84. ideogram-v3-reframe (i2iModels) - 200 (199ms)
85. nano-banana-effects (i2iModels) - 200 (202ms)
86. flux-kontext-effects (i2iModels) - 200 (196ms)
87. flux-redux (i2iModels) - 200 (206ms)
88. higgsfield-soul-image-to-image (i2iModels) - 200 (199ms)
89. reve-image-edit (i2iModels) - 200 (203ms)
90. topaz-image-upscale (i2iModels) - 200 (210ms)
91. seedvr2-image-upscale (i2iModels) - 200 (200ms)
92. qwen-text-to-image-2512 (i2iModels) - 200 (205ms)
93. seedance-2-omni-reference-no-video (i2vModels) - 200 (279ms)
94. wan2.1-image-to-video (i2vModels) - 200 (203ms)
95. midjourney-v7-image-to-video (i2vModels) - 200 (224ms)
96. hunyuan-image-to-video (i2vModels) - 200 (245ms)
97. kling-v2.1-master-i2v (i2vModels) - 200 (206ms)
98. kling-v2.1-standard-i2v (i2vModels) - 200 (205ms)
99. kling-v2.1-pro-i2v (i2vModels) - 200 (204ms)
100. wan2.2-image-to-video (i2vModels) - 200 (222ms)
101. video-effects (i2vModels) - 200 (240ms)
102. seedance-lite-i2v (i2vModels) - 200 (220ms)
103. seedance-pro-i2v (i2vModels) - 200 (223ms)
104. kling-v2.5-turbo-pro-i2v (i2vModels) - 200 (232ms)
105. wan2.5-image-to-video (i2vModels) - 200 (226ms)
106. ovi-image-to-video (i2vModels) - 200 (209ms)
107. leonardoai-motion-2.0 (i2vModels) - 200 (216ms)
108. higgsfield-dop-image-to-video (i2vModels) - 200 (255ms)
109. seedance-pro-i2v-fast (i2vModels) - 200 (214ms)
110. kling-v2.5-turbo-std-i2v (i2vModels) - 200 (749ms)
111. kling-o1-image-to-video (i2vModels) - 200 (287ms)
112. kling-v2.6-pro-i2v (i2vModels) - 200 (306ms)
113. wan2.2-spicy-image-to-video (i2vModels) - 200 (396ms)
114. kling-o1-standard-image-to-video (i2vModels) - 200 (222ms)
115. seedance-v1.5-pro-i2v (i2vModels) - 200 (217ms)
116. ltx-2-19b-image-to-video (i2vModels) - 200 (233ms)
117. kling-v3.0-pro-image-to-video (i2vModels) - 200 (226ms)
118. kling-v3.0-standard-image-to-video (i2vModels) - 200 (406ms)
119. seedance-v2.0-i2v (i2vModels) - 200 (226ms)
120. pixverse-v6-extend (v2vModels) - 200 (239ms)
121. wan2.7-video-extend (v2vModels) - 200 (262ms)
122. video-watermark-remover (v2vModels) - 200 (650ms)
123. infinitetalk-image-to-video (lipsyncModels) - 200 (631ms)
124. wan2.2-speech-to-video (lipsyncModels) - 200 (672ms)
125. ltx-2.3-lipsync (lipsyncModels) - 200 (506ms)
126. ltx-2-19b-lipsync (lipsyncModels) - 200 (643ms)
</details>
