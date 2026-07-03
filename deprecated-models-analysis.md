# Deprecated / Updated Models Analysis

This document lists models in the Open-Higgsfield-AI application that appear to be deprecated or have newer versions available. Models are organized by category.

## Summary by Category

### 1. Text-to-Image (T2I) Models

#### Deprecated / Superseded Models:
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `wan2.1-text-to-image` | Wan2.1 Text To Image | `wan2.5-text-to-image`, `wan2.6-text-to-image`, `wan2.7-text-to-image` (NEW) | Older version in Wan 2.x series |
| `wan2.5-text-to-image` | Wan2.5 Text To Image | `wan2.6-text-to-image`, `wan2.7-text-to-image` (NEW) | Superseded by newer Wan versions |
| `wan2.6-text-to-image` | Wan2.6 Text To Image | `wan2.7-text-to-image` (NEW) | Superseded by Wan 2.7 |
| `bytedance-seedream-v3` | Bytedance Seedream v3 | `bytedance-seedream-v4`, `bytedance-seedream-v4.5`, `seedream-5.0` | Older Seedream version |
| `bytedance-seedream-v4` | Bytedance Seedream v4 | `bytedance-seedream-v4.5`, `seedream-5.0` | Superseded by v4.5 and 5.0 |
| `bytedance-seedream-v4.5` | Bytedance Seedream V4.5 | `seedream-5.0` | May be superseded by 5.0 |
| `hunyuan-image-2.1` | Hunyuan Image 2.1 | `hunyuan-image-3.0` (exists) | Superseded by Hunyuan 3.0 |
| `flux-dev` | Flux Dev | `flux-2-dev`, `flux-kontext-dev-t2i` | Original Flux architecture |
| `flux-dev-lora` | Flux Dev Lora | `flux-2-dev`, `flux-kontext-*` | Original Flux with LoRA |
| `flux-schnell` | Flux Schnell | `flux-2-flex`, `flux-2-pro` | Fast variant, superseded |
| `flux-pulid` | Flux Pulid | `flux-kontext-*` | Face ID variant, newer alternatives |
| `flux-redux` | Flux Redux | `flux-kontext-*` | Style variant, newer alternatives |
| `flux-krea-dev` | Flux Krea Dev | `flux-2-*`, `flux-kontext-*` | Krea variant |
| `sdxl-image` | Sdxl Image | Various newer T2I models | Stable Diffusion XL, older architecture |

---

### 2. Text-to-Video (T2V) Models

#### Deprecated / Superseded Models:
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `seedance-v1.5-pro-t2v` | Seedance v1.5 Pro | `seedance-v2.0-t2v`, `seedance-2.0-*` (NEW) | Older Seedance generation |
| `seedance-v1.5-pro-t2v-fast` | Seedance v1.5 Pro Fast | `seedance-v2.0-t2v`, `seedance-2.0-*` (NEW) | Fast variant of v1.5 |
| `seedance-lite-t2v` | Seedance Lite | `seedance-v2.0-t2v`, `seedance-2.0-*` (NEW) | Lite variant, older generation |
| `seedance-pro-t2v` | Seedance Pro | `seedance-v2.0-t2v`, `seedance-2.0-*` (NEW) | Pro variant, older generation |
| `seedance-pro-t2v-fast` | Seedance Pro Fast | `seedance-v2.0-t2v`, `seedance-2.0-*` (NEW) | Pro fast variant |
| `kling-v2.1-master-t2v` | Kling v2.1 Master | `kling-v2.5-*`, `kling-v2.6-*`, `kling-v3.0-*`, `kling-o1-*` (exists) | Kling 2.1 generation |
| `kling-v2.5-turbo-pro-t2v` | Kling v2.5 Turbo Pro | `kling-v2.6-*`, `kling-v3.0-*`, `kling-o1-*` | Kling 2.5 generation |
| `kling-v2.6-pro-t2v` | Kling v2.6 Pro | `kling-v3.0-*`, `kling-o1-*` | Superseded by v3.0 and O1 |
| `kling-v3.0-pro-text-to-video` | Kling v3.0 Pro | `kling-o1-text-to-video` (exists) | May be superseded by O1 series |
| `kling-v3.0-standard-text-to-video` | Kling v3.0 Standard | `kling-o1-*` (exists) | May be superseded by O1 series |
| `veo3-text-to-video` | Veo 3 | `veo3.1-text-to-video`, `veo3.1-fast-text-to-video`, `veo3.1-4k-video` (NEW) | Original Veo 3, superseded by 3.1 |
| `veo3-fast-text-to-video` | Veo 3 Fast | `veo3.1-fast-text-to-video`, `veo3.1-4k-video` (NEW) | Veo 3 fast variant |
| `wan2.1-text-to-video` | Wan 2.1 | `wan2.2-*`, `wan2.5-*`, `wan2.6-*`, `wan2.7-text-to-video` (NEW) | Oldest Wan video model |
| `wan2.2-text-to-video` | Wan 2.2 | `wan2.5-*`, `wan2.6-*`, `wan2.7-text-to-video` (NEW) | Superseded by newer Wan |
| `wan2.2-5b-fast-t2v` | Wan 2.2 Fast | `wan2.5-text-to-video-fast`, `wan2.7-text-to-video` (NEW) | Fast variant |
| `wan2.5-text-to-video` | Wan 2.5 | `wan2.6-text-to-video`, `wan2.7-text-to-video` (NEW) | Superseded by 2.6 and 2.7 |
| `wan2.5-text-to-video-fast` | Wan 2.5 Fast | `wan2.6-text-to-video`, `wan2.7-text-to-video` (NEW) | Fast variant superseded |
| `wan2.6-text-to-video` | Wan 2.6 | `wan2.7-text-to-video` (NEW) | Superseded by Wan 2.7 |
| `pixverse-v4.5-t2v` | Pixverse v4.5 | `pixverse-v5-*`, `pixverse-v5.5-*`, `pixverse-v6-t2v` (NEW) | Older Pixverse generation |
| `pixverse-v5-t2v` | Pixverse v5 | `pixverse-v5.5-*`, `pixverse-v6-t2v` (NEW) | Superseded by v5.5 and v6 |
| `pixverse-v5.5-t2v` | Pixverse v5.5 | `pixverse-v6-t2v` (NEW) | Superseded by V6 |
| `minimax-hailuo-02-standard-t2v` | Hailuo 02 Standard | `minimax-hailuo-2.3-*` | Older Hailuo 02 series |
| `minimax-hailuo-02-pro-t2v` | Hailuo 02 Pro | `minimax-hailuo-2.3-*` | Older Hailuo 02 series |

---

### 3. Image-to-Image (I2I) Models

#### Deprecated / Superseded Models:
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `flux-kontext-dev-i2i` | Flux Kontext Dev I2I | `flux-kontext-pro-i2i`, `wan2.7-image-edit` (NEW) | Dev variant has Pro available |
| `sdxl-image-editing` | Sdxl Image Editing | Various newer I2I models | SDXL based, older architecture |

---

### 4. Image-to-Video (I2V) Models

#### Deprecated / Superseded Models:
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `kling-v2.1-master-i2v` | Kling v2.1 Master I2V | `kling-v2.5-*`, `kling-v2.6-*`, `kling-o1-image-to-video` (exists) | Kling 2.1 generation |
| `kling-v2.1-standard-i2v` | Kling v2.1 Standard I2V | `kling-v2.5-*`, `kling-v2.6-*`, `kling-o1-*` | Kling 2.1 generation |
| `kling-v2.1-pro-i2v` | Kling v2.1 Pro I2V | `kling-v2.5-*`, `kling-v2.6-*`, `kling-o1-*` | Kling 2.1 generation |
| `kling-v2.5-turbo-pro-i2v` | Kling v2.5 Turbo Pro I2V | `kling-v2.6-*`, `kling-o1-*` | Kling 2.5 generation |
| `kling-v2.5-turbo-std-i2v` | Kling v2.5 Turbo Std I2V | `kling-v2.6-*`, `kling-o1-*` | Kling 2.5 generation |
| `kling-v2.6-pro-i2v` | Kling v2.6 Pro I2V | `kling-o1-image-to-video` (exists) | Superseded by O1 series |
| `pixverse-v4.5-i2v` | Pixverse v4.5 I2V | `pixverse-v5-*`, `pixverse-v5.5-*`, `pixverse-v6-i2v` (NEW) | Older Pixverse generation |
| `pixverse-v5-i2v` | Pixverse v5 I2V | `pixverse-v5.5-*`, `pixverse-v6-i2v` (NEW) | Superseded by v5.5 and v6 |
| `pixverse-v5.5-i2v` | Pixverse v5.5 I2V | `pixverse-v6-i2v` (NEW) | Superseded by V6 |
| `veo3-image-to-video` | Veo3 Image To Video | `veo3.1-image-to-video`, `veo3.1-fast-image-to-video` (exist) | Original Veo 3 I2V |
| `veo3-fast-image-to-video` | Veo3 Fast Image To Video | `veo3.1-fast-image-to-video` (exists) | Veo 3 fast variant |
| `minimax-hailuo-02-standard-i2v` | Minimax Hailuo 02 Standard I2V | `minimax-hailuo-2.3-*` | Older Hailuo 02 series |
| `minimax-hailuo-02-pro-i2v` | Minimax Hailuo 02 Pro I2V | `minimax-hailuo-2.3-*` | Older Hailuo 02 series |
| `wan2.1-i2v` | Wan 2.1 I2V | `wan2.7-image-to-video` (NEW) | Superseded by Wan 2.7 |

---

### 5. Video-to-Video (V2V) Models

#### Deprecated / Superseded Models:
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `seedance-v2.0-extend` | Seedance 2.0 Extend | `seedance-v2.0-omni-reference` (NEW), `pixverse-v6-extend` (NEW) | Extend functionality now in newer models |
| `pixverse-v4.5-transition` | Pixverse v4.5 Transition | `pixverse-v5-*`, `pixverse-v6-transition` (NEW) | Older transition model |
| `pixverse-v5-transition` | Pixverse v5 Transition | `pixverse-v5.5-*`, `pixverse-v6-transition` (NEW) | Superseded by V6 |
| `pixverse-v5.5-transition` | Pixverse v5.5 Transition | `pixverse-v6-transition` (NEW) | Superseded by V6 |
| `pixverse-v5-extend` | Pixverse v5 Extend | `pixverse-v6-extend` (NEW) | Superseded by V6 |
| `pixverse-v5.5-extend` | Pixverse v5.5 Extend | `pixverse-v6-extend` (NEW) | Superseded by V6 |
| `veo3.1-extend-video` | Veo 3.1 Extend Video | (NEW model, but may have newer variants) | Check for Veo 3.2+ |

---

### 6. Audio Models

#### TTS (Text-to-Speech)
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `kokoro-base` | Kokoro Base | `kokoro-82m` (exists) | Base variant, 82M is newer |

#### Music
| Model ID | Current Name | Replacement / Newer Version | Reason |
|----------|--------------|----------------------------|--------|
| `stable-audio-open` | Stable Audio Open | `stable-audio-2`, `stable-audio-2-0` | Open variant, older |
| `rinko-text-to-music` | Rinko Text To Music | `rinko-music-v2` | Original Rinko, superseded by v2 |

---

## Recommended Actions

### High Priority Removals (Clear Replacements Available):
1. **Wan T2I**: Remove `wan2.1-text-to-image`, `wan2.5-text-to-image`, `wan2.6-text-to-image` (keep 2.7)
2. **Seedream T2I**: Consider removing v3, v4 (keep v4.5, 5.0)
3. **Seedance T2V**: Remove v1.5 variants, lite, pro (keep v2.0 and Omni Reference)
4. **Kling T2V/I2V**: Remove v2.1, v2.5 variants (keep v2.6, v3.0, O1 series)
5. **Veo T2V/I2V**: Remove veo3 variants (keep all veo3.1)
6. **Pixverse T2V/I2V/V2V**: Remove v4.5, v5, v5.5 (keep v6)
7. **Wan T2V**: Remove wan2.1, 2.2, 2.5, 2.6 (keep 2.7)
8. **Hailuo**: Remove 02 series (keep 2.3 series)

### Medium Priority (Multiple Versions Exist):
1. **Flux T2I**: Consider consolidating (many variants: dev, schnell, pulid, redux, krea, 2-dev, 2-flex, 2-pro, 2-klein, kontext-*)
2. **Kling v3.0 vs O1**: Determine if O1 fully replaces v3.0

### Low Priority (Still Useful):
1. **Hunyuan 2.1**: May keep as lower-cost alternative to 3.0
2. **SDXL**: Keep as classic/stable option
3. **nano-banana**: Keep as specialized face editing tool
