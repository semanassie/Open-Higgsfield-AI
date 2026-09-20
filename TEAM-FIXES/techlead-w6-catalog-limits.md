# TechLead guidance: W6 P1 katalogi (ennen DONE)

**Feature:** P1.1–4  
**Gate:** `TEAM-ARCH-GATE.md` §2–3  

W6 on jo hakenut live-schemat (`tmp-p1-schemas.json`) — hyvä. Ennen `models.js`-kirjoitusta:

## Max entryt / family (Sprint 2)

| Family id | Sallitut id:t (max ~4) | Älä lisää vielä |
|---|---|---|
| `seedance-2.5` | `seedance-2.5-text-to-video`, `seedance-2.5-image-to-video` | erilliset 480p/4k-slugit jos resolution on input-kenttä |
| `wan-3.0` | `wan3.0-text-to-video`, `wan3.0-image-to-video` **tai** Prime-pari modeina | molemmat Standard+Prime × T2V+I2V = 4 max; älä 6+ |
| `minimax-h3` | `minimax-h3-text-to-video`, `minimax-h3-image-to-video` (+ max/turbo **modeina** jos tarvitaan, max 4 yht.) | kaikki `minimax-h3-max-*` + turbo = 6 → **REJECT** dump |
| `flux-3` | `flux-3-text-to-image`, `flux-3-text-to-video`, + i2i/i2v jos schema OK | spicy / watermark |

## Pakolliset kentät

```js
family: "seedance-2.5" | "wan-3.0" | "minimax-h3" | "flux-3"
variant: "t2v" | "i2v" | "t2i" | "i2i" | "t2v-prime" | …
badges: ["New", ...]  // lippulaivoille
bestFor: "final" | "draft" | …
inputs: { /* live schema properties — ei arvailua */ }
```

Huom: MuAPI `family`-kenttä voi olla `wan3.0` / `minimax-h3-max` — katalogin **meidän** `family`-id normalisoi W7:lle (`wan-3.0`, `minimax-h3`). Mode-chip erottaa Prime/Max/Turbo.

## Kielletty

- Duplikointi `src/lib/models.js`
- Kaikkien 16 scheman dump UI-katalogiin ilman mode-strategiaa
- Explore-selain

## Review-fokus

Schema vahvistettu ✅ (tmp). TechLead **REJECT** jos >4 id/family tai puuttuu `family`/`variant`.
