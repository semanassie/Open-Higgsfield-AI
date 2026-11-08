# QA Report — W1 Post-gen action rail (S1.1)

**Verdict:** PASS  
**Iter:** 1/3  
**Date:** 2026-09-20  
**Auditor:** QA  
**TechLead-gate:** — (pending; no arch REJECT observed)

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Reuse / Compare / Send to Video / Enhance / Lipsync history-korteissa | PASS | Image history: full rail (`PostGenActions`). Video history: Reuse + Compare + Lipsync (`showSendToVideo={false}`, `showEnhance={false}` — intentional). |
| 2 | Send to Video → oikea I2V (ei `ai-video-effects`) + kuva + prompt | PASS | `pickDefaultI2V()` → `seedance-2.5-image-to-video` (skip `family==="effects"`). `applyPostGenImage` sets I2V mode, image URLs, prompt from `meta`. Catalog: `i2vModels[0]` is still `ai-video-effects` — **not** used on Send-to path. |
| 3 | Enhance → enhance-tab handoff | PASS | `navigateWithPostGen("enhance", …)` → `sendAssetTo` + `POSTGEN_STORAGE_KEY` + `ENHANCE_IMAGE_KEY` + events; EnhanceStudio `readPostGenPayload` / `SEND_TO_EVENT` / legacy. Shell listens `POSTGEN_NAV_EVENT`. |
| 4 | Compare → CompareView 2+ | PASS | `comparePartner` requires `history.length >= 2`; opens `CompareView` overlay. |
| 5 | Ei Explore-UI | PASS | No Explore browser in PostGen / transfer / wire. |
| 6 | `models.js` koskematon W1:ltä | PASS | W1 files do not write catalog; `models.js` dirty diff is W6 family/badge work. |

---

## Iter1 defect recheck (`TEAM-FIXES/w1-iter1.md`)

| Defect | Status |
|--------|--------|
| Send to Video → `ai-video-effects` via `i2vModels[0]` | **FIXED** — `pickDefaultI2V` + explicit ID list |
| Missing `postGenTransfer.js` / broken package import | **FIXED** — module exists; `index.js` exports |
| Enhance sessionStorage key mismatch | **FIXED** — shared keys + dual write for legacy |

---

## Checklist

- [x] `PostGenActions.jsx` uses shared `postGenTransfer.js`
- [x] `packages/studio/src/index.js` exports PostGen + transfer helpers
- [x] ImageStudio history wire
- [x] VideoStudio history wire + I2V consume
- [x] LipSyncStudio consume (`SEND_TO_EVENT` / peek+consume) — rail on LipSync history cards not required for S1.1
- [x] CompareView integration
- [x] No Explore / no W1 `models.js` write

## Notes / WARN

- Live UI smoke not run (no interactive browser session in this audit).
- LipSyncStudio history cards do not mount `PostGenActions` (handoff **target** only) — OK vs ownership matrix.

## Verdict rationale

All S1.1 AC met after iter1 fixes. Recommend Lead → **DONE**; TechLead may still stamp APPROVED.
