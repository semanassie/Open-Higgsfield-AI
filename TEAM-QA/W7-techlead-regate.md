# TechLead re-gate — W7 / P1.5 ModeChips

**Verdict:** **APPROVED**  
**Date:** 2026-09-20  
**Role:** TechLead  
**Prior:** REJECTED (`TEAM-FIXES/techlead-w7-picker-api.md`)  
**Request:** `TEAM-FIXES/qa-w7-techlead-regate.md`  
**QA product:** PASS (`TEAM-QA/P1.5-family-mode-picker-report.md`)

---

## Re-review checklist (prior REJECT)

| Item | Result | Evidence |
|------|--------|----------|
| `preferredOrder` / `sectionTitle` / `extraSections` / `domain` | **OK** | `FamilyModePicker.jsx` props + `domain` → IMAGE/VIDEO priority |
| `<ModeChips>` VideoStudio sidebar | **OK** | `VideoStudio.jsx` ~1860 — `family={selectedFamily}`, `onSelectMode` → `handleModeChipSelect` |
| `<ModeChips>` ImageStudio sidebar | **OK** | `ImageStudio.jsx` ~1541 — same pattern; `selectedFamily = findFamilyForModel(...)` |
| In-picker ModeChips when `showModes` | **OK** | `FamilyModePicker.jsx` ~204–210 |
| Mode-klik → `selectedModel` id | **OK** | Video: `setSelectedModel(m.id)`; Image: `handleModelSelect(m, selectedFamily)` |
| Ei Explore / ei `models.js`-kirjoitusta | **OK** | W7 omistus: `modelFamilies.js` + picker + studio wire |

---

## Verdict

Prior blocker (ModeChips exported but unwired) is **resolved**. Sidebar + picker mode switching works for multi-mode families.

**B1** (ModeChips unwired) → **CLOSED**.  
**P1.5 TechLead** → **APPROVED**.  
Sprint 1 / P1 soft-gate complete.
