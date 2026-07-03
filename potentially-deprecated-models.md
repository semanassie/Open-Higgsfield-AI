# Potentially Deprecated Models (MuAPI Platform)

**Note:** Without direct access to MuAPI's deprecation notices or API status logs, this list is based on reasonable assumptions about model versioning and platform evolution. These models should be tested individually to confirm availability.

## Likely Deprecated (High Confidence)

These models are very likely removed from MuAPI because they represent early versions with multiple successor releases:

### 1. Wan Image Generation (Very Early Versions)
| Model ID | Reason |
|----------|--------|
| `wan2.1-text-to-image` | Superseded by 2.5, 2.6, and 2.7 |

### 2. Wan Video Generation (Early Versions)
| Model ID | Reason |
|----------|--------|
| `wan2.1-text-to-video` | First Wan video model, multiple successors (2.2, 2.5, 2.6, 2.7) |
| `wan2.1-i2v` | Early I2V version, likely replaced |
| `wan2.2-text-to-video` | Superseded by 2.5, 2.6, 2.7 |
| `wan2.2-5b-fast-t2v` | Fast variant of early version |

### 3. Seedance Video (v1.x Series - Pre-2.0)
| Model ID | Reason |
|----------|--------|
| `seedance-v1.5-pro-t2v` | Pre-2.0 generation, likely removed |
| `seedance-v1.5-pro-t2v-fast` | Fast variant of v1.5 |
| `seedance-lite-t2v` | "Lite" branding discontinued in favor of 2.0 |
| `seedance-pro-t2v` | Old "Pro" branding |
| `seedance-pro-t2v-fast` | Old fast variant |

### 4. Kling Video (v2.1 Generation)
| Model ID | Reason |
|----------|--------|
| `kling-v2.1-master-t2v` | Superseded by 2.5, 2.6, 3.0, and O1 |
| `kling-v2.1-standard-t2v` | Standard variant of 2.1 |
| `kling-v2.1-pro-t2v` | Pro variant of 2.1 |
| `kling-v2.1-master-i2v` | I2V variant of 2.1 |
| `kling-v2.1-standard-i2v` | Standard I2V of 2.1 |
| `kling-v2.1-pro-i2v` | Pro I2V of 2.1 |

### 5. Veo (v3.0 - Pre-3.1)
| Model ID | Reason |
|----------|--------|
| `veo3-text-to-video` | Superseded by veo3.1 series |
| `veo3-fast-text-to-video` | Fast variant of 3.0 |
| `veo3-image-to-video` | I2V variant of 3.0 |
| `veo3-fast-image-to-video` | Fast I2V of 3.0 |

### 6. Pixverse Video (v4.5 and v5.x)
| Model ID | Reason |
|----------|--------|
| `pixverse-v4.5-t2v` | Superseded by v5, v5.5, and v6 |
| `pixverse-v4.5-i2v` | I2V variant of v4.5 |
| `pixverse-v4.5-transition` | V2V variant of v4.5 |
| `pixverse-v5-t2v` | Superseded by v5.5 and v6 |
| `pixverse-v5-i2v` | I2V variant of v5 |
| `pixverse-v5-transition` | V2V variant of v5 |
| `pixverse-v5-extend` | Extend variant of v5 |
| `pixverse-v5.5-t2v` | Superseded by v6 |
| `pixverse-v5.5-i2v` | I2V variant of v5.5 |
| `pixverse-v5.5-transition` | V2V variant of v5.5 |
| `pixverse-v5.5-extend` | Extend variant of v5.5 |

### 7. Hailuo Video (02 Series)
| Model ID | Reason |
|----------|--------|
| `minimax-hailuo-02-standard-t2v` | Superseded by 2.3 series |
| `minimax-hailuo-02-pro-t2v` | Superseded by 2.3 series |
| `minimax-hailuo-02-standard-i2v` | I2V variant of 02 series |
| `minimax-hailuo-02-pro-i2v` | Pro I2V variant of 02 series |

### 8. Flux Image (Original Variants)
| Model ID | Reason |
|----------|--------|
| `flux-dev` | Original Flux, may be replaced by Flux 2.x |
| `flux-dev-lora` | Original LoRA variant |
| `flux-schnell` | Original fast variant, may be replaced |
| `flux-pulid` | Face ID variant, possibly consolidated |
| `flux-redux` | Style variant, possibly consolidated |
| `flux-krea-dev` | Krea-specific variant |

### 9. SDXL Models
| Model ID | Reason |
|----------|--------|
| `sdxl-image` | Older architecture, may be removed in favor of newer T2I |
| `sdxl-image-editing` | SDXL I2I variant |

### 10. Audio Models (Old Versions)
| Model ID | Reason |
|----------|--------|
| `kokoro-base` | May be replaced by kokoro-82m |
| `stable-audio-open` | May be replaced by stable-audio-2 |
| `rinko-text-to-music` | May be replaced by rinko-music-v2 |

## Possibly Deprecated (Medium Confidence)

These models have newer versions but may still be available for backwards compatibility:

### Wan 2.5 and 2.6 Series
| Model ID | Reason |
|----------|--------|
| `wan2.5-text-to-image` | Superseded by 2.6, 2.7 |
| `wan2.5-text-to-video` | Superseded by 2.6, 2.7 |
| `wan2.5-text-to-video-fast` | Fast variant |
| `wan2.6-text-to-image` | Superseded by 2.7 |
| `wan2.6-text-to-video` | Superseded by 2.7 |
| `wan2.6-i2v` | I2V variant |

### Kling 2.5 and 2.6 Series
| Model ID | Reason |
|----------|--------|
| `kling-v2.5-turbo-pro-t2v` | Superseded by 2.6, 3.0, O1 |
| `kling-v2.5-turbo-std-t2v` | Standard turbo variant |
| `kling-v2.5-turbo-pro-i2v` | I2V variant |
| `kling-v2.5-turbo-std-i2v` | Standard I2V variant |
| `kling-v2.6-pro-t2v` | Superseded by 3.0 and O1 |
| `kling-v2.6-pro-i2v` | I2V variant |

### Seedream v3 and v4
| Model ID | Reason |
|----------|--------|
| `bytedance-seedream-v3` | Superseded by v4, v4.5, 5.0 |
| `bytedance-seedream-v4` | Superseded by v4.5, 5.0 |

### Hunyuan Image 2.1
| Model ID | Reason |
|----------|--------|
| `hunyuan-image-2.1` | Superseded by 3.0, but may remain as lower-cost option |

## Recommended Verification Process

To confirm which models are actually unavailable:

1. **Test each endpoint** with a simple API call (e.g., using curl or the app's dev console)
2. **Check for specific error codes:**
   - `404` or `400` = Model/endpoint not found (likely deprecated)
   - `503` = Service temporarily unavailable
   - `429` = Rate limited (model exists but throttled)

3. **Look for these error messages in API responses:**
   - "Model not found"
   - "Endpoint not available"
   - "Model deprecated"
   - "Please use [newer model] instead"

## Models Very Likely Still Available (Recent Additions)

These models were mentioned as newly added in the README and are likely current:

- `nano-banana-2` and `nano-banana-2-edit`
- `seedream-5.0` and `seedream-5.0-edit`
- `seedance-2.0` series (including Omni Reference - newly added)
- `kling-o1` series (mentioned as newer)
- `kling-v3.0` series
- `veo3.1` series (including 4K - newly added)
- `wan2.7` series (newly added)
- `pixverse-v6` series (newly added)
- `flux-kontext` series
- `flux-2` series (dev, flex, pro, klein)
- `grok-imagine` series
- `hunyuan-image-3.0`
