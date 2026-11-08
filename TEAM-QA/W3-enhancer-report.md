# QA Report — W3 Enhancer UX (S1.3)

**Verdict:** PASS  
**Iter:** 1/3 (iter1 defects rechecked)  
**Date:** 2026-09-20  
**Auditor:** QA  
**TechLead-gate:** **APPROVED** (board + `techlead-w3-upscale-factor.md`)

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Before/after | PASS | `BeforeAfterSlider` in `EnhanceStudio.jsx` when `sourceUrl` + `resultUrl` |
| 2 | 1× / 2× / 4× → `topaz-image-upscale` via `generateI2I` | PASS | `SCALE_OPTIONS=[1,2,4]`; `run(TOPAZ_MODEL_ID, true)` sets `upscale_factor`; `muapi.js` passes field to payload |
| 3 | Presetit erottuvat (Flat 2× / Strong 4× / Portrait 1×) | PASS | `PRESETS`: Flat Sharp `upscaleFactor:2`, Strong `4`, Portrait `1`; `selectPreset` updates factor |
| 4 | Fallback `ai-image-upscaler` | PASS | catch on topaz → `FALLBACK_MODEL_ID` without factor; UI note when Topaz missing |
| 5 | `postGenTransfer` + StandaloneShell enhance-tab | PASS | EnhanceStudio handoff listeners; shell tab `{ id: 'enhance' }` + `<EnhanceStudio />` |
| 6 | Ei `models.js`-muutoksia W3:lta | PASS | W3 reads `getI2IModelById` only; catalog diff = W6 |
| 7 | Ei rikko generate-flowta | PASS | Separate tab; Image/Video `handleGenerate` paths untouched by Enhance; `generateI2I` additive `upscale_factor` only |

---

## Iter1 defect recheck (`TEAM-FIXES/w3-iter1.md`)

| Defect | Status |
|--------|--------|
| Missing `postGenTransfer.js` | **FIXED** |
| Flat Sharp ≡ Portrait (both 2×) | **FIXED** — Portrait = 1× |
| Soft assets save | **FIXED** — `saveGeneration({ studio: "enhance", … })` |

---

## Checklist

- [x] `EnhanceStudio.jsx` + `index.js` export
- [x] StandaloneShell `enhance` tab + nav events
- [x] Topaz primary + ai-image-upscaler fallback
- [x] Presets map to distinct `upscale_factor`
- [x] Before/after slider
- [x] No Explore / no W3 catalog write
- [x] Generate flow intact (code review)

## Notes / WARN

- Live Topaz / fallback API smoke not run (no key in QA env).
- Topaz schema exposes mainly `upscale_factor` (no Strength/Resemblance) — Sprint 1 OK per TechLead.

## Verdict rationale

S1.3 AC + iter1 fixes satisfied. Remains **DONE** / TechLead **APPROVED**.
