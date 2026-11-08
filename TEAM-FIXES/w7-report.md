# W7 Report — P1.5 Family/mode valitsin

**Worker:** W7  
**Feature:** P1.5 Family/mode UI  
**Status:** QA_REVIEW  
**Date:** 2026-09-20  

---

## Toteutettu

### 1. `packages/studio/src/modelFamilies.js`

- `getFamilies(models, { preferredOrder })` — ryhmittää katalogin `family`-kentän mukaan; mallit ilman `family` → yksittäinen rivi (`singleton`).
- `resolveVariant(family, { io, quality, resolution, variant, modeKey, modeLabel })` — palauttaa oikean malli-objektin mode-valinnan perusteella.
- Apufunktiot: `getModeLabel`, `getModeKey`, `getFamilyDisplayName`, `findFamilyForModel`, `filterFamiliesBySearch`.
- Prioriteettilistat: `VIDEO_FAMILY_PRIORITY`, `IMAGE_FAMILY_PRIORITY` (P1-perheet ensin).

### 2. `packages/studio/src/components/FamilyModePicker.jsx` (uusi)

- Perheet listana; laajennus näyttää **ModeChips** (Standard/Prime/Max/720p/1080p/4K jne. metadatan tai id/name-inferenssin mukaan).
- Haku matchaa **family name** tai **family id** (+ mallin nimi/id endpoint-hakuun).
- `ModelBadges` uudelleenkäytössä (W4/W6 meta) — ei duplikoitu badge-logiikkaa.
- Yksimoodiset perheet: yksi klikkaus valitsee suoraan.
- `extraSections` — VideoStudion **Video Tools** (v2v) erillisenä osiona.

### 3. Wire VideoStudio.jsx

- `ModelDropdown` → `VideoModelPicker` (FamilyModePicker wrapper).
- T2V / I2V listat imageMode:n mukaan; P1-prioriteetti `VIDEO_FAMILY_PRIORITY`.
- Video Tools -osio säilytetty (v2v + motion-control), `onSelect(m, true)` v2v-polulle.

### 4. Wire ImageStudio.jsx

- Inline `ModelDropdown` poistettu → `FamilyModePicker`.
- T2I / I2I listat imageMode:n mukaan; `IMAGE_FAMILY_PRIORITY` (flux-3 ensin kun W6 lisää).

---

## Acceptance criteria (self-check)

| AC | Status |
|----|--------|
| `modelFamilies.js`: groupBy + resolveVariant | ✅ |
| FamilyPicker + ModeChips; VideoStudio + ImageStudio | ✅ |
| Dropdownissa perheet, ei raaka-slug-dump P1-alueella | ✅ (kun W6 lisää `family`) |
| Search: family name tai id | ✅ |
| Fallback: ilman `family` → yksittäinen rivi | ✅ |
| Ei kirjoitettu models.js | ✅ |
| ModelBadges uudelleenkäytössä | ✅ |
| SeedControls omistus W4 — ei duplikoitu | ✅ |

---

## W6-riippuvuus / nykytila

`models.js` ei vielä sisällä `family` / `variant` / `badges` -metaa (W6 TODO).  
**Infra toimii nyt:** jokainen malli näkyy omana rivinään; kun W6 lisää esim. `flux-3`-perheen, useat variantit ryhmäytyvät automaattisesti mode-chipeiksi.

---

## Tiedostot

| Tiedosto | Toimenpide |
|----------|------------|
| `packages/studio/src/modelFamilies.js` | Olemassa + `io`/`variant` resolveVariantiin |
| `packages/studio/src/components/FamilyModePicker.jsx` | **Uusi** |
| `packages/studio/src/components/VideoStudio.jsx` | Wire FamilyModePicker |
| `packages/studio/src/components/ImageStudio.jsx` | Wire FamilyModePicker |

**Ei koskettu:** `models.js`, Explore, seed-logiikka (SeedControls).

---

## Verifiointi (manuaalinen)

1. Käynnistä studio (Next `/studio` tai dev-server).
2. **Video Studio** → Model-painike:
   - Lista näyttää perheet/rivit (tällä hetkellä ~yksi rivi per malli).
   - Haku: kirjoita esim. `kling` → suodattuu.
   - Laajenna monimoodinen perhe (kun W6 data) → mode-chipit vaihtavat `selectedModel`.
   - **Video Tools** -osio alareunassa (watermark / motion control).
3. **Image Studio** → Model-painike:
   - Sama family-UX; flux/perheet ryhmäytyvät kun W6 lisää `family: "flux-3"`.
4. Generointi toimii edelleen valitulla mallilla (ei regressiota).

### Node-smoke (valinnainen)

```bash
node -e "import('./packages/studio/src/modelFamilies.js').then(m => {
  const models = [
    { id: 'flux-3-pro', name: 'Flux 3 Pro', family: 'flux-3', variant: 'pro' },
    { id: 'flux-3-max', name: 'Flux 3 Max', family: 'flux-3', variant: 'max' },
  ];
  console.log(m.getFamilies(models));
  console.log(m.resolveVariant('flux-3', { variant: 'max' }, models)?.id);
})"
```

Odotus: yksi perhe `flux-3`, kaksi modea; resolve → `flux-3-max`.

---

## Tunnetut rajoitteet

- T2V/I2V-vaihto tapahtuu edelleen kuvan uploadin / imageMode-staten kautta — ei erillistä IO-chipiä pickerissä (lista on jo suodatettu t2v vs i2v).
- Badge-chipit näkyvät vasta kun W6 lisää `badges`-metan.

---

## Raportti Leadille

```
WORKER: W7
FEATURE: P1.5
STATUS: QA_REVIEW
FILES: modelFamilies.js, FamilyModePicker.jsx, VideoStudio.jsx, ImageStudio.jsx
AC: pass (self-check); W6 family-meta pending for full grouping demo
BLOCKERS: none
```
