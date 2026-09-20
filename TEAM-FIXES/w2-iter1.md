# W2 FIX — iter 1 (S1.2 Marketing presets)

**Worker:** W2  
**Feature:** S1.2  
**QA:** PARTIAL → NEEDS_FIX  
**Iter:** 1/3  
**AC failed:** Valinta → prompt-expand clientissä  

---

## Defects

### 1. Preset-valinta ei expandaa promptia automaattisesti

- **Repro:** Image Studio → valitse **Product shots** / **Graphic ads** / **Marketplace** → Generate (älä paina "Enhance prompt").
- **Expected (TEAM-PROTOCOL § S1.2):** Valinta → client-side template expand (`expandMarketingPrompt`) ennen generointia.
- **Actual:** `handleSelectMarketingPreset` asettaa vain `getMarketingPresetSeedPrompt` (lyhyt defaultBrief) jos textarea tyhjä; täysi expand vaatii erillisen **Enhance prompt** -napin (`handleEnhanceMarketingPrompt`). `handleGenerate` käyttää `prompt.trim()` ilman `expandMarketingPrompt`-kutsua.
- **Files:**
  - `packages/studio/src/components/ImageStudio.jsx` ~1068–1085 (select)
  - `packages/studio/src/components/ImageStudio.jsx` ~1129–1201 (generate)
- **Fix (valitse yksi):**
  - A) Kutsu `expandMarketingPrompt(preset, brief)` heti preset-valinnassa, TAI
  - B) Kutsu `expandMarketingPrompt` `handleGenerate`:ssa kun `activeMarketingPresetId` on asetettu.

### 2. (Minor) Preset-valinta ei expandaa jos käyttäjällä on jo tekstiä ilman markeria

- **Repro:** Kirjoita prompt → valitse preset.
- **Expected:** Preset-expand korvaa tai rikastaa briefin markerilla.
- **Actual:** Uusi preset asetetaan vain jos `!current || current.includes("[oh-mkt:")` — olemassa oleva custom-prompt jää ilman expandia.
- **File:** `ImageStudio.jsx` ~1078–1080.
- **Fix:** Dokumentoi tarkoitukselliseksi TAI expandaa aina preset-vaihdossa.

---

## Pass (ei korjattava)

- 3 templaattia (`marketingPresets.js`) ✅
- Aspect + model resolution (`resolveMarketingPresetApplication`) ✅
- Ei `generateMarketingStudioAd` / proprietary API ImageStudio-polussa ✅
- `node tests/marketingPresets.test.js` ✅

---

## Älä koske

- `models.js`, Explore, PostGenActions, VideoStudio

---

## Re-QA checklist

- [ ] Preset-valinta → expanded prompt textareaan (marker + prefix + tags + suffix)
- [ ] Generate käyttää expanded-promptia ilman extra-klikkausta
- [ ] Idempotentti expand (ei tuplaa markeria)
