# W2 FIX — iter 1 DONE (S1.2 Marketing presets)

**Worker:** W2  
**Status:** FIXED  
**Date:** 2026-09-20  

---

## Fixed

### 1. Preset-valinta expandaa promptin automaattisesti

- **File:** `packages/studio/src/components/ImageStudio.jsx`
- `handleSelectMarketingPreset`: kutsuu `expandMarketingPrompt(preset, brief)` heti valinnassa (brief = nykyinen teksti tai seed prompt).
- `handleGenerate`: `finalPrompt = marketingPreset ? expandMarketingPrompt(marketingPreset, prompt) : prompt.trim()` — käytetään `genParams.prompt`, history-entryssä ja `onGenerationComplete`-callbackissa.
- T2I-validointi käyttää `finalPrompt`-ia (ei pelkkää `prompt.trim()`).

### 2. Preset-vaihto olemassa olevan tekstin kanssa

- Jos textarea ei tyhjä eikä sisällä `[oh-mkt:`-markeria, brief = nykyinen teksti → expand rikastaa markerilla (ei pelkkää seediä).

---

## Re-QA checklist

- [x] Preset-valinta → expanded prompt textareaan
- [x] Generate käyttää expanded-promptia ilman extra-klikkausta
- [x] `expandMarketingPrompt` idempotentti (marker-logiikka `marketingPresets.js`:ssä)
- [x] `requiresImage`-tarkistukset ennallaan
