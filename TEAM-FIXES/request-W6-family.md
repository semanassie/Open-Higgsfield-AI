# Request W6 — family / modes metadata for P1.5 FamilyModePicker

**From:** W7  
**To:** W6 (models.js owner)  
**Date:** 2026-09-20  
**Feature:** P1.5 Model family/mode -valitsin  
**Blocker level:** Partial — UI shipped with inference fallback; full AC needs catalog meta

---

## Mitä W7 tarvitsee

`packages/studio/src/modelFamilies.js` + `FamilyModePicker.jsx` kuluttavat katalogista:

| Kenttä | Pakollinen? | Käyttö |
|--------|-------------|--------|
| `family` | Kyllä (P1 + suositut) | Ryhmittely yhdeksi dropdown-riviksi |
| `variant` **tai** `modeKey` **tai** `modeLabel` | Kyllä kun perheessä >1 slug | Mode-chipit: Standard / Fast / 1080p / 4K / Pro… |
| `badges` | Valinnainen | Chipit picker-rivillä (W4 renderöi myös) |
| `bestFor` | Valinnainen | Tooltip / hint |

**Älä** lisää raakoja resoluutio-slugia dropdowniin — max ~2–4 entryä / family (ARCH-GATE).

---

## Nykytila (luku 2026-09-20)

| Lista | `family` | `variant` / `modeLabel` / `modes` |
|-------|----------|-----------------------------------|
| `t2vModels` | **0 / 43** | puuttuu |
| `i2vModels` | 64 / 64 | puuttuu (W7 inferoi id:stä) |
| `t2iModels` | 4 / 53 | puuttuu |
| `i2iModels` | 57 / 57 | puuttuu |

Erityisesti **t2v** tarvitsee `family`-kentät (Veo / Seedance / Wan / Kling siblingit eivät ryhmity).

---

## Pyydetyt P1-perheet (minimisetit)

Lisää / täydennä entryt + meta (schema live-vahvistettu):

### `seedance-2.5`
- `seedance-2.5-text-to-video` — `variant`/`modeLabel`: Standard (tai t2v-standard)
- `seedance-2.5-image-to-video` — I2V-lista; mode Standard
- + 1080p / 4K **vain jos erillinen MuAPI-slug** (älä inventoi)

### `wan-3.0`
- t2v + i2v; Prime vs Standard modeina jos slugit erillisiä

### `minimax-h3`
- t2v + i2v; Standard / Max / Turbo jos slugit

### `flux-3`
- t2i (+ i2i kun schema OK); t2v jos saatavilla  
- ImageStudio family-picker käyttää samaa `family`

---

## Myös: olemassa olevien t2v-perheiden `family`

Ainakin nämä siblingit pitäisi jakaa saman `family`-arvon (esimerkkejä nykykatalogista):

| family | esimerkki-id:t |
|--------|----------------|
| `veo` / `veo3.1` | `veo3-text-to-video`, `veo3-fast-text-to-video`, `veo3.1-*-text-to-video` (i2v:llä jo `veo` / `veo3.1`) |
| `seedance-v2.0` | `seedance-v2.0-t2v` (+ extend erillisenä tai secondary) |
| `seedance-v1.5-pro` | `seedance-v1.5-pro-t2v`, `…-fast` |
| Kling / Wan t2v | peilaa i2v-family-nimet (`kling-v2.1`, `wan2.5`, …) |

Mode-esimerkki:

```js
{
  id: "veo3-fast-text-to-video",
  name: "Veo 3",           // perheen UI-nimi (sama siblingeille)
  endpoint: "veo3-fast-text-to-video",
  family: "veo",
  modeLabel: "Fast",       // tai variant: "fast"
  badges: ["Fast"],
  inputs: { /* schema */ }
}
```

---

## Done-kriteeri W6:lle (tämän requestin osalta)

- [ ] P1-perheet (`seedance-2.5`, `wan-3.0`, `minimax-h3`, `flux-3`) katalogissa `family` + mode-meta
- [ ] `t2vModels` siblingeillä `family` (ei enää 0 %)
- [ ] Mode-chipit resolvoituvat ilman W7 id-inferenceä P1-perheille
- [ ] Ei spicy / watermark-remover / Explore-dump

W7 fallback (inference id:stä) jää turvaverkoksi vanhoille malleille ilman metaa.
