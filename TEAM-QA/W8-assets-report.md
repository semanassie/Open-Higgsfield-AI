# QA Report — W8 / S3.0 Assets IndexedDB pohja

**Verdict:** PASS (with WARN)  
**Feature:** S3.0 Assets IndexedDB + remix/compare  
**Owner:** W8  
**Iter:** 1/3 → DONE  
**Date:** 2026-09-20  
**Auditor:** QA Auditor  

---

## Acceptance checklist (P2.5 / S3.0 + board)

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | IndexedDB `assetsStore`: add / list / filter by type | **PASS** | `saveAsset`/`saveGeneration`; `listAssets({ type })` via `type`-index |
| 2 | Tallennus gen jälkeen + reload säilyttää | **PASS** | `ImageStudio` → `saveGeneration`; `VideoStudio` → `persistAsset` → `saveGeneration`; DB `hf_assets` / store `assets` |
| 3 | Remix-meta `{ prompt, model, seed, refs, aspect_ratio }` | **PASS** | `toHistoryMeta` + `useRemix.buildRemixState` / `remix(asset)` |
| 4 | Compare 2 assetia | **PASS** | `useCompare({ max: 2 })` + `CompareView` (AssetsPanel + PostGenActions) |
| 5 | Ei Explore-galleriaa / malliselainta | **PASS** | Ei Explore/ModelBrowser-UI:ta W8-diffissä |
| 6 | Ei `models.js`-muutoksia W8:lta | **PASS** | Smoke assert + ei `hf_assets`/`assetsStore` models.js:ssä |

### Lisä (arkkitehtuuri / suunnitelma 5.7 — ei estä DONE)

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| A | Migraatio legacy historystä | PASS | `muapi_history`, `hg_image_studio_persistent`, `hg_video_studio_persistent` |
| B | Send to … API | PASS | `sendAssetTo` + `SEND_TO_EVENT`; shell navigoi; Video/Enhance kuluttavat |
| C | Quota handling | PASS | trim oldest + retry |
| D | AssetsPanel mountattu shelliin | **WARN** | Komponentti + export OK; ei mounttia `StandaloneShell` / Image / Video UI:ssa |
| E | ImageStudio Send-to consume | **WARN** | `consumeSendToPayload` importattu, ei käytetty — “Send to Image” AssetsPanelista ei sovella payloadia |

---

## Tiedostot auditoitu

| Tiedosto | Rooli | OK |
|----------|-------|----|
| `packages/studio/src/lib/assetsStore.js` | IndexedDB SoT, normalize, migrate, send-to | ✅ |
| `packages/studio/src/hooks/useAssets.js` | list + filter + refresh/remove | ✅ |
| `packages/studio/src/hooks/useRemix.js` | remix meta apply | ✅ |
| `packages/studio/src/hooks/useCompare.js` | max 2 selection / pair | ✅ |
| `packages/studio/src/components/AssetsPanel.jsx` | grid, type filter, remix/compare/send | ✅ (ei mount) |
| `packages/studio/src/components/CompareView.jsx` | side-by-side overlay | ✅ |
| `packages/studio/src/components/ImageStudio.jsx` | `saveGeneration` after gen | ✅ |
| `packages/studio/src/components/VideoStudio.jsx` | `persistAsset` after gen (t2v/i2v/v2v) | ✅ |
| `packages/studio/src/models.js` | W8 ei kirjoittanut | ✅ |
| `tests/assetsStore.normalize.test.js` | smoke | ✅ `node …` → OK |

---

## Checklist (yhteenveto)

- [x] IndexedDB add / list / filter by type
- [x] Generointi → Assets; reload säilyttää
- [x] Remix hook lataa prompt, model, seed, refs, aspect_ratio
- [x] Compare hook + UI kahdelle assetille
- [x] Ei Explore-malliselainta
- [x] Ei models.js-kirjoitusta W8:lta
- [x] Smoke-testi vihreä
- [ ] WARN: AssetsPanel mount (seuraava merge / shell — ei S3.0-blocker)
- [ ] WARN: ImageStudio `consumeSendToPayload` wire (Send to Image)

---

## Päätös

**PASS → DONE.** S3.0 “pohja” -AC:t täyttyvät. WARNit eivät vaadi `NEEDS_FIX` / `TEAM-FIXES/W8-iter1.md`; suositus Leadille: mount + Image send-to follow-up erillisenä pienenä tehtävänä (ei W8-iteraatio).

**TechLead-gate:** APPROVED-ready — yksi `assetsStore`, migraatio, Send-to API, ei Explore / ei models.js.
