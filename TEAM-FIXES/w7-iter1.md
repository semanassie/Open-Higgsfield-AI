# W7 FIX — iter 1 (P1.5 Family/mode valitsin)

**Worker:** W7  
**Feature:** P1.5  
**QA:** FAIL → NEEDS_FIX  
**Iter:** 1/3  
**AC failed:** FamilyPicker + ModeChips vaihtavat selectedModel id:n  
**TechLead ref:** `TEAM-FIXES/techlead-w7-picker-api.md` (ModeChips-osio yhä voimassa)  

---

## Defects

### 1. ModeChips exportattu mutta ei wiretetty studio-kontrolleihin

- **Repro:** Video Studio → valitse malli **Wan 3.0** (perheessä Standard + Prime) → yritä vaihtaa Prime-chip.
- **Expected:** Sidebarissa (tai pickerissä) ModeChips; klikkaus vaihtaa `selectedModel` id:n (esim. `wan3.0-prime-text-to-video`).
- **Actual:** `ModeChips` määritelty `FamilyModePicker.jsx:53–84` mutta **ei renderöidä** missään. Perhe-rivi valitsee vain default-moodin (`resolveVariant(..., { modeKey: "standard" })`) dropdown-klikkauksessa (~153–158).
- **Files:** `FamilyModePicker.jsx`, `VideoStudio.jsx`, `ImageStudio.jsx`.
- **Fix:** Wire sidebar-kontrolliin (TechLead-esimerkki `techlead-w7-picker-api.md` § ModeChips):

```jsx
import { ModeChips, findFamilyForModel } from "./FamilyModePicker.jsx";

const family = findFamilyForModel(generationModels, selectedModelId);
<ModeChips
  family={family}
  selectedModelId={selectedModelId}
  onSelectMode={(model) => handleModelSelect(model)}
/>
```

- ImageStudio + VideoStudio molemmat.

### 2. Monimoodinen perhe: käyttäjä ei voi valita Prime/Max ilman ModeChipsejä

- **Repro:** Avaa model-dropdown → klikkaa **MiniMax H3** (Standard + Max).
- **Expected:** Mode-chip **Max** → `minimax-h3-max-text-to-video`.
- **Actual:** Aina default (Standard) valinta perhe-klikillä; Prime/Max ei saavutettavissa UI:ssa.
- **AC:** TEAM-PROTOCOL P1.5 — "ModeChips; … mode-chipit vaihtavat selectedModel id:n".

---

## Pass (korjauksen jälkeen pidettävä)

- `modelFamilies.js`: `getFamilies`, `resolveVariant`, search ✅
- `FamilyModePicker` API: `preferredOrder`, `sectionTitle`, `extraSections` (Video Tools) ✅
- W6 `family`/`variant` meta ryhmittää (esim. flux-3, wan-3.0) ✅
- Singleton-fallback ✅
- Ei models.js-kirjoitusta ✅

---

## Älä koske

- `packages/studio/src/models.js` (W6)
- SeedControls (W4)
- Explore-selain

---

## Re-QA checklist

- [ ] Wan 3.0: Standard ↔ Prime chip vaihtaa malli-id:n
- [ ] MiniMax H3: Standard ↔ Max chip
- [ ] Flux 3: t2i/t2v/i2i/i2v mode-erottelu listan kontekstissa
- [ ] Video Tools -osio (v2v) edelleen näkyy
- [ ] Haku family name / id
