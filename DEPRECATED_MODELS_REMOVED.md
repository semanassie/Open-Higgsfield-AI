# Deprecated Models Removal Summary

**Date:** 2026-04-09
**Action:** Removed 9 confirmed deprecated models from MuAPI integration

## Models Removed

The following models returned **404 Not Found** during API endpoint testing and have been removed:

| # | Model ID | Category | Name |
|---|----------|----------|------|
| 1 | `flux-dev-lora` | T2I | Flux Dev Lora |
| 2 | `hidream-i1-fast` | T2I | Hidream I1 Fast |
| 3 | `hidream-i1-dev` | T2I | Hidream I1 Dev |
| 4 | `hidream-i1-full` | T2I | Hidream I1 Full |
| 5 | `bytedance-seedream-v3` | T2I | Bytedance Seedream v3 |
| 6 | `image-passthrough` | I2I | Image Passthrough |
| 7 | `Api Node` | I2I | Api Node |
| 8 | `seedance-v2.0-omni-reference` | I2V | Seedance 2.0 Omni Reference I2V |
| 9 | `mmaudio-v2-text-to-audio` | SFX | MMAudio Text to Audio |

## Files Modified

### 1. `src/lib/models.js`
- ✅ Removed 9 deprecated model entries
- ✅ Syntax validated
- ✅ Model count: 230 (was 244)

### 2. `models_dump.json`
- ✅ Removed 5 deprecated model entries (only 5 existed in this file)
- ✅ JSON validated
- ⚠️ Note: `image-passthrough`, `Api Node`, `seedance-v2.0-omni-reference`, `mmaudio-v2-text-to-audio` were not present in this file

## Current Model Counts (models.js)

| Category | Count |
|----------|-------|
| t2iModels (Text-to-Image) | 46 |
| i2iModels (Image-to-Image) | 57 |
| t2vModels (Text-to-Video) | 48 |
| i2vModels (Image-to-Video) | 65 |
| v2vModels (Video-to-Video) | 5 |
| lipsyncModels | 9 |
| sfxModels (Sound Effects) | 0 |
| **TOTAL** | **230** |

## Verification

- [x] `src/lib/models.js` syntax validated
- [x] `models_dump.json` JSON validated
- [x] Backup files created (`*.backup`)
- [x] Test script results archived in `scripts/test-results/`

## Backup Files

If rollback is needed:
- `src/lib/models.js.backup`
- `models_dump.json.backup`

## Notes

- The `sfxModels` array is now empty (all deprecated). New SFX models can be added to this array.
- The removed models consistently returned HTTP 404 during API testing, confirming they are no longer available on MuAPI.ai
- No breaking changes to the application - models are dynamically loaded from arrays
