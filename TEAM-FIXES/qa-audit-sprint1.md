# QA Audit — Sprint 1 + P1 Foundation

**Auditor:** QA  
**Date:** 2026-09-20  
**Method:** Static code review + `node tests/marketingPresets.test.js`, `node tests/assetsStore.normalize.test.js`  
**Live smoke:** **Not run** (no API key in QA session). Enhance/topaz/generate proxy smoke flagged per feature.

**References:** `TEAM-BOARD.md`, `TEAM-PROTOCOL.md` §2 AC, `TEAM-ARCH-GATE.md`, worker reports `TEAM-FIXES/w*.md`, TechLead gates.

---

## Executive verdict

| ID | Feature | Owner | Verdict | Iter | Fix file |
|----|---------|-------|---------|------|----------|
| S1.1 | Post-gen action rail | W1 | **FAIL** | → 1 | `w1-iter1.md` |
| S1.2 | Marketing presets | W2 | **PARTIAL** | → 1 | `w2-iter1.md` |
| S1.3 | Enhancer UX | W3 | **PARTIAL** | → 1 | `w3-iter1.md` |
| S1.4 | Seed & variations | W4 | **PASS** | 0 | — |
| S1.5 | Feature badges | W4 | **PASS** | 0 | — |
| S1.6 | Audio-nav Electron | W5 | **PASS** | 0 | — |
| P1.1–4 | P1 catalog | W6 | **PASS** | 0 | — |
| P1.5 | Family/mode picker | W7 | **FAIL** | → 1 | `w7-iter1.md` |
| S3.0 | Assets IndexedDB | W8 | **PARTIAL** | → 1 | `w8-iter1.md` |

**Summary:** 4 PASS · 3 PARTIAL · 2 FAIL  
**Board action:** Set FAIL/PARTIAL features → `NEEDS_FIX`; Lead assigns iter 1 fixes from `TEAM-FIXES/*-iter1.md`.

---

## OUT OF SCOPE check

| Rule | Verdict | Notes |
|------|---------|-------|
| Explore-malliselain (MuAPI model browser) | **PASS** | Ei uutta Explore-galleriaa sprint-diffissä. `AppsStudio` / "Explore Apps" tab on olemassa oleva shell-ominaisuus, ei sprintin W1–W8 toteutus. |
| Spicy / watermark-remover **uutena** katalogilisänä | **PASS** | W6 ei lisännyt spicy/watermark P1-perheisiin. Vanhat `wan2.2-spicy-*`, `video-watermark-remover` olivat katalogissa ennestään. |
| Genjutsu / Soul2 / Marketing Studio Image exclusive API | **PASS** | W2 käyttää `marketingPresets.js` + T2I/I2I. ImageStudio ei kutsu `generateMarketingStudioAd`. |
| Duplikointi `src/lib/models.js` | **PASS** | Re-export vain: `export * from "studio/src/models.js"`. |
| Commit | **N/A** | QA ei commitoinut (ohjeistus). |

---

## Feature details

### S1.1 Post-gen action rail (W1) — FAIL

| AC | Result |
|----|--------|
| Send to Video → I2V + image prefill | **FAIL** — prefill OK, malli **väärä**: `i2vModels[0]` = `ai-video-effects` |
| Reuse prompt + refs | **PASS** — `handleReuseEntry` ImageStudio |
| Enhance tab + kuva | **PARTIAL** — toimii `sendAssetTo` + legacy event; `postGenTransfer.js` puuttuu |
| Compare side-by-side | **PASS** — `CompareView` + history partner |
| Jaettu `PostGenActions.jsx` | **PASS** |
| Ei Explore-UI | **PASS** |

**Blocker:** `packages/studio/src/lib/postGenTransfer.js` missing → `index.js:5` import fails.

---

### S1.2 Marketing presets (W2) — PARTIAL

| AC | Result |
|----|--------|
| 3 templaattia | **PASS** — Product / Ads / Marketplace |
| Valinta → prompt-expand | **PARTIAL** — vain "Enhance prompt" -nappi; generate ei expandaa |
| Aspect + preset-kentät | **PASS** |
| Ei proprietary API | **PASS** |

**Tests:** `node tests/marketingPresets.test.js` — all passed.

---

### S1.3 Enhancer (W3) — PARTIAL

| AC | Result |
|----|--------|
| Before/after slider | **PASS** |
| 1×/2×/4× → topaz + `generateI2I` | **PASS** (static; live smoke N/A) |
| 3 presetit | **PARTIAL** — Flat Sharp = Portrait (2×); vain Strong erottuu (4×) |
| Fallback ai-image-upscaler | **PASS** |
| Shell enhance tab | **PASS** |

**Blocker:** same missing `postGenTransfer.js` (W3 owner for module per w3-report).

---

### S1.4 Seed & variations (W4) — PASS

| AC | Result |
|----|--------|
| Seed UI vain jos `inputs.seed` | **PASS** — `modelSupportsSeed` + `SeedControls` |
| 🎲 + new variation | **PASS** — `resolveGenerationSeed` |
| historyMeta seed | **PASS** — Image/Video entry + `saveGeneration` |

Seed schema W6:llä P1-video (esim. seedance-2.5, wan-3.0). Flux-3 T2I ilman seediä — OK (schema).

---

### S1.5 Feature badges (W4) — PASS

| AC | Result |
|----|--------|
| Badge-chipit pickerissä | **PASS** — `ModelBadges` in `FamilyModePicker`; W6 `badges` P1-entryillä |

---

### S1.6 Audio-nav (W5) — PASS

| AC | Result |
|----|--------|
| Electron Header Audio | **PASS** — `src/components/Header.js:34` |
| main.js → AudioStudio | **PASS** — `src/main.js:27–30` |
| Next AudioStudio | **PASS** — `StandaloneShell.js` `activeTab === 'audio'` |

---

### P1.1–4 Catalog (W6) — PASS

| AC | Result |
|----|--------|
| Live schema | **PASS** (worker claim + `tmp-p1-schemas.json`; QA ei live-fetch) |
| 2–4 entry / family | **PASS** — seedance 2, wan 3, minimax 3, flux 4 (12 total) |
| family/variant/badges/bestFor/inputs | **PASS** |
| Ei spicy dump | **PASS** |
| Max ~4 slug/family | **PASS** |

TechLead guidance `techlead-w6-catalog-limits.md` — within limits.

---

### P1.5 Family/mode UI (W7) — FAIL

| AC | Result |
|----|--------|
| modelFamilies groupBy + resolveVariant | **PASS** |
| FamilyPicker + ModeChips wired | **FAIL** — ModeChips not rendered in studios |
| Perheet ei slug-dump | **PASS** (with W6 meta) |
| Search family name/id | **PASS** |
| Fallback ilman family | **PASS** |

TechLead `techlead-w7-picker-api.md` — API props fixed in picker, **ModeChips still open** (board B1).

---

### S3.0 Assets (W8) — PARTIAL

| AC | Result |
|----|--------|
| IndexedDB add/list/filter | **PASS** |
| Save after gen + reload | **PARTIAL** — IDB save OK; UI still localStorage `localHistory` primary |
| Remix hook | **PASS** |
| Compare hook | **PASS** |
| Ei Explore-galleria | **PASS** |

**Tests:** `node tests/assetsStore.normalize.test.js` — OK.

---

## Cross-cutting defects

1. **Missing `postGenTransfer.js`** — breaks `packages/studio/src/index.js` exports; affects W1, W3, StandaloneShell imports.
2. **Send to Video default model** — `ai-video-effects` instead of real I2V (W1/VideoStudio).
3. **ModeChips unwired** — P1 Prime/Max modes not selectable (W7).
4. **Dual history stores** — localStorage persist + IndexedDB (W8 arch gate).

---

## Smoke test status

| Area | Status |
|------|--------|
| Marketing preset unit tests | ✅ Ran |
| assetsStore static smoke | ✅ Ran |
| Live generate (image/video/enhance) | ⏭ Skipped — API key required |
| Next/Electron build import `studio` | ⚠ Likely **fail** until `postGenTransfer.js` added |

---

## Recommended board updates

```
S1.1  NEEDS_FIX  Iter 1  QA: FAIL
S1.2  NEEDS_FIX  Iter 1  QA: PARTIAL
S1.3  NEEDS_FIX  Iter 1  QA: PARTIAL
S1.4  DONE       Iter 0  QA: PASS
S1.5  DONE       Iter 0  QA: PASS
S1.6  DONE       Iter 0  QA: PASS
P1.1-4 DONE     Iter 0  QA: PASS
P1.5  NEEDS_FIX  Iter 1  QA: FAIL
S3.0  NEEDS_FIX  Iter 1  QA: PARTIAL
```

**Merge priority after fixes:** W3 postGenTransfer → W1 Send-to-Video model → W7 ModeChips → W2 expand → W8 history primary.

---

## Re-QA — iter 1 (2026-09-20)

**Full report:** `TEAM-FIXES/qa-reaudit-iter1.md`

| ID | Feature | Prior | Re-QA |
|----|---------|-------|-------|
| S1.1 | Post-gen action rail | FAIL | **PASS** |
| S1.2 | Marketing presets | PARTIAL | **PASS** |
| S1.3 | Enhancer UX | PARTIAL | **PASS** |
| S1.4 | Seed & variations | PASS | **PASS** |
| S1.5 | Feature badges | PASS | **PASS** |
| S1.6 | Audio-nav Electron | PASS | **PASS** |
| P1.1–4 | P1 catalog | PASS | **PASS** |
| P1.5 | Family/mode picker | FAIL | **PASS** |
| S3.0 | Assets IndexedDB | PARTIAL | **PASS** |

**OUT OF SCOPE:** PASS (no new Explore / spicy P1 / exclusive ImageStudio API)

**Summary:** 9 PASS · 0 PARTIAL · 0 FAIL

---

## Fix files created (iter 1)

- `TEAM-FIXES/w1-iter1.md`
- `TEAM-FIXES/w2-iter1.md`
- `TEAM-FIXES/w3-iter1.md`
- `TEAM-FIXES/w7-iter1.md`
- `TEAM-FIXES/w8-iter1.md`

No iter file for W4, W5, W6 (PASS).
