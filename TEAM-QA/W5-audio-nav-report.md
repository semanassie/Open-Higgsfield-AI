# QA Report — W5 / S1.6 Audio-nav Electron

**Verdict:** PASS  
**Iter:** 0/3  
**Date:** 2026-09-20  
**Auditor:** QA  
**Scope:** Electron Audio-nav (Header + main + aperture); Next StandaloneShell ei saa rikkoutua

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Headerissä Audio-linkki | **PASS** | `src/components/Header.js` — `t('nav.audio')`, `page: 'audio'` nav-itemeinä Image/Video jälkeen |
| 2 | `main.js` reitittää Audio-näkymään **tai** dokumentoi Next-polun | **PASS** | `src/main.js` `page === 'audio'` → dynamic import `./components/AudioStudio.js`; aperture dokumentoi `/studio/audio` + avausnappi |
| 3 | StandaloneShell / Next Audio-tab ei rikkoudu | **PASS** | `components/StandaloneShell.js`: tab `{ id: 'audio' }` + `{activeTab === 'audio' && <AudioStudio …/>}` ennallaan; studio-export `AudioStudio` intact |
| 4 | `models.js` koskematon (W5) | **PASS** | W5-diff: vain `Header.js`, `main.js`, `i18n.js`, uusi `src/components/AudioStudio.js`. Ei W5-kirjoituksia `packages/studio/src/models.js` |
| 5 | Ei Explore-malliselainta | **PASS** | Ei explore-/gallery-UI:ta Electron-muutoksissa; arch-gate §8 OOS kunnioitettu |

---

## Tiedostot (W5)

| File | Role |
|------|------|
| `src/components/Header.js` | Audio nav-linkki |
| `src/main.js` | `audio`-reititys |
| `src/components/AudioStudio.js` | **uusi** Electron aperture (ei React-katalogia) |
| `src/lib/i18n.js` | `nav.audio` + `audio.title` / `audio.webOnly` / `audio.openWeb` (en + zh) |

---

## Checklist

- [x] Header Audio nav item (`nav.audio`)
- [x] `main.js` `page === 'audio'` branch
- [x] Aperture ohjaa / dokumentoi `/studio/audio` (TEAM-ARCH-GATE §7: Electron = navi-aukko)
- [x] Next `StandaloneShell` Audio-tab + React `packages/studio` AudioStudio intact
- [x] Ei `models.js`-duplikointia Electroniin
- [x] Ei Explore / spicy / watermark scope creep
- [x] Nimiavaruus OK: `src/components/AudioStudio.js` (vanilla) ≠ `packages/studio/.../AudioStudio.jsx` (React)

---

## Notes

- Sprint 1 hyväksyy aperture/docs -polun täyden Electron React-mountin sijaan (suunnitelma §5.4 + arch-gate §7).
- Electron ei generoi ääntä in-process; Next `/studio/audio` käyttää olemassa olevaa `audioModels`-polkua.
- Workspaceissa on erillisiä `models.js` / `StandaloneShell.js` -muutoksia muilta workereilta — ne eivät kuulu W5-AC:hen; Audio-tab ei ole niissä rikottu.

## Outcome

**PASS** → Lead voi pitää / asettaa `S1.6` → `DONE`.  
Ei `TEAM-FIXES/W5-iter1.md`.
