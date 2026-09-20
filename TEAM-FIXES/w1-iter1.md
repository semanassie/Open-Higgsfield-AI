# W1 FIX — iter 1 (S1.1 Post-gen action rail)

**Worker:** W1  
**Feature:** S1.1  
**QA:** FAIL → NEEDS_FIX  
**Iter:** 1/3  
**AC failed:** Send to Video I2V prefill; shared handoff module  

---

## Defects

### 1. Send to Video valitsee väärän I2V-mallin (`ai-video-effects`)

- **Repro:** Image Studio → generoi kuva → history-kortti → **Send to Video** → Video Studio avautuu.
- **Expected:** I2V-tila + kuva prefill + järkevä I2V-malli (esim. P1 `seedance-2.5-image-to-video` tai family-default).
- **Actual:** `VideoStudio.jsx` `applyPostGenImage` käyttää aina `i2vModels[0]`, joka on `ai-video-effects` / `generate_wan_ai_effects` (efektimalli, ei yleinen I2V).
- **File:** `packages/studio/src/components/VideoStudio.jsx` ~428–451 (`const target = i2vModels[0]`).
- **Fix:** Valitse ensimmäinen oikea I2V (esim. `VIDEO_FAMILY_PRIORITY` + `resolveVariant`, tai eksplisiittinen default-id). Älä käytä `effects`-perhettä Send-to-polussa.

### 2. `navigateWithPostGen` duplikoitu; paketti-import rikki

- **Repro:** `import { POSTGEN_NAV_EVENT, readPostGenPayload } from 'studio'` (StandaloneShell / index).
- **Expected:** Yksi handoff-moduuli (`postGenTransfer.js`) exportattuna `index.js`:stä; PostGenActions käyttää samaa.
- **Actual:** `packages/studio/src/lib/postGenTransfer.js` **puuttuu**; `index.js` rivi 5 importtaa sen → build/runtime-virhe. `PostGenActions.jsx` määrittelee oman `navigateWithPostGen` (rivit 17–49).
- **Files:** `packages/studio/src/index.js:5`, `packages/studio/src/components/PostGenActions.jsx:17–49`.
- **Fix:** Koordinoi W3:n kanssa: luo `postGenTransfer.js` TAI siirrä PostGenActions-logiikka sinne ja exporttaa yhdestä paikasta. Poista duplikaatti.

### 3. Enhance sessionStorage-avain ristiriidassa

- **Expected:** Yksi avain Enhance-prefillille (W3 `POSTGEN_STORAGE_KEY` / `readPostGenPayload`).
- **Actual:** PostGenActions kirjoittaa `muapi_enhance_image`; EnhanceStudio odottaa `readPostGenPayload` + legacy `muapi:send-to-enhance` (toimii osittain `sendAssetTo`-polun kautta).
- **File:** `packages/studio/src/components/PostGenActions.jsx:8,27–32`.
- **Fix:** Käytä jaettua `postGenTransfer.js` / `sendAssetTo` — poista erillinen `ENHANCE_PAYLOAD_KEY` tai aliasoi W3:n avaimiin.

---

## Älä koske

- `packages/studio/src/models.js` (W6)
- Explore-malliselain
- Marketing presetit (W2)

---

## Re-QA checklist

- [ ] Send to Video → I2V + oikea oletusmalli + kuva + prompt meta
- [ ] `studio`-paketin importit (`index.js`) resolvautuvat ilman puuttuvaa moduulia
- [ ] Enhance-handoff toimii `PostGenActions` → Enhance-tab (sendAssetTo + yhteinen avain)
- [ ] Reuse / Compare / Lipsync edelleen toimivat
