# TechLead APPROVED: W7 FamilyModePicker / ModeChips

**Feature:** P1.5  
**TechLead:** **APPROVED** (re-review 2026-09-20)  
**Gate:** `TEAM-ARCH-GATE.md` §4  
**Prior:** REJECTED — ModeChips unwired (sama tiedosto, alla checklist)

---

## Re-review verdict

Edellinen reject korjattu. ModeChips on wiretetty sidebar-kontrolliriville **ja** picker-expandiin.

| Check | Status |
|-------|--------|
| `preferredOrder` / `sectionTitle` / `extraSections` | ✅ |
| `<ModeChips` VideoStudio kontrollirivillä | ✅ (`selectedFamily` + `handleModeChipSelect`) |
| `<ModeChips` ImageStudio kontrollirivillä | ✅ |
| Picker expand: monimoodinen perhe → inline ModeChips | ✅ (`expandedFamilyId` / selected) |
| Wan 3.0 T2V: Standard ↔ Prime | ✅ `wan3.0-text-to-video` / `wan3.0-prime-text-to-video` |
| MiniMax H3 T2V: Standard ↔ Max ↔ Turbo | ✅ |
| Mode-klik vaihtaa `selectedModel` id:n | ✅ |
| Video Tools `extraSections` | ✅ |
| Ei Explore / ei `models.js`-kirjoitusta (W7) | ✅ |

## Notes (ei blocker)

- I2V-listassa Wan/MiniMax voivat olla yksimoodisia (vain Standard) → ModeChips piiloutuu (`modes.length <= 1`) — odotettua katalogirajoista.
- Flux-3 Image: yksi mode / lista → chipit eivät näy; family-rivi OK.

**TechLead: APPROVED** — P1.5 arkkitehtuuri-gate täyttyy.
