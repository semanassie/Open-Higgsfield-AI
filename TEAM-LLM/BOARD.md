# TEAM-LLM Board

Koordinaatiotaulu Open-Higgsfield-AI:n MuAPI LLM -päivitykselle. Vain Lead päivittää tätä tiedostoa.

## Hierarkia

```
Lead (hyväksyntä, priorisointi, status)
├── Tech reviewer (arkkitehtuuri: miten mallit lisätään)
└── QA Auditor (lähteet, suunnitelman auditointi, FAIL/PASS)
    ├── MuAPI LLM -tutkija (live-katalogi)
    ├── Codebase-gap -tutkija (mitä meillä jo on)
    └── Suunnitelman kirjoittaja (MD)
```

Lead on Tech- ja QA-roolien yläpuolella. Tech ja QA ovat samalla tasolla ja auditoivat tutkijoiden sekä kirjoittajan tuotokset. Tutkijat ja kirjoittaja eivät hyväksy omaa työtään.

## Roolit ja omistajuus

| # | Rooli | Tuotos | Saa kirjoittaa |
|---|--------|--------|----------------|
| 1 | Lead | `TEAM-LLM/BOARD.md`, `TEAM-LLM/PROTOCOL.md`, `TEAM-LLM/FIXES.md`, `TEAM-LLM/STATUS.md` | kyllä, vain nämä (+ yksi kriittinen korjauspassi suunnitelmaan, jos QA niin vaatii) |
| 2 | QA Auditor | `TEAM-LLM/QA-REPORT.md` | vain oma raportti |
| 3 | MuAPI LLM -tutkija | `TEAM-LLM/research-muapi.md` | vain oma tutkimus |
| 4 | Codebase-gap -tutkija | `TEAM-LLM/research-codebase.md` | vain oma tutkimus |
| 5 | Suunnitelman kirjoittaja | `muapi-llm-paivityssuunnitelma.md` (repon juuri) | vain suunnitelma |
| 6 | Tech reviewer | `TEAM-LLM/ARCH.md` | vain arkkitehtuurimuistio |

Scope: text/chat/LLM-mallit. Image- ja video-mallit eivät kuulu, ellei endpoint ole LLM (esim. vision-LLM).

## Status

Sallitut tilat: `TODO` | `IN_PROGRESS` | `QA_REVIEW` | `NEEDS_FIX` | `DONE`

| Työ | Omistaja | Status | Iter | Huomio |
|-----|----------|--------|------|--------|
| Board + protocol | Lead | DONE | 0 | Luotu heti |
| Live MuAPI LLM -katalogi | MuAPI LLM -tutkija | DONE | 0 | `research-muapi.md` olemassa (84 chat/LLM/vision-endpointtia) |
| Codebase-gap | Codebase-gap -tutkija | DONE | 0 | `research-codebase.md` olemassa (ei rekisteröityä text-LLM:ää; vain `any-llm`) |
| Arkkitehtuuri | Tech reviewer | DONE | 0 | `ARCH.md` olemassa (`llmModels.js` + `callLLM`, ei uutta studiota) |
| Päivityssuunnitelma | Kirjoittaja | DONE | 0 | QA PASS. `muapi-llm-paivityssuunnitelma.md` versio 1 hyväksytty |
| QA-auditointi | QA Auditor | DONE | 0 | `QA-REPORT.md` VERDICT: PASS (iter 0/3, ei FIXES.md) |
| Lopullinen status | Lead | DONE | 0 | `STATUS.md` kirjoitettu. Suunnitelma QA-hyväksytty |

## Validointi-loop

Maksimi **3 iteraatiota**.

1. Tutkijat ja Tech tuottavat tiedostonsa (`IN_PROGRESS` → valmis aineisto).
2. Kirjoittaja tuottaa `muapi-llm-paivityssuunnitelma.md`.
3. QA lukee lähteet + suunnitelman ja kirjoittaa `QA-REPORT.md` (`QA_REVIEW`).
4. Jos QA **PASS**: Lead merkitsee suunnitelman `DONE` ja kirjoittaa `STATUS.md`.
5. Jos QA **FAIL**: Lead kirjaa `TEAM-LLM/FIXES.md`, board → `NEEDS_FIX`, iteraatiolaskuri +1. Korjaus vain aukoista, jotka QA merkitsi kriittisiksi. Uusi QA-kierros.
6. Jos 3 iteraatiota on käytetty eikä PASS: Lead kirjaa `STATUS.md`:ään, että suunnitelma ei ole QA-hyväksytty, ja listaa avoimet aukot. Ei uutta iteraatiota.

Lead ei kirjoita suunnitelmaa itse, ellei QA:n jälkeen kriittinen aukko vaadi yhtä korjauspassia.

## Päätössääntö

Suunnitelma on hyväksytty vain, kun `QA-REPORT.md` sanoo PASS ja Lead on merkinnyt rivin `DONE`.
