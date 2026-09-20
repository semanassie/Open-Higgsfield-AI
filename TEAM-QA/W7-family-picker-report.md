# QA Report — W7 / P1.5 Family/ModeChips

**Verdict:** PASS  
**Feature:** P1.5 Family/mode -valitsin  
**Owner:** W7  
**Iter:** 1/3 (TechLead-reject korjattu)  
**Date:** 2026-09-20  
**Prior TechLead:** REJECTED (`TEAM-FIXES/techlead-w7-picker-api.md`) → **resolved in code**  
**Worker report:** `TEAM-FIXES/w7-report.md`  
**Re-gate note:** `TEAM-FIXES/qa-w7-techlead-regate.md`

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | ModeChips kontrollirivillä | **PASS** | `VideoStudio.jsx` ~1860 (`data-testid` via ModeChips); `ImageStudio.jsx` ~1541 — molemmat model-painikkeen vieressä SeedControls-edellä |
| 2 | Wan 3.0 Standard / Prime valittavissa | **PASS** | T2V `getFamilies(t2v)` → modes `Standard=wan3.0-text-to-video`, `Prime=wan3.0-prime-text-to-video`. Sidebar ModeChips + picker expand (`showModes`) |
| 3 | MiniMax H3 Standard / Max / Turbo valittavissa | **PASS** | T2V modes `Standard`, `Max`, `Turbo` → oikeat model id:t. `handleModeChipSelect` asettaa `selectedModel` |
| 4 | FamilyModePicker expand monimoodisille | **PASS** | `FamilyModePicker.jsx`: multi → expand + inline `<ModeChips>`; single → suora commit |
| 5 | Import API speksin mukainen | **PASS** | Molemmat studiot: `import FamilyModePicker, { ModeChips, findFamilyForModel } from "./FamilyModePicker.jsx"`. Props: `preferredOrder`, `sectionTitle`, `extraSections` (Video Tools) käytössä VideoStudiossa |
| 6 | `models.js` koskematon W7:lta | **PASS** | W7 omistaa `modelFamilies.js`, `FamilyModePicker.jsx`, Image/Video wire — ei models.js-kirjoitusta |
| 7 | TechLead reject resolved | **PASS** | ModeChips **renderöity** (ei vain import); preferredOrder / extraSections wired |

---

## TechLead recheck (`techlead-w7-picker-api.md`)

| Defect | Status |
|--------|--------|
| `preferredOrder` / `extraSections` ignored | **FIXED** |
| `<ModeChips` missing VideoStudio | **FIXED** (~1860) |
| `<ModeChips` missing ImageStudio | **FIXED** (~1541) |
| Mode-klik vaihtaa selectedModel id | **FIXED** (`handleModeChipSelect`) |

---

## Smoke (node)

```
T2V wan-3.0: Standard, Prime
T2V minimax-h3: Standard, Max, Turbo
I2V wan/minimax: vain Standard (ei Prime/Max/Turbo i2v-entryjä katalogissa — odotettu ≤4-curation)
Image flux-3: single mode → ModeChips returns null (komponentti silti mounted; OK)
```

---

## Checklist

- [x] `modelFamilies.js` — `getFamilies`, `resolveVariant`, `findFamilyForModel`, priorities
- [x] `FamilyModePicker.jsx` + exported `ModeChips`
- [x] Wire VideoStudio + ImageStudio control row
- [x] Search / singleton fallback (code review; prior AC)
- [ ] Interaktiivinen UI-klik smoke — ei ajettu (static/code + node family smoke)

---

## Notes

- ImageStudio ModeChips näkyy UI:ssa vain kun valitulla perheellä on ≥2 modea samassa IO-listassa; Flux 3 T2I/I2I ovat single-mode → null-render on speksin mukaista ModeChips-gatea (`modes.length <= 1`).
- I2V:ssä Wan/MiniMax eivät tarjoa Prime/Max/Turbo-chippejä, koska W6 curatoi ≤4 entryä (Prime/Max/Turbo vain T2V).

## Lead

```
QA: W7 / P1.5
VERDICT: PASS
STATUS → DONE
FIX: — (ei TEAM-FIXES/W7-iter2.md)
TechLead: pyydä APPROVED (reject resolved)
```
