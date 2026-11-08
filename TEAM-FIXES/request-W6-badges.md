# Request W6 — badges / bestFor / inputs.seed

**From:** W4 (Seed & variations + badge UI)  
**To:** W6 (`packages/studio/src/models.js` only)  
**Date:** 2026-09-20  
**Features:** S1.4 Seed & variations, S1.5 Feature badges  
**Priority:** P0 (katalogi-täydennys — W4 UI DONE; seed/badge-coverage vielä osittainen)  
**Queue:** `TEAM-FIXES/QUEUE-W6.md`

---

## Priority (tee tässä järjestyksessä)

| Prio | Tehtävä | Miksi |
|------|---------|--------|
| **P0** | `badges` + `bestFor` lippulaivoille (alla) | Badge-chipit tyhjiä ilman katalogi-metaa |
| **P0** | `inputs.seed` malleille joiden MuAPI-schema tukee seediä | SeedControls näkyy vain jos `model.inputs.seed` |
| **P1** | Laajenna tokenit: ei vain `New` — myös `Fast` / `4K` / `Audio` missä totta | S1.5 AC: värilliset chipit |
| **P2** | Family-siblingeille samat badges (mergeBadges) | Family-rivi näyttää unionin |

---

## Context

W4 UI valmis; katalogi-meta puuttuu / osittainen:

- `ModelBadges` + `FamilyModePicker` lukevat `badges` / `bestFor`
- `SeedControls` gated: `model.inputs.seed`
- Generate → `seed` jo `muapi.js`-pathissa

**Status 2026-09-20:** Osittain tehty — täydennä loput, älä dumpata koko katalogia.

### Already in catalog (älä uudelleenkirjoita)

- **badges + bestFor:** Seedance 2.5 (t2v/i2v), Wan 3.0 (+ Prime), MiniMax H3 (+ Max), Flux 3 (t2i/t2v/i2i/i2v), Seedance v2.0 t2v, Kling v3.0 Pro t2v
- **inputs.seed:** Flux 3 t2i/i2i, Seedream v4, SDXL, LTX-2 Pro lipsync

### Remaining (this request)

1. **P0 seed:** lisää `inputs.seed` muihin schema-tuettuihin (esim. Seedance / Wan / MiniMax / Kling t2v jos live-schema tukee)
2. **P1 tokens:** `Fast` / `4K` / `Audio` lippulaivoille (nyt usein vain `New`)
3. **P2 siblings:** sama badge-setti family-siblingeille (`mergeBadges`)

---

## P0 — badges + bestFor (flagship / P1)

Allowed tokens: `New` | `Fast` | `4K` | `Audio`

| Model / family | badges | bestFor |
|----------------|--------|---------|
| Seedance 2.5 (t2v/i2v) | `New`, `Audio` | `final` |
| Seedance 2.0 / pro-fast | `Fast` (fast) | `speed` tai `draft` |
| Wan 3.0 | `New` | `final` |
| MiniMax H3 | `New` | `final` |
| Flux 3 | `New` | `final` |
| Kling / Veo 4K (jos katalogissa) | `4K` | `quality` |
| Native audio -mallit | + `Audio` | — |

Sama badge-setti sibling-varianteille → `modelFamilies.mergeBadges` näyttää family-rivillä.

## P0 — `inputs.seed` (schema-first)

Vahvista live: `GET /api/v1/models/{name}`. Jos seed schemassa:

```js
seed: {
  name: "seed",
  title: "Seed",
  type: "int",
  description: "Random seed; -1 = random",
  default: -1,
  minValue: -1,
  maxValue: 999999999,
}
```

**Kohteet ensin:** Flux / SDXL / Seedream / P1-perheet joilla seed dokumentoitu.  
Lipsync LTX: jos `hasSeed: true` → lisää myös `inputs.seed` (W4 gate).

---

## Out of scope

- Ei ImageStudio / VideoStudio / FamilyModePicker -muutoksia (W4/W7)
- Ei Explore / spicy / watermark-remover

---

## Done when

- [x] **P0:** ≥4–8 flagship-entryllä non-empty `badges` *(perustaso OK — Remaining yllä)*
- [x] **P0:** ≥ muutama T2I `inputs.seed` *(Flux/Seedream/SDXL/LTX OK)*
- [ ] **P0:** lisää `inputs.seed` schema-tuetuille T2V/P1-malleille (Remaining #1)
- [ ] **P1:** `Fast` / `4K` / `Audio` mukana missä accurate (ei vain `New`)
- [ ] **P2:** sibling-badges family-riveille
- [ ] Spot-check: seed-paneeli + badge-värit pickerissä lippulaivoilla
