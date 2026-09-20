# QA Report — W6 / P1.1–4 models.js

**Verdict:** PASS  
**Feature:** P1.1–4 P1-malliperheet katalogiin  
**Owner:** W6  
**Iter:** 0/3  
**Date:** 2026-09-20  
**Scope:** `packages/studio/src/models.js` (+ QUEUE-W6 / request-W6-badges status)  
**Worker report:** `TEAM-FIXES/w6-report.md`

---

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Seedance 2.5 katalogissa | **PASS** | `seedance-2.5-text-to-video`, `seedance-2.5-image-to-video` (`family: "seedance-2.5"`) |
| 2 | Wan 3.0 katalogissa | **PASS** | `wan3.0-text-to-video`, `wan3.0-prime-text-to-video`, `wan3.0-image-to-video` (`family: "wan-3.0"`) |
| 3 | MiniMax H3 katalogissa | **PASS** | t2v / i2v / max-t2v / max-turbo-t2v (`family: "minimax-h3"`) |
| 4 | Flux 3 katalogissa | **PASS** | t2i / t2v / i2i / i2v (`family: "flux-3"`) |
| 5 | ≤4 endpointtia / family (tai perusteltu) | **PASS** | seedance **2**, wan **3**, minimax **4**, flux **4**. Live-schemassa on ylimääräisiä i2v-mode-slugseja (`wan3.0-prime-image-to-video`, `minimax-h3-max-*-image-to-video`); jätetty pois TechLead-gateen (`techlead-w6-catalog-limits.md`) — curated, ei dump. |
| 6 | family / modes / badges / bestFor | **PASS** | Kaikilla 13 P1-entryllä `family`, `variant`, `modeLabel`, `modeKey`, `modes`, `badges`, `bestFor`, `inputs` |
| 7 | Live MuAPI schema -yhteensopivuus (spot-check) | **PASS** | Vertailu `tmp-p1-schemas.json` (live `GET /api/v1/models/{name}` -kaappaus). Slugit = endpointit; `inputs`-avaimet matchaavat (esim. Seedance/Wan: seed; MiniMax/Flux-3: ei seediä schemassa → ei keksittyä). Live re-fetch QA-ympäristöstä 401 → käytetty olemassa olevaa schema-dumpia. |
| 8 | Ei Explore-malliselainta | **PASS** | Vain katalogidata; ei Explore-UI:ta |
| 9 | Ei spicy oletuksena | **PASS** | P1-entryissä ei `default: "spicy"`. Katalogissa on vanhempia spicy/watermark-entryjä muualla — ei P1-lippulaivojen oletus, ei Sprint 1 scope-rikkomus |
| 10 | Ei duplikointia `src/lib/models.js` | **PASS** | `src/lib/models.js` on pelkkä re-export → `studio/src/models.js` |
| 11 | QUEUE-W6 / request-W6-badges käsitelty | **PASS** | `QUEUE-W6.md`: P0 badges + P1 family **Done**. Soft-remaining (laajempi Fast/4K sibling-coverage) ei estä P1 AC:tä |

---

## Family counts (verified)

| Family id | Entries | Modes (T2V) |
|-----------|---------|-------------|
| `seedance-2.5` | 2 | Standard |
| `wan-3.0` | 3 | Standard, Prime |
| `minimax-h3` | 4 | Standard, Max, Turbo |
| `flux-3` | 4 | Standard (per IO-lista) |

---

## Checklist

- [x] 13 curated P1 ids in `packages/studio/src/models.js`
- [x] Endpoint slug = model id for checked set
- [x] Schema-first `inputs` (no invented MiniMax/Flux seed)
- [x] TechLead ≤4 / family respected
- [ ] Live generate smoke (API-avain puuttuu) — **ei blocker**

---

## Notes

- `request-W6-badges.md` Remaining-listalla on vielä unchecked soft-kohtia; QUEUE merkitsee P0/P1 Done. Ei FAIL.
- Spicy enum / `wan2.2-spicy-*` / watermark-remover säilyvät legacy-katalogissa; eivät ole P1-defaultteja eikä Explorea.

## Lead

```
QA: W6 / P1.1–4
VERDICT: PASS
STATUS → DONE
FIX: — (ei TEAM-FIXES/W6-iter1.md)
```
