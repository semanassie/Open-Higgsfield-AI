# TEAM-PROTOCOL — Open-Higgsfield-AI

**Lead:** Project Lead / Koordinaattori  
**Viite:** `TEAM-BOARD.md`, `muapi-explore-toteutussuunnitelma.md`

---

## 1. Handoff-säännöt

### Ennen työn aloitusta

1. Lue `TEAM-BOARD.md` — varmista että feature on `TODO` ja omistus on sinun.
2. Jos kohdetiedosto on toisen `IN_PROGRESS` / `WAIT_MERGE` → **älä kirjoita**; merkitse itsesi `WAIT_MERGE` tai odota Leadin vuoroa.
3. Aseta status `IN_PROGRESS` boardille (Lead päivittää jos et voi itse).
4. Lue acceptance criteria (§3) kyseiselle featurelle.

### Työn aikana

- Kirjoita **vain** omistamiisi tiedostoihin.
- **W6 ainoa** joka kirjoittaa `packages/studio/src/models.js`.
- Uudet tiedostot: nimeä omistusmatriisin mukaan; export `packages/studio/src/index.js` vain jos Lead/TechLead sallii (W3 Enhance, W7 picker).
- Älä lisää Explore-malliselainta, spicy-variantteja, watermark-removeria, Genjutsu/Soul2 exclusive API:a.
- Älä committoi — Lead/käyttäjä hoitaa commitit.

### Kun feature valmis implementaatioon

1. Lyhyt self-check acceptance criteriaa vasten.
2. Status → `QA_REVIEW`.
3. Ilmoita Leadille: mitä tiedostoja, mitä AC:itä täytetty, tunnetut rajoitteet.
4. **Älä** aloita seuraavaa featurea samassa yhteisessä tiedostossa ennen QA-passia, jos se aiheuttaa merge-riskin.

### QA → DONE

- QA merkitsee pass → Lead asettaa `DONE`.
- QA fail → `NEEDS_FIX` + `TEAM-FIXES/<worker>-iterN.md` (Lead kirjoittaa).

---

## 2. Acceptance criteria -gate

Feature ei ole `DONE` ennen kuin **kaikki** AC:t täyttyvät **tai** blocker on dokumentoitu boardilla.

### S1.1 Post-gen action rail (W1)

- [ ] Image-tuloksesta “Send to Video” avaa Video I2V + kuva prefill (sessionStorage/custom event OK).
- [ ] “Reuse” täyttää promptin (+ refs jos historyMetassa).
- [ ] “Enhance” avaa Enhancerin / enhance-tabin samalla kuvalla.
- [ ] Compare näyttää kaksi valittua/viimeisintä rinnakkain (voi käyttää W8 hookeja jos valmiina).
- [ ] Jaettu `PostGenActions.jsx`; ei Explore-UI:ta.

### S1.2 Marketing presetit (W2)

- [ ] 3 templaattia: Product shots, Graphic ads, Marketplace.
- [ ] Valinta → prompt-expand clientissä (template, ei pakollista LLM:ää).
- [ ] Aspect/preset-kentät; generointi olemassa olevilla T2I/I2I-endpointeilla.
- [ ] Ei proprietary Marketing Studio Image API:a.

### S1.3 Enhancer (W3)

- [ ] Before/after -näkymä (slider OK).
- [ ] 1x/2x/4x (tai scheman `upscale_factor`) → `topaz-image-upscale` (`generateI2I`).
- [ ] 3 presetia (esim. Flat Sharp / Strong / Portrait) vaihtavat parametreja ilman raw JSON:ia.
- [ ] Fallback-dokumentointi `ai-image-upscaler` jos topaz failaa (valinnainen koodissa).

### S1.4–S1.5 Seed + badges (W4)

- [ ] Seed-kontrolli näkyy vain kun mallin schemassa `inputs.seed`.
- [ ] 🎲 arpoo uuden seedin; “new variation” käyttää uutta seediä samalla promptilla.
- [ ] Badge-chipit (New/Fast/4K/Audio) näkyvät pickerissä kun W6 on lisännyt `badges` metaaan.

### S1.6 Audio-nav (W5)

- [ ] Electron `Header.js` sisältää Audio-linkin.
- [ ] `main.js` reitittää Audio-näkymään **tai** dokumentoitu ohjaus Next `/studio/audio` jos React-mount ei ole käytännöllinen.
- [ ] Next StandaloneShell Audio jo olemassa — ei rikota.

### P1.1–4 Katalogi (W6)

- [ ] Live schema tarkistettu (tai blocker jos endpoint puuttuu MuAPIsta).
- [ ] 2–4 entryä / family: `seedance-2.5`, `wan-3.0`, `minimax-h3`, `flux-3`.
- [ ] Kentät: `id`, `name`, `endpoint`, `family`, `variant`/`modeLabel`, `inputs`, valinnaisesti `badges`, `bestFor`.
- [ ] Ei spicy / watermark-remover / exclusive-nimiä.
- [ ] Max ~4 slugia per family (ei dump).

### P1.5 Family/mode UI (W7)

- [ ] `modelFamilies.js`: groupBy + `resolveVariant`.
- [ ] FamilyPicker + ModeChips; VideoStudio käyttää; ImageStudio Flux/perheille.
- [ ] Dropdownissa perheet, ei 75 raaka-slugia P1-alueella.
- [ ] Search matchaa family name tai id.
- [ ] Fallback: mallit ilman `family` → yksittäinen rivi.

### S3.0 Assets pohja (W8)

- [ ] IndexedDB `assetsStore`: add / list / filter by type.
- [ ] Generointi voidaan tallentaa (hook); reload säilyttää.
- [ ] Remix hook: lataa `{ prompt, model, seed, refs, aspect_ratio }`.
- [ ] Compare hook: kaksi asset-id:tä / URL:ää side-by-side -datalle.
- [ ] Ei Explore-galleriaa.

---

## 3. Kun QA failaa (NEEDS_FIX)

1. Lead asettaa feature `NEEDS_FIX`, kasvattaa `Iter` (max 3).
2. Lead kirjoittaa `TEAM-FIXES/<worker>-iterN.md`:
   - Defektit numeroituna (repro + odotettu + havaittu)
   - Tiedostoviitteet
   - AC joka failasi
   - Explicit “älä koske X”
3. Worker lukee FIX-tiedoston, korjaa **vain** listatut defektit, status → `QA_REVIEW`.
4. QA re-auditoi.
5. Iter 3 fail → `BLOCKED`; Lead kirjaa `TEAM-STATUS.md` + suositus (scope cut / schema blocker / defer).

---

## 4. TechLead-gate

Ennen `DONE`:

- Ei kirjoitusta väärään omistukseen.
- Ei Explore / exclusive API.
- W6-muutokset: schema-kentät järkevät; family-id:t yhtenäiset (`seedance-2.5` jne.).
- ImageStudio/VideoStudio eivät regressoi perusgenerointia (silmämääräinen / smoke).

---

## 5. Kommunikaatio Leadille

Raportoi muodossa:

```
WORKER: W#
FEATURE: S1.x / P1.x
STATUS: IN_PROGRESS | QA_REVIEW | DONE | BLOCKED
FILES: ...
AC: pass/fail lyhyesti
BLOCKERS: ...
```

Lead päivittää `TEAM-BOARD.md` ja tarvittaessa `TEAM-FIXES/`.
