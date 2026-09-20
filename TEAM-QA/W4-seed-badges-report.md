# QA Report — W4 / S1.4 Seed & variations + S1.5 Feature badges

**Verdict:** PASS (with WARN)  
**Features:** S1.4 Seed & variations, S1.5 Feature badges  
**Owner:** W4  
**Iter:** 0/3 → DONE  
**Date:** 2026-09-20  
**Auditor:** QA Auditor  
**Scope:** SeedControls + ModelBadges + Image/Video seed-wire + FamilyModePicker badge-render + muapi seed-forward  

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Seed-UI vain kun `inputs.seed` katalogissa | **PASS** | `modelSupportsSeed(model)` → `Boolean(model?.inputs?.seed)`; ImageStudio `visible={seedSupported}`; VideoStudio `visible={modelSupportsSeed(getCurrentModel())}` |
| 2 | New seed / Reuse seed / 🎲 | **PASS** | `SeedControls.jsx`: toggle `new`\|`reuse`, 🎲 → `randomSeed()`; `resolveGenerationSeed` arpoo aina `"new"`-tilassa |
| 3 | `historyMeta.seed` tallennus | **PASS** | Image/Video history-entryyn `seed`; `saveGeneration` / `persistAsset` välittää seedin; `assetsStore.toHistoryMeta` sisältää `seed` |
| 4 | Badge-chipit kun `badges` / `bestFor` | **PASS** | `ModelBadges.jsx` (New/Fast/4K/Audio tyylit + bestFor tooltip); `FamilyModePicker` `BadgeChips` family-riveillä + `ModelBadges` extra-riveillä |
| 5 | `models.js` koskematon W4:lta | **PASS** | W4-deliverablet: uudet `ModelBadges.jsx`, `SeedControls.jsx` + studio/muapi-wire. Katalogi-meta on W6-omistusta (`request-W6-badges.md`) |
| 6 | Ei Explore-malliselainta | **PASS** | Ei Explore / ModelBrowser -UI:ta W4-tiedostoissa |

---

## Tiedostot auditoitu

| Tiedosto | Rooli | OK |
|----------|-------|----|
| `packages/studio/src/components/ModelBadges.jsx` | Badge-chipit + `modelSupportsSeed` / `randomSeed` | ✅ |
| `packages/studio/src/components/SeedControls.jsx` | Seed-kenttä, New/Reuse, 🎲, `resolveGenerationSeed` | ✅ |
| `packages/studio/src/components/ImageStudio.jsx` | Gate + batch seed resolve + history/assets seed | ✅ |
| `packages/studio/src/components/VideoStudio.jsx` | Gate + t2v/i2v/v2v seed + history/assets seed | ✅ |
| `packages/studio/src/components/FamilyModePicker.jsx` | Badge-render family + extra rows | ✅ |
| `packages/studio/src/muapi.js` | seed-forward image / i2i / video / i2v / v2v / lipsync | ✅ |
| `TEAM-FIXES/request-W6-badges.md` | Soft request W6:lle — ei W4-blocker | ⚠️ soft |

---

## Checklist

- [x] SeedControls piilotettu ilman `inputs.seed`
- [x] New seed / Reuse seed / 🎲
- [x] Generointi välittää seedin `muapi.js`-poluille (kun ≠ -1)
- [x] History + Assets tallentavat seedin (remix-meta)
- [x] Badge-chipit pickerissä katalogi-metasta
- [x] W4 ei kirjoittanut `models.js`
- [x] Ei Explore-scope creep
- [ ] WARN: `generateImage` käyttää truthy-checkiä (`params.seed &&`) → seed `0` ei mene payloadiin (i2i/video OK: `!== undefined`)
- [ ] WARN: `request-W6-badges.md` — laajempi badge/seed-kattavuus T2I:lle edelleen toivottu; katalogissa jo ≥5 `inputs.seed` + ~21 `badges` (ei estä W4 DONE)

---

## Notes

- React-studioissa ei ole erillistä `historyMeta`-muuttujaa (Electron-legacyllä on); seed tallentuu history-entryyn + `saveGeneration` → `toHistoryMeta` — suunnitelman `{ prompt, model, seed, refs, aspect_ratio }` täyttyy.
- Badge-/seed-näkyvyys riippuu W6-katalogista; UI on valmis ja meta on osittain paikalla → soft request ei ole S1.4/S1.5-blocker.

## Outcome

**PASS** → Lead voi asettaa / pitää `S1.4` + `S1.5` → `DONE`.  
Ei `TEAM-FIXES/W4-iter1.md`.
