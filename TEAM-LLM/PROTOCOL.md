# TEAM-LLM Protocol

Tiedosto-omistajuus on ehdoton. Älä kirjoita toisen roolin tiedostoa.

## Kuka kirjoittaa mitä

| Tiedosto | Ainoa kirjoittaja |
|----------|-------------------|
| `TEAM-LLM/BOARD.md` | Lead |
| `TEAM-LLM/PROTOCOL.md` | Lead |
| `TEAM-LLM/FIXES.md` | Lead (vain jos QA FAIL) |
| `TEAM-LLM/STATUS.md` | Lead (lopuksi) |
| `TEAM-LLM/research-muapi.md` | MuAPI LLM -tutkija |
| `TEAM-LLM/research-codebase.md` | Codebase-gap -tutkija |
| `TEAM-LLM/ARCH.md` | Tech reviewer |
| `TEAM-LLM/QA-REPORT.md` | QA Auditor |
| `muapi-llm-paivityssuunnitelma.md` | Suunnitelman kirjoittaja (repon juuri) |

Lead saa koskea suunnitelma-MD:hen vain yhdellä korjauspassilla, jos QA merkitsee kriittisen aukon eikä kirjoittaja ehdi korjata sitä ennen iteraatiokattoa.

## Tutkimuksen sisältö

### `TEAM-LLM/research-muapi.md` (MuAPI LLM -tutkija)

- Vain text/chat/LLM. Vision-LLM sallittu, jos se on LLM-endpoint. Ei image- eikä video-generointimalleja.
- Live-katalogi: mallin id, nimi, tyyppi (chat/text/vision), onko uusi suhteessa meidän nykyiseen listaan (rasti täytetään kun gap-tutkimus on luettu, tai merkitse "vertailu kesken").
- Lähde jokaiselle väitteelle (URL tai katalogipyynnön polku + aikaleima).
- Ei toteutusohjeita. Ei suunnitelmaa.

### `TEAM-LLM/research-codebase.md` (Codebase-gap -tutkija)

- Missä LLM-mallit on määritelty nyt (tiedostopolut).
- Mitkä MuAPI LLM -idt on jo kytketty.
- Mitä uupuu, jotta uusi malli voidaan lisätä (konfiguraatio, UI, reititys) — faktat koodista, ei arkkitehtuuriehdotusta.
- Ei live-katalogin keksimistä. Ei suunnitelmaa.

### `TEAM-LLM/ARCH.md` (Tech reviewer)

- Miten uusi LLM-malli lisätään nykyiseen arkkitehtuuriin: kosketuspisteet, järjestys, riskit.
- Perustuu koodiin ja gap-tutkimukseen. Ei uutta mallilistaa live-katalogista (se on tutkijan tiedostossa).
- Ei kirjoita `muapi-llm-paivityssuunnitelma.md`.

### `muapi-llm-paivityssuunnitelma.md` (kirjoittaja)

Aloita vasta kun nämä kolme ovat olemassa ja ei-tyhjiä:

1. `TEAM-LLM/research-muapi.md`
2. `TEAM-LLM/research-codebase.md`
3. `TEAM-LLM/ARCH.md`

Suunnitelma suomeksi. Sisältö:

- Mitkä MuAPI LLM:t ovat uusia meidän koodiin nähden (vain tutkimustiedostojen leikkaus).
- Prioriteetti ja perustelu (top-suositukset erikseen).
- Lisäysjärjestys `ARCH.md`:n mukaan.
- Ei image/video-malleja.
- Jokainen malliväite jäljitettävissä research-tiedostoon. Älä keksi malleja.

### `TEAM-LLM/QA-REPORT.md` (QA)

Auditointi vasta kun suunnitelma on olemassa. Tarkista:

1. Jokainen suunnitelman malli esiintyy `research-muapi.md`:ssä lähteellä.
2. "Uusi" tarkoittaa: ei ole jo kytketty `research-codebase.md`:n mukaan.
3. Image/video ei ole listalla LLM:nä ilman vision-LLM-perustetta.
4. Toteutusjärjestys ei ole ristiriidassa `ARCH.md`:n kanssa.
5. Ei keksittyjä id:itä.

Verdictin ensimmäinen rivi joko `VERDICT: PASS` tai `VERDICT: FAIL`.

FAIL-listassa jokainen aukko: tiedosto, väite, miksi väärin, onko kriittinen.

## Järjestys

1. Lead julkaisee boardin ja protokollan.
2. Tutkijat kirjoittavat research-tiedostot rinnakkain. Tech kirjoittaa `ARCH.md` (saa lukea gap-tutkimusta; jos sitä ei vielä ole, perustaa muistion koodiin ja merkitsee oletukset).
3. Lead pollaa lukemalla. Kun research-muapi, research-codebase ja ARCH ovat olemassa, kirjoittaja tuottaa suunnitelman.
4. QA auditoi. Lead päivittää boardin.
5. FAIL → `FIXES.md` + `NEEDS_FIX`, max 3 iteraatiota.
6. Lead kirjoittaa `TEAM-LLM/STATUS.md` suomeksi: löydetyt uudet LLM:t, top-suositukset, onko suunnitelma QA-hyväksytty.

## Kielto

Ei git-committia. Ei toisen omistaman tiedoston ylikirjoitusta.
