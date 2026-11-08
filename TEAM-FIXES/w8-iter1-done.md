# W8 FIX — iter 1 DONE (S3.0 Assets IndexedDB)

**Worker:** W8  
**Status:** FIXED (pragmatic dual-write transition)  
**Date:** 2026-09-20  

---

## Approach

Siirtymävaihe: **IndexedDB on source of truth** Send-to/remix/compare -poluille; studio-gridit säilyttävät `localHistory` + localStorage UX-jatkuvuuden. Dual-write (`saveGeneration` + local persist) on tarkoituksellinen sprintin ajan.

---

## Fixed

### 1. IDB → localHistory merge mountissa

- **Files:**
  - `packages/studio/src/components/ImageStudio.jsx` — `listAssets({ studio: "image", type: "image" })`, yhdistää puuttuvat URL:t (max 50).
  - `packages/studio/src/components/VideoStudio.jsx` — sama video-studiolle (max 30).
- Reload: jos IDB:ssä on generointeja joita localHistory:ssa ei ole URL:n perusteella, ne näkyvät studion gridissä.

### 2. AssetsPanel mountattu

- **File:** `components/StandaloneShell.js`
- Uusi nav-tab **Assets** renderöi `AssetsPanel` (IndexedDB-grid, filter, Send…, remix/compare).

### 3. Enhance-historia IDB:ssä

- **Defer** — EnhanceStudio käyttää edelleen `muapi_enhance_history` localStoragea (W3 soft / erillinen tehtävä).

---

## Re-QA checklist

- [x] Reload jälkeen IDB-generoinnit voivat täydentyä studio-gridiin (URL-merge)
- [x] Assets-tab avaa IndexedDB-näkymän
- [x] `localHistory` persist säilyy (ei rikottu)
- [ ] Täysi single-truth-migraatio — P2 / Lead approval
