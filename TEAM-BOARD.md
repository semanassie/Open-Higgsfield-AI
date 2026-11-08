# TEAM-BOARD — Open-Higgsfield-AI (MuAPI Explore Sprint 1 + P1)

**Lead:** Project Lead / Koordinaattori  
**Päivitetty:** 2026-09-20 (QA re-audit W6 + W7 → PASS)  
**Scope:** `muapi-explore-toteutussuunnitelma.md` — Explore-malliselain OUT OF SCOPE  
**Tavoite:** Sprint 1 quick wins + P1-mallipohja (katalogi + family UX) — **saavutettu boardilla DONE**

---

## Roolit

| ID | Rooli | Vastuu |
|----|--------|--------|
| Lead | Project Lead | Board, merge-järjestys, blockerit, TEAM-STATUS |
| TechLead | Tech Lead | Arkkitehtuuri-gate (`TEAM-ARCH-GATE.md`), API/schema |
| QA | QA Auditor | Acceptance criteria, NEEDS_FIX, max 3 iteraatiota |
| W1 | Worker | Post-gen action rail |
| W2 | Worker | Marketing presetit |
| W3 | Worker | Enhancer UX |
| W4 | Worker | Seed & variations + badge-näyttö pickerissä |
| W5 | Worker | Audio-nav (Electron + tarvittaessa shell) |
| W6 | Worker | **VAIN** `packages/studio/src/models.js` (P1-perheet) |
| W7 | Worker | Model family/mode -valitsin UI |
| W8 | Worker | Assets/history IndexedDB + remix/compare hooks |

---

## Omistusmatriisi (pakotettu)

| Worker | Omistaa (kirjoitus) | Ei koske |
|--------|---------------------|----------|
| **W1** | `PostGenActions.jsx`, `postGenTransfer.js`, Image/Video history-wire | models.js, Explore |
| **W2** | `marketingPresets.js`, `MarketingPresetPanel.jsx`, ImageStudio preset-osio | models.js, Genjutsu/Soul2 |
| **W3** | `EnhanceStudio.jsx`, StandaloneShell enhance-tab, index export | models.js kirjoitus |
| **W4** | `SeedControls.jsx`, `ModelBadges.jsx`, seed-wire Image/Video | models.js kirjoitus |
| **W5** | `src/components/Header.js`, `src/main.js`, `AudioStudio.js` (Electron aperture), i18n | packages/studio katalogi |
| **W6** | **`packages/studio/src/models.js` AINOASTAAN** | Kaikki UI |
| **W7** | `modelFamilies.js`, `FamilyModePicker.jsx`, wire Video/Image | models.js kirjoitus |
| **W8** | `assetsStore.js`, hooks (`useAssets`/`useRemix`/`useCompare`), `AssetsPanel`, `CompareView` | Explore, exclusive API |

---

## Feature-status

| ID | Feature | Owner | Status | Iter | QA | Notes |
|----|---------|-------|--------|------|-----|-------|
| S1.1 | Post-gen action rail | W1 | **DONE** | 1/3 | PASS | pickDefaultI2V; postGenTransfer |
| S1.2 | Marketing presetit (3) | W2 | **DONE** | 1/3 | PASS | expand on select + generate |
| S1.3 | Enhancer UX → topaz | W3 | **DONE** | 1/3 | PASS | before/after; 1×/2×/4×; enhance-tab |
| S1.4 | Seed & variations | W4 | **DONE** | 0/3 | PASS | SeedControls + historyMeta |
| S1.5 | Feature badges pickerissä | W4 | **DONE** | 0/3 | PASS | ModelBadges; W6 meta |
| S1.6 | Audio-nav Electron | W5 | **DONE** | 0/3 | PASS | Header + aperture → `/studio/audio` |
| P1.1–4 | P1-malliperheet katalogiin | W6 | **DONE** | 0/3 | PASS | `TEAM-QA/W6-p1-models-report.md` — 13 entryä / ≤4 perhe |
| P1.5 | Family/mode -valitsin | W7 | **DONE** | 1/3 | PASS | `TEAM-QA/W7-family-picker-report.md` — ModeChips wired; TL reject resolved |
| S3.0 | Assets IndexedDB pohja | W8 | **DONE** | 1/3 | PASS | IDB + Assets-tab; dual-write OK |

**Status-arvot:** `TODO` | `IN_PROGRESS` | `WAIT_MERGE` | `QA_REVIEW` | `NEEDS_FIX` | `DONE` | `BLOCKED`

---

## Validointi-loop

```
implement → QA_REVIEW → (pass) DONE
                      → (fail) NEEDS_FIX → TEAM-FIXES/<worker>-iterN.md → fix → QA_REVIEW
Max 3 iteraatiota / feature.
```

Sprint 1 + P1: max käytetty iter = **1** (W1, W2, W7, W8).  
Tuore QA (2026-09-20): W6 + W7 re-audit → **PASS** (ei `W6-iter1` / `W7-iter2`).

---

## Merge-järjestys (toteutunut)

| # | Kuka | Mitä |
|---|------|------|
| 1 | W6 | models.js (ainoastaan) |
| 2 | W8 | assetsStore + hooks |
| 3 | W1 | PostGenActions + wire |
| 4 | W2 | marketing presets |
| 5 | W3 | EnhanceStudio + tab |
| 6 | W4 | seed + badges |
| 7 | W7 | FamilyModePicker + ModeChips |
| 8 | W5 | Electron audio (rinnakkain OK) |

---

## Blockerit

| ID | Kuvaus | Status |
|----|--------|--------|
| — | Ei avoimia blockereita Sprint 1 + P1 board-scopeen | — |

**Huomio (ei blocker):** Live MuAPI generate-smokea / tuoretta schema-HTTP:ää ei ajettu QA-ympäristöstä (401 / API-avain). Katalogischemat vahvistettu aiemmalla `tmp-p1-schemas.json` -dumpilla.

**TechLead:** W7 ModeChips-reject (`techlead-w7-picker-api.md`) on koodissa korjattu — odottaa formaalia **APPROVED**-merkintää.

---

## OUT OF SCOPE (pidetty)

- Explore-malliselain
- Genjutsu / Soul2 / Cinema 4.0 / Marketing Studio Image exclusive API
- Spicy / watermark-remover oletuksena
- Commit vain käyttäjän pyynnöstä
