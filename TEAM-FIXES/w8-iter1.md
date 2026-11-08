# W8 FIX — iter 1 (S3.0 Assets IndexedDB)

**Worker:** W8  
**Feature:** S3.0  
**QA:** PARTIAL → NEEDS_FIX  
**Iter:** 1/3  
**AC failed:** Yksi truth-lähde; reload säilyttää (studio history)  

---

## Defects

### 1. Kaksi rinnakkaista history-truth-lähdettä (IndexedDB + localStorage)

- **Repro:** Image Studio → generoi → reload sivu.
- **Expected (TEAM-ARCH-GATE §6):** Migraatio `muapi_history` / studio-persist → Assets; ei kilpailevaa truth-lähdettä.
- **Actual:**
  - Uudet generoinnit: `saveGeneration` → IndexedDB ✅
  - **Samalla** ImageStudio tallentaa `localHistory` → `hg_image_studio_persistent` localStorage (~757–792)
  - VideoStudio vastaavasti `hg_video_studio_persistent` + `localHistory`
  - UI näyttää ensisijaisesti `localHistory`, ei `useAssets` / IndexedDB-listaa
- **Files:**
  - `packages/studio/src/components/ImageStudio.jsx` ~670,704,757–792,1221
  - `packages/studio/src/components/VideoStudio.jsx` (persist + localHistory)
- **Fix (valitse suunta):**
  - A) Studio history-grid lukee `useAssets({ studio: "image"|"video" })` reloadin jälkeen, TAI
  - B) Poista `localHistory` persist localStorageen generoinnin jälkeen (vain IndexedDB + migraatio), TAI
  - C) Dokumentoi siirtymävaihe boardille + yksi selkeä primary (Lead approval).

### 2. AssetsPanel ei integroitu Image/Video-studioihin

- **Repro:** Etsi Assets-paneeli studion pää-UI:sta.
- **Expected:** Kevyt panel API / pääsy historyyn (board: "AssetsPanel; Image/Video save after gen").
- **Actual:** `AssetsPanel.jsx` + hookit olemassa, export `index.js`, mutta **ei mountattu** ImageStudio/VideoStudio/StandaloneShell-tablistaan sprintissä.
- **File:** `packages/studio/src/components/AssetsPanel.jsx`, `components/StandaloneShell.js`.
- **Fix:** Mount panel (drawer/tab) tai wire history-näkymä — vähintään dokumentoi defer P2:een Leadille jos scope-cut.

### 3. Enhance-historia ei IndexedDB:ssä (W3 soft)

- **Related:** `EnhanceStudio` käyttää `muapi_enhance_history` localStorage — ei W8 storea.
- **Fix:** W3 tai W8: `saveGeneration` enhance-polussa (ks. `techlead-w3-assets-soft.md`).

---

## Pass

- `assetsStore.js`: add/list/filter/type, quota trim, migration stub ✅
- `useRemix` / `useCompare` / `toHistoryMeta` ✅
- `sendAssetTo` + PostGenActions integraatio ✅
- `tests/assetsStore.normalize.test.js` ✅
- Ei Explore-galleriaa ✅

---

## Älä koske

- `models.js`, Explore, marketingPresets, FamilyModePicker wire

---

## Re-QA checklist

- [ ] Reload jälkeen generoinnit näkyvät (IndexedDB primary)
- [ ] Ei duplikaatti-/ristiriita-history localStorage vs IDB
- [ ] Remix hook palauttaa `{ prompt, model, seed, refs, aspect_ratio }`
- [ ] Compare hook: 2 asset-id/URL side-by-side
