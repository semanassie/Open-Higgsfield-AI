# QA Re-Audit — iter 1 fixes

**Auditor:** QA  
**Date:** 2026-09-20  
**Method:** Static code review + `node tests/marketingPresets.test.js`, `node tests/assetsStore.normalize.test.js`  
**Live smoke:** Not run (no API key)

**Inputs:** `TEAM-FIXES/*-iter1.md`, `*-iter1-done.md`, prior `qa-audit-sprint1.md`

---

## Final verdict (iter 1 re-QA)

| ID | Feature | Owner | Prior | Re-QA | Notes |
|----|---------|-------|-------|-------|-------|
| S1.1 | Post-gen action rail | W1 | FAIL | **PASS** | `pickDefaultI2V()` + `DEFAULT_SEND_I2V_IDS`; `applyPostGenImage` uses it; no `i2vModels[0]` in repo; `postGenTransfer.js` exists + exported; `PostGenActions` imports shared module |
| S1.2 | Marketing presets | W2 | PARTIAL | **PASS** | `handleSelectMarketingPreset` + `handleGenerate` both call `expandMarketingPrompt`; unit tests pass |
| S1.3 | Enhancer UX | W3 | PARTIAL | **PASS** | `postGenTransfer.js` present; PRESETS 1× / 2× / 4× distinct; Enhance localStorage history deferred (soft, out of iter1 scope) |
| S1.4 | Seed & variations | W4 | PASS | **PASS** | No regressions — `SeedControls`, `modelSupportsSeed`, `resolveGenerationSeed` |
| S1.5 | Feature badges | W4 | PASS | **PASS** | `ModelBadges` in `FamilyModePicker` |
| S1.6 | Audio-nav Electron | W5 | PASS | **PASS** | `Header.js` audio nav + `main.js` AudioStudio route + StandaloneShell audio tab |
| P1.1–4 | P1 catalog | W6 | PASS | **PASS** | P1 families (seedance-2.5, wan-3.0, minimax-h3, flux-3) with family/variant/badges meta |
| P1.5 | Family/mode picker | W7 | FAIL | **PASS** | `ModeChips` rendered in ImageStudio + VideoStudio sidebars; `handleModeChipSelect` updates model id |
| S3.0 | Assets IndexedDB | W8 | PARTIAL | **PASS** | Assets tab + `AssetsPanel` in StandaloneShell; IDB→localHistory merge on mount; transitional dual-write documented OK |

**Summary:** 9 PASS · 0 PARTIAL · 0 FAIL (iter 1 scope)

---

## OUT OF SCOPE check

| Rule | Re-QA |
|------|-------|
| Explore-malliselain (new sprint UI) | **PASS** — no new Explore gallery; existing `Explore Apps` tab unchanged |
| Spicy / watermark-remover as new P1 catalog adds | **PASS** — pre-existing catalog entries only |
| Genjutsu / Soul2 / Marketing Studio exclusive API in ImageStudio | **PASS** — `generateMarketingStudioAd` only in `MarketingStudio.jsx`; ImageStudio uses `marketingPresets.js` |

---

## Evidence (static)

### W1
- `VideoStudio.jsx`: `pickDefaultI2V()`, `DEFAULT_SEND_I2V_IDS`, `applyPostGenImage` → `pickDefaultI2V()` (~507–511)
- No `i2vModels[0]` in codebase (grep clean except audit docs)
- `packages/studio/src/lib/postGenTransfer.js` — `readPostGenPayload`, `navigateWithPostGen`, exports in `index.js`
- `PostGenActions.jsx` imports from `postGenTransfer.js`

### W2
- `ImageStudio.jsx` ~1136 select, ~1188–1190 generate → `expandMarketingPrompt`
- `tests/marketingPresets.test.js` — all passed

### W3
- `EnhanceStudio.jsx` PRESETS: Flat Sharp 2×, Strong 4×, Portrait 1×
- Imports `readPostGenPayload` from `postGenTransfer.js`

### W7
- `ImageStudio.jsx` ~1541–1546: `<ModeChips family={selectedFamily} … onSelectMode={handleModeChipSelect} />`
- `VideoStudio.jsx` ~1860–1865: same pattern
- `handleModeChipSelect` sets `selectedModel` / calls `handleModelSelect`

### W8
- `StandaloneShell.js`: `{ id: 'assets', label: 'Assets' }`, renders `<AssetsPanel />`
- `ImageStudio.jsx` / `VideoStudio.jsx`: `listAssets` merge effect with comment "dual-write transition"
- `w8-iter1-done.md` documents pragmatic dual-write; full single-truth → P2

### W4 / W5 / W6 (regression)
- W4: `SeedControls` + `ModelBadges` wired in studios
- W5: `Header.js:34` audio, `main.js:27–30`, StandaloneShell audio tab
- W6: P1 model entries with family/variant in `models.js`

---

## Board status (recommended)

```
S1.1  DONE  Iter 1  QA: PASS
S1.2  DONE  Iter 1  QA: PASS
S1.3  DONE  Iter 1  QA: PASS
S1.4  DONE  Iter 0  QA: PASS
S1.5  DONE  Iter 0  QA: PASS
S1.6  DONE  Iter 0  QA: PASS
P1.1-4 DONE Iter 0  QA: PASS
P1.5  DONE  Iter 1  QA: PASS
S3.0  DONE  Iter 1  QA: PASS (dual-write transition accepted)
```

**P2 defer:** single-truth history migration; Enhance history → IndexedDB.
