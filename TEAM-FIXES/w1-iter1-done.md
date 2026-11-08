# W1 FIX — iter 1 DONE (S1.1 Post-gen action rail)

**Worker:** W1  
**Status:** FIXED (defect 1 in scope)  
**Date:** 2026-09-20  

---

## Fixed

### 1. Send to Video valitsee oikean I2V-mallin

- **File:** `packages/studio/src/components/VideoStudio.jsx`
- Lisätty `pickDefaultI2V()` + `DEFAULT_SEND_I2V_IDS` (`seedance-2.5-image-to-video`, `wan3.0-image-to-video`, `seedance-v2.0-i2v`).
- Fallback: `VIDEO_FAMILY_PRIORITY` (ei effects) → `hasPrompt` + `imageField`, ei `ai-video-effects`.
- Käytössä:
  - `applyPostGenImage` (Send to Video handoff)
  - `handleReuseEntry` (refs ilman mallia)
  - `processDroppedImage` / `handleImageFileChange` (T2V→I2V mode-switch kun ei siblingiä)

### 2–3. postGenTransfer / Enhance-avain

- **Ei muutettu tässä iterissä** — `postGenTransfer.js` on jo olemassa ja exportattu `index.js`:stä; PostGenActions käyttää jaettua moduulia (W3/W1 koordinaatio tehty aiemmin).

---

## Re-QA checklist

- [x] Send to Video → I2V + oikea oletusmalli + kuva + prompt meta
- [x] Ei `i2vModels[0]` (effects) send-to / mode-switch -poluissa
- [ ] Enhance-handoff (PostGenActions → Enhance) — erillinen W3 QA
- [ ] Reuse / Compare / Lipsync — smoke QA
