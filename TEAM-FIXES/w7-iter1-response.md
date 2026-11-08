# W7 fix response — ModeChips wired (TechLead reject)

**Worker:** W7  
**Ref:** `TEAM-FIXES/techlead-w7-picker-api.md`, `TEAM-FIXES/w7-iter1.md`  
**Status:** QA_REVIEW  
**Date:** 2026-09-20  

## Korjaukset

1. **Sidebar ModeChips** — `VideoStudio.jsx` + `ImageStudio.jsx` kontrollirivillä model-painikkeen vieressä:
   ```jsx
   import FamilyModePicker, { ModeChips, findFamilyForModel } from "./FamilyModePicker.jsx";
   <ModeChips family={selectedFamily} selectedModelId={...} onSelectMode={...} />
   ```
2. **Picker expand** — monimoodinen perhe (Wan 3.0, MiniMax H3, …) avaa inline `ModeChips`; mode-klik kutsuu `onSelect` + `onClose` ja vaihtaa `selectedModel` id:n (Prime/Max jne.).
3. **API** — `preferredOrder` / `sectionTitle` / `extraSections` säilytetty; `findFamilyForModel` re-export `FamilyModePicker.jsx`:stä.

## Ei koskettu

- `models.js`
- Explore

## Re-QA

- [ ] Wan 3.0: Standard ↔ Prime (sidebar tai picker)
- [ ] MiniMax H3: Standard ↔ Max
- [ ] Video Tools -osio näkyy
- [ ] Haku family name / id
