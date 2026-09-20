# W3 FIX — iter 1 (S1.3 Enhancer UX)

**Worker:** W3  
**Feature:** S1.3  
**QA:** PARTIAL → NEEDS_FIX  
**Iter:** 1/3  
**AC failed:** PostGen handoff-moduuli; preset-erottelu (pehmeä)  

---

## Defects

### 1. `postGenTransfer.js` puuttuu — paketti-import rikki

- **Repro:** `packages/studio/src/index.js` exporttaa `readPostGenPayload`, `POSTGEN_STORAGE_KEY`, `navigateWithPostGen` tiedostosta `../lib/postGenTransfer.js`.
- **Expected:** Moduuli olemassa; EnhanceStudio + StandaloneShell importit toimivat.
- **Actual:** Tiedostoa **ei ole** repossa. `EnhanceStudio.jsx` rivi 7–9 importtaa sen → build fail.
- **Files:** `packages/studio/src/lib/postGenTransfer.js` (PUUTTUU), `index.js:5`, `EnhanceStudio.jsx:7–9,216`.
- **Fix:** Toteuta `postGenTransfer.js`:
  - `POSTGEN_NAV_EVENT`, `POSTGEN_STORAGE_KEY`
  - `readPostGenPayload({ matchTarget })`, `navigateWithPostGen(tabId, entry)`
  - Yhdenmukaista W1 `PostGenActions` + W8 `sendAssetTo` kanssa (W1-iter1 #2).

### 2. Presetit Flat Sharp vs Portrait eivät erotu parametreista

- **Repro:** Valitse Flat Sharp → Enhance; vaihda Portrait → Enhance.
- **Expected (AC):** 3 presetia vaihtavat parametreja (ei pelkkä label).
- **Actual:** Molemmat `upscaleFactor: 2` — ainoa ero UI-label. Strong = 4×.
- **File:** `EnhanceStudio.jsx` ~20–38.
- **Fix:** Dokumentoi Sprint-1 schema-rajoite boardille **tai** mapaa eri `upscale_factor`/tulevat schema-kentät kun saatavilla. Vähintään Strong vs 2×-presetit erottuvat (OK); Flat vs Portrait tarvitsee eron tai yhdistämisen.

### 3. (Soft — TechLead `techlead-w3-assets-soft.md`) Enhance-historia vain localStorage

- **Expected (arch gate soft):** Enhance-tulokset myös `saveGeneration` → IndexedDB.
- **Actual:** `HISTORY_KEY = "muapi_enhance_history"` localStorage.
- **File:** `EnhanceStudio.jsx` ~18,347–354.
- **Fix:** Lisää `saveGeneration({ studio: "enhance", ... })` onnistuneen enhance-jälkeen.

---

## Pass (ei blocker jos #1 korjattu)

- Before/after slider ✅
- 1×/2×/4× → `generateI2I` + `upscale_factor` (`muapi.js:102–105`) ✅
- Topaz → `ai-image-upscaler` fallback ✅
- StandaloneShell `enhance`-tab + event-kuuntelijat ✅
- Ei Explore / ei models.js-kirjoitusta ✅

---

## Smoke (QA ei ajanut — tarvitsee API-avain)

- [ ] Live `topaz-image-upscale` proxy-polulla
- [ ] Fallback-polku simuloituna

---

## Älä koske

- `models.js` (W6), Explore, FamilyModePicker

---

## Re-QA checklist

- [ ] `postGenTransfer.js` olemassa + index exportit
- [ ] PostGenActions → Enhance-tab prefill (readPostGenPayload + sendAssetTo)
- [ ] Before/after + scale + preset + fallback edelleen OK
