# MuAPI Explore — toteutussuunnitelma (Open-Higgsfield-AI)

**Päivämäärä:** 2026-09-20  
**Peruste:** `muapi-explore-suositukset.md` (hyväksytyt kohdat) + nykyinen codebase  
**Tavoite:** Konkreettinen toteutusplan — ei geneeristä roadmap-fluffia.

---

## 1. Tiivistelmä: mitä tehdään / mitä ei

### Tehdään

- **P1-malliperheet** MuAPI-katalogiin ja Video/Image -studioihin: Seedance 2.5, Wan 3.0 / Prime, MiniMax H3, Flux 3 (T2V+I2V minimissään; Flux myös T2I/I2I).
- **Model family UX**: family-valitsin + mode/resoluutio (Standard / Fast / 1080p / 4K) — ei jokaisen slugia raakana dropdowniin.
- **Quick wins ilman uutta backend-infraa**: marketing-presetit, post-gen action rail, Enhancer-näkymä (`topaz-image-upscale` + myöhemmin generative-variantit), seed/variations, history remix/compare, Audio-nav Electron/Viteen, workflow/agent -templatet, moodboard/elements, Apps-edit-hylly (katalogin tool-endpointteihin).
- **P2/P3-mallit** sprintteinä perheen jälkeen: LTX 2.5, Grok Imagine 2 / Video 1.5, Happy Horse, Kling 4K/turbo, Wan 2.7, Seedance-2-aliasointi, Topaz generative, MMAudio V2V, draft-imaget (NB2 lite, z-image-p), Sora storyboard, Veo 4K/extend.

### Ei tehdä (explicitly OUT OF SCOPE)

| Poissuljettu | Syy |
|---|---|
| **Explore-malliselain** / gallery-browse Image/Video-suodattimilla | Käyttäjä hylkäsi |
| **Genjutsu / Soul 2 / Cinema Studio 4.0 / Marketing Studio Image** exclusive API-kloonaus | Ei MuAPI-slugia; brändi/ToS-riski |
| Kaikkien ~487 puuttuvan MuAPI-endpointin dumpaus UI:hin | UX romahtaa |
| Todellinen Krea Realtime -stream | Eri infra |
| Watermark-remover -markkinointi | Juridinen/ToS-riski |
| Spicy/unrestricted -variantit oletuksena | Policy |

**UI-kerroksen matkiminen on OK** (Cinema multi-scene, marketing presetit clientissä) ilman HF-exclusive-API:a.

---

## 2. Scope ja prioriteetti (P1 → P3)

Vain hyväksytyt suositukset.

### P1 — lippulaivat + UX-pohja

| # | Feature | API-muutos? |
|---|---|---|
| P1.1 | Seedance 2.5 -perhe (t2v, i2v; 1–2 resoluutio/mode) | Katalogi + schema (MuAPI endpointit) |
| P1.2 | Wan 3.0 / Prime (t2v, i2v; optional reference) | Katalogi |
| P1.3 | MiniMax H3 (t2v, i2v; max/turbo tarvittaessa modeina) | Katalogi |
| P1.4 | Flux 3 (t2i + t2v; i2i/i2v kun schema vahvistettu) | Katalogi |
| P1.5 | Model family -valitsin (Video + Image) | UI (+ `family`/`modes` -metadata katalogissa) |
| P1.6 | Marketing preset -workflowt (Product / Graphic ads / Marketplace) | UI-only (olemassa olevat endpointit) |
| P1.7 | Post-gen action rail (Reuse / Compare / Send to Video/Enhance/Lipsync) | UI-only |
| P1.8 | Enhancer-näkymä (before/after, 1x–4x, presetit → Topaz-parametrit) | UI-only aluksi |

### P2 — katalogilaajennus + Assets/Apps

| # | Feature | API-muutos? |
|---|---|---|
| P2.1 | LTX 2.5, Grok Imagine 2 / Video 1.5, Happy Horse 1.1 | Katalogi |
| P2.2 | Kling v3.0 4K + turbo; Wan 2.7; Seedance-2 ↔ seedance-v2.0 alias | Katalogi / alias |
| P2.3 | Topaz generative/precision/creative (+ video); MMAudio V2V | Katalogi |
| P2.4 | Apps-edit-hylly (bg remove, eraser, outpaint, product shot) | UI → olemassa olevat i2i-endpointit |
| P2.5 | Yhtenäinen Assets/history (IndexedDB) + moodboard + elements | UI + local storage |
| P2.6 | Seed & variations; feature-badget (New/Fast/4K/Audio); cost/"best for" pickerissä | UI (+ katalogi-meta) |
| P2.7 | Workflow template-nodes; Agent brief -templatet | UI |

### P3 — myöhemmin

| # | Feature | API-muutos? |
|---|---|---|
| P3.1 | nano-banana-2-lite, z-image-p (draft) | Katalogi |
| P3.2 | openai-sora-2-pro-storyboard; veo3.1-4k / extend | Katalogi + Director/Cinema-ketjut |
| P3.3 | Sketch→I2I “pseudo-realtime” canvas | UI → olemassa oleva I2I |
| P3.4 | Automaattinen katalogisynk `GET /api/v1/models` → generoitu models.js | Tooling / CI |
| P3.5 | Cinema multi-scene UX (ilman HF exclusive API:a) | UI |

---

## 3. Arkkitehtuuri: missä muutokset

### Kaksi shelliä (tärkeä)

| Kerros | Polku | Rooli |
|---|---|---|
| **Pää-UI (Next)** | `app/studio/[[...slug]]/page.js` → `components/StandaloneShell.js` | Hosted/local Next; tabit Image…Apps; käyttää `packages/studio` React-komponentteja |
| **Legacy Electron/Vite** | `src/main.js` + `src/components/Header.js` + vanillat studiot | Kapeampi navi (ei Audio/Marketing/Apps); mallit re-export `src/lib/models.js` → `packages/studio/src/models.js` |

**Sääntö:** Kaikki mallikatalogi- ja MuAPI-muutokset tehdään **`packages/studio`**-pakettiin. Next-shell (`StandaloneShell`) on ensisijainen UX-kohde. Electron-Header päivitetään vain kun feature on “navi-aukko” (esim. Audio).

### Mallirekisteröinti

1. Lisää entry `packages/studio/src/models.js` oikeaan listaan:
   - `t2iModels` / `i2iModels` / `t2vModels` / `i2vModels` / `v2vModels` / `audioModels` / …
2. Kentät: `id`, `name`, `endpoint` (MuAPI-slug), `inputs` (schema), **`family`** (pakollinen uusille P1-perheille), valinnaisesti `badges`, `bestFor`, `aliasOf`, `modes`.
3. Getterit (`getVideoModelById`, `getI2VModelById`, …) löytävät automaattisesti — ei erillistä rekisteriä.
4. Ennen lisäystä: `GET https://api.muapi.ai/api/v1/models/{name}` → vahvista input-schema (duration, resolution, image fields).
5. `src/lib/models.js` on vain re-export — **älä duplikoi**.

### API-kutsu

```
UI (ImageStudio/VideoStudio/…)
  → packages/studio/src/muapi.js  (generateImage / generateVideo / generateI2V / generateI2I / …)
    → submitAndPoll(endpoint, payload, apiKey)
      → selain: POST /api/api/v1/{endpoint}  (Next proxy)
      → Electron file://: POST https://api.muapi.ai/api/v1/{endpoint}
    → poll /api/v1/predictions/{id}/result
```

Uusi malli **ei vaadi** uutta `muapi.js`-funktiota, jos se käyttää samaa payload-muotoa (prompt, aspect_ratio, duration, resolution, image_url / images_list). Poikkeukset:

- Eri image-kenttä → `imageField` / `images_list` katalogissa (kuten nykyiset i2i/i2v).
- Extend/request_id → kuten `seedance-v2.0-extend` (`requiresRequestId`).
- Marketing ad → jo `generateMarketingStudioAd` (Seedance VIP omni).
- Uusi kategoriapolku (esim. dedicated Enhance) → ohjaa `generateI2I` / `processV2V` olemassa oleviin endpointeihin.

### UI vs API

| Muutos | Tiedostot |
|---|---|
| Katalogi | `packages/studio/src/models.js` (+ myöhemmin `modelFamilies.js` helper) |
| Generointi | `packages/studio/src/muapi.js` vain jos payload/erikoiskenttä |
| Video UI | `packages/studio/src/components/VideoStudio.jsx` |
| Image UI | `packages/studio/src/components/ImageStudio.jsx` |
| Marketing | `packages/studio/src/components/MarketingStudio.jsx` +/tai Image presetit |
| Workflows | `packages/studio/src/components/WorkflowStudio.jsx` |
| Agents | `packages/studio/src/components/AgentStudio.jsx` |
| Apps/edit | Uusi `EditToolsStudio.jsx` **tai** AppsStudio-refaktor (nykyinen Apps = SaaS-templatet, ei edit-tools) |
| Enhance | Uusi `EnhanceStudio.jsx` **tai** ImageStudio mode `enhance` |
| Assets | Uusi `packages/studio/src/lib/assetsStore.js` + sidebar/panel |
| Next-navi | `components/StandaloneShell.js` (`TABS`) |
| Electron-navi | `src/components/Header.js`, `src/main.js` |
| Proxy | `app/api/api/v1/[[...path]]/route.js` — yleensä **ei muutosta** (pass-through) |

### Nykytila johon nojataan

- `family` on jo monilla i2i/i2v-malleilla; VideoStudio käyttää `family`-sibling-hakua T2V↔I2V -vaihdossa.
- ModelDropdown listaa **kaikki** t2v/i2v-slugit — tämä on juuri se UX-ongelma jota family-valitsin korjaa.
- History: ImageStudio gallery + localStorage; Cinema/Video omat sivupalkit — **ei** yhtenäistä Assets-kirjastoa.
- Edit-toolit (`ai-background-remover`, `ai-object-eraser`, `ai-image-extension`, `ai-product-shot`, `topaz-image-upscale`) **ovat jo** `i2iModels`-katalogissa — puuttuu dedicated UX.
- Audio: Next-shellissä tab on; Electron `Header.js` / `main.js` **ei**.
- MarketingStudio kutsuu jo Seedance VIP omni -referenssiä — preset-workflowt voivat elää Image/Workflow-puolella ilman proprietary Marketing Studio API:a.

---

## 4. Sprintit

### Sprint 1 — Quick wins (UI, ei uusia MuAPI-malleja) ≈ 1–3 pv

1. Post-gen action rail Image + Video history/tuloskortteihin.
2. Marketing presetit (3 templaattia + client prompt expand) ImageStudioon ja/tai WorkflowStudio-templateina.
3. Enhancer-näkymä → `topaz-image-upscale` (+ `ai-image-upscaler` fallback).
4. Seed-nappi niille malleille joilla `inputs.seed` on schemassa; “new variation”.
5. Audio-tab Electroniin (`Header.js` + `main.js`) — mallit jo katalogissa; React AudioStudio Nextissä jo.
6. Feature-badget pickerissä (katalogi-meta: `badges: ['New','Fast','4K','Audio']` olemassa oleville lippulaivoille).

### Sprint 2 — P1-mallit MuAPIin + family UX ≈ 3–5 pv

1. Vahvista live-schemat: Seedance 2.5, Wan 3.0, MiniMax H3, Flux 3.
2. Lisää katalogiin family + 2–4 endpointtia per perhe (ei kaikkia resoluutio-slugia).
3. Refaktoroi VideoStudio (ja Image Fluxille) ModelDropdown → **FamilyPicker + ModeChips**.
4. Smoke-test: yksi onnistunut T2V + I2V per perhe proxy-polun kautta.
5. Alias: dokumentoi `seedance-v2.0-*` vs MuAPI `seedance-2-*` (korjaus P2.2:ssa).

### Sprint 3 — Assets / moodboard / Apps-edit / Enhancer++ ≈ 1 vk

1. `assetsStore` (IndexedDB): thumbnail-grid, type-filter, “Send to …”.
2. Moodboard + Elements (local refs → multi-image -mallit).
3. Edit-tools -hylly (ei Explore-malliselainta): one-click → i2i-endpointit.
4. Topaz generative/precision/creative katalogiin + Enhancer-preset mapping.
5. Side-by-side compare; Remix from history (prompt + refs).

### Sprint 4 — P2-mallit + workflow/agent templatet ≈ 1 vk

1. LTX 2.5, Grok 2 / Video 1.5, Happy Horse, Kling 4K/turbo, Wan 2.7, MMAudio V2V.
2. Seedance-2 aliasointi / synkka.
3. Workflow template-nodes (Image→I2V, Product→Hero, Keyframe→Animate).
4. Agent brief -templatet (Hydration Campaign, YouTube Thumbnail, Sizzle Reel, Product Walkthrough).
5. Model picker cost + “best for”.

### Sprint 5 — P3 / tooling (later)

1. Draft-imaget, Sora storyboard, Veo 4K/extend, Director-ketjut.
2. Sketch→I2I panel.
3. Katalogisynk-skripti (driftin esto).
4. Cinema multi-scene UX ilman exclusive API:a.

---

## 5. Feature-spesifikaatiot

### 5.1 Post-gen action rail

- **Tavoite:** Tuloksen/history-kortin alle nopeat jatkot: Reuse prompt, Compare, Send to Video / Enhance / Lipsync.
- **Koskee:** `packages/studio/src/components/ImageStudio.jsx`, `VideoStudio.jsx`; mahdollisesti jaettu `components/PostGenActions.jsx`; `StandaloneShell.js` (cross-tab navigointi + payload sessionStorage/custom event).
- **API-muutos?** Ei.
- **Acceptance criteria:**
  - Image-tuloksesta “Send to Video” avaa VideoStudion I2V-tilaan, kuva prefillattuna.
  - “Reuse” täyttää promptin (+ refs jos tallennettu historyMetaan).
  - “Enhance” avaa Enhancerin samalla kuvalla.
  - Compare näyttää kaksi viimeisintä / valittua rinnakkain.
- **Riskit:** Shell-tabien välinen state; Electron-vanillassa eri toteutus — priorisoi Next/React.

### 5.2 Marketing preset -workflowt

- **Tavoite:** Kolme Explore-tyylistä flow’ta: Product shots, Graphic ads, Marketplace — kiinteät prompt-prefixit, aspect, client-side “enhance prompt”.
- **Koskee:** `ImageStudio.jsx` (preset-paneeli) ja/tai `WorkflowStudio.jsx` templates; `src/lib/promptUtils.js` tai uusi `packages/studio/src/lib/marketingPresets.js`; **ei** proprietary Marketing Studio Image API:a. Olemassa oleva `MarketingStudio.jsx` voi jäädä Seedance VIP -referenssivideolle.
- **API-muutos?** Ei (käyttää nykyisiä T2I/I2I/I2V-endpointteja).
- **Acceptance criteria:** Käyttäjä valitsee templaatin → lataa tuotekuvan → saa laajennetun promptin → generoi yhdellä klikillä; ei uutta backend-reittiä.
- **Riskit:** Prompt-expand liian geneerinen; pidä template-pohjaisena (ei vaadi LLM:ää); valinnainen `any-llm` vain jos Agent-infra jo käytössä.

### 5.3 Enhancer-näkymä

- **Tavoite:** Dedicated Enhance: before/after slider, 1x/2x/4x, Strength/Resemblance → mapataan Topaz/`upscale_factor` (ja myöhemmin generative-varianttien parametreihin); presetit Flat Sharp / Strong / Portrait.
- **Koskee:** uusi `EnhanceStudio.jsx` **tai** ImageStudio `mode === 'enhance'`; `StandaloneShell.js` tab `enhance` (valinnainen); `models.js` topaz-entryt; `muapi.js` → `generateI2I`.
- **API-muutos?** Ei Sprint 1:ssä (`topaz-image-upscale` jo katalogissa). Kyllä P2: Topaz generative/precision/creative -endpointit katalogiin.
- **Acceptance criteria:** Käyttäjä näkee before/after; 2x/4x tuottaa uuden assetin historyyn; preset vaihtaa parametreja ilman raw JSON:ia.
- **Riskit:** Parametrinimien drift MuAPI-schemassa — vahvista `GET /models/{name}` ennen mappingia.

### 5.4 Audio-nav Electroniin

- **Tavoite:** AudioStudio saatavilla myös Vite/Electron-shellissä (Nextissä jo).
- **Koskee:** `src/components/Header.js`, `src/main.js`; joko mounttaa React AudioStudio (jos Electron-bundle tukee) tai ohjaa käyttäjän `/studio/audio` -Nextiin dokumentoidusti. Käytännön valinta: jos Electron käyttää vain vanillaa, lisää minimal vanilla AudioStudio **tai** upota packages/studio React — tarkista build (`vite`/`electron`) ennen toteutusta.
- **API-muutos?** Ei.
- **Acceptance criteria:** Navi-linkki “Audio”; vähintään yksi `audioModels`-entry generoi ääntä.
- **Riskit:** Kaksoisshell-kompleksisuus — älä blokkaa Sprint 1:n React-quick wineja.

### 5.5 Model family UX

- **Tavoite:** Dropdown näyttää **perheen** (Seedance 2.5, Wan 3.0, …); mode-chipit valitsevat endpoint-slugín.
- **Koskee:** uusi `packages/studio/src/modelFamilies.js` (groupBy family); `VideoStudio.jsx` `ModelDropdown`; `ImageStudio.jsx` vastaava Flux/NB-perheille; `models.js` `family` + `modeLabel` / `variant`.
- **API-muutos?** Ei (metadata).
- **Acceptance criteria:** Seedance 2.5 näkyy yhtenä rivinä; mode “1080p” / “I2V” vaihtaa `selectedModel`-id:n; haku löytää perheen nimen; dropdownissa &lt; ~30 riviä suosituille, ei 75 Seedance-slugia.
- **Riskit:** Vanhat mallit ilman `family`-kenttää — fallback: näytä yksittäisenä; migratoi P1/P2-perheet ensin.

### 5.6 P1-malliperheet (katalogi)

- **Tavoite:** Seedance 2.5, Wan 3.0/Prime, MiniMax H3, Flux 3 käytettävissä generointiin.
- **Koskee:** `packages/studio/src/models.js` (`t2vModels`/`i2vModels`/`t2iModels`/`i2iModels`); VideoStudio/ImageStudio family UI; smoke `muapi.js`.
- **API-muutos?** Kyllä — uudet MuAPI-endpoint-slugit katalogiin (ei uutta proxy-koodia jos pass-through).
- **Acceptance criteria:** Ks. §6.
- **Riskit:** Nimeämisdrift; dynamic_pricing → älä hardcode USD UI:hin ilman estimateä; spicy-variantit pois.

### 5.7 Assets / history -kirjasto

- **Tavoite:** Yhtenäinen Assets: thumbnail-grid, filter (image/video/audio), Send to Video/Enhance/Lipsync.
- **Koskee:** `packages/studio/src/lib/assetsStore.js` (IndexedDB); panel Image/Video/Cinema; migroi `muapi_history` / studio-kohtaiset localStorage-avaimet.
- **API-muutos?** Ei.
- **Acceptance criteria:** Generointi tallentuu Assetsiin; reload säilyttää; Send to … toimii action railin kanssa.
- **Riskit:** localStorage 5–10 MB -raja → IndexedDB pakollinen videothumbnaille; quota-virheet.

### 5.8 Moodboard + Elements

- **Tavoite:** Paikallinen moodboard (kuvat) + character/product Elements (refs + ohjeteksti) → inject multi-ref -malleihin.
- **Koskee:** `assetsStore` / `elementsStore`; ImageStudio/VideoStudio ref-slotit; vain mallit joilla `images_list` / multi-image jo tuettu.
- **API-muutos?** Ei.
- **Acceptance criteria:** Elementti `@Product` lisää image_url(t) + prompt-prefixin; moodboard-kuvat valittavissa generointiin.
- **Riskit:** Mallit joilla vain yksi `image_url` — UI disabloi ylimääräiset slotit.

### 5.9 Apps-edit-hylly

- **Tavoite:** One-click edit-työkalut (bg remove, eraser, outpaint, product shot) — **ei** Explore-malliselainta, **ei** nykyisen AppsStudion SaaS-template-gallerian korvausta.
- **Koskee:** uusi `EditToolsPanel.jsx` ImageStudiossa **tai** erillinen tab `tools` StandaloneShellissä; endpointit jo `i2iModels`-katalogissa.
- **API-muutos?** Ei (endpointit olemassa). P2: lisää puuttuvat Topaz generative -slugit.
- **Acceptance criteria:** Neljä toolia ajaa `generateI2I` oikealla endpointilla; tulos Assetsiin + action rail.
- **Riskit:** Sekoittuminen nykyiseen `AppsStudio` (SaaS) — nimeä UI “Edit tools” / “Enhance & Edit”, älä “Explore”.

### 5.10 Seed, compare, remix, badget, cost/best-for

- **Tavoite:** Krea/Explore-patternit ilman uutta API:a.
- **Koskee:** Image/Video kontrollit; historyMeta `{ prompt, model, seed, refs, aspect_ratio }`; katalogi `badges`, `bestFor`, valinnainen `costHint`.
- **API-muutos?** Ei (seed vain jos schemassa).
- **Acceptance criteria:** 🎲 arpoo uuden seedin; Remix lataa historyMetan; badge “4K”/“Audio” näkyy family-rivillä; “Best for: draft” näkyy tooltipissä.
- **Riskit:** Cost vanhenee — merkitse “indicative” tai piilota dynamic_pricing-malleilta.

### 5.11 Workflow template-nodes + Agent briefs

- **Tavoite:** Valmiit ketjut WorkflowStudioon; brief-templatet AgentStudioon.
- **Koskee:** `WorkflowStudio.jsx` templates API/lista; `AgentStudio.jsx` templates.
- **API-muutos?** Ei (workflow create käyttää olemassa olevaa workflow-API:a).
- **Acceptance criteria:** Template “Image→I2V” luo workflowin kahdella nodella; Agent “Sizzle Reel” prefillaa briefin.
- **Riskit:** Workflow-backend-skeeman rajoitteet — pidä templatet yhteensopivina nykyisten nodetyyppien kanssa.

### 5.12 P2/P3 mallilisäykset

- **Tavoite:** Katalogilaajennus family UX:n päälle (LTX 2.5, Grok, Happy Horse, Kling 4K/turbo, Wan 2.7, MMAudio, draft imaget, Sora storyboard, Veo 4K).
- **Koskee:** `models.js` + family-rekisteri; Director/Cinema vain P3 storyboard/extend -ketjuissa.
- **API-muutos?** Kyllä (uudet endpointit katalogiin).
- **Acceptance criteria:** Jokainen lisätty perhe generoi smoke-testissä; spicy/watermark-remover pois scopesta.
- **Riskit:** Alias `seedance-2-*` vs `seedance-v2.0-*` — pidä molemmat id:t tai `aliasOf` kunnes synkattu.

### 5.13 Katalogisynk (P3)

- **Tavoite:** Vähennä driftia 241 vs 710.
- **Koskee:** skripti `scripts/sync-muapi-models.mjs` (ehdotus); generoi patch / report; ei auto-commit 487 mallia UI:hin.
- **API-muutos?** Read-only MuAPI GET.
- **Acceptance criteria:** Raportti “missing / renamed / schema-changed”; manuaalinen approve ennen models.js-päivitystä.
- **Riskit:** Auto-merge rikkoo UI:n — vain curated sync.

---

## 6. P1-malliperheet: miten lisätään ilman dropdown-dumpia

### Periaate

```
UI:  [ Seedance 2.5 ▼ ]   (family)
     [ T2V | I2V ]  [ Standard | Fast ]  [ 720p | 1080p | 4K? ]
         ↓ resolve
selectedModelId = "seedance-2.5-text-to-video"  // tai i2v / 1080p -slug
muapi.generateVideo/I2V(apiKey, { model: selectedModelId, ... })
```

### Katalogimerkintä (esimerkki)

```js
// t2vModels / i2vModels
{
  id: "seedance-2.5-text-to-video",
  name: "Seedance 2.5",          // UI-otsikko perheelle; mode erottaa
  endpoint: "seedance-2.5-text-to-video",
  family: "seedance-2.5",
  variant: "t2v-standard",       // tai modeKey
  badges: ["New", "Audio"],
  bestFor: "final",
  inputs: { /* GET /models/{name} */ }
}
```

`modelFamilies.js`:

```js
export function getFamilies(models) { /* group by family */ }
export function resolveVariant(family, { io, quality, resolution }) { /* → model id */ }
```

### Perheet (minimisetit Sprint 2)

| Family id | Minimientryt katalogiin | Mode-chipit (UI) | Huomio |
|---|---|---|---|
| `seedance-2.5` | `…-text-to-video`, `…-image-to-video` (+ 1 resoluutio jos erillinen slug) | T2V/I2V; 480p/1080p/4K jos erilliset endpointit | Extend/edit/first-last → myöhemmin action rail / secondary modes, ei kaikki dropdowniin |
| `wan-3.0` | `wan3.0-text-to-video` tai `wan3.0-prime-…`, + i2v | Prime vs Standard; T2V/I2V; reference jos tuettu | Vahvista live-nimet ennen commitia |
| `minimax-h3` | `minimax-h3-text-to-video`, `…-image-to-video` | Standard / Max / Turbo (jos slugit) | Hailuo-seuraaja; älä sekoita vanhaan hailuo-2.3 familyyn |
| `flux-3` | `flux-3-text-to-image`, `flux-3-text-to-video` (+ i2i/i2v kun schema OK) | Image vs Video -studio; mode quality | Yksi brändi kahdessa studiossa; ImageStudio family-picker sama komponentti |

### UI-muutos VideoStudioon

1. Korvaa `filteredMain.map(renderItem)` → lista **unique families** (suositut ensin: P1 + Kling 3 + Seedance 2.0 + Wan 2.6).
2. Valinnan jälkeen näytä mode-chipit sidebarissa (ei toisena mega-dropdownina).
3. Säilytä search: match family name **tai** id.
4. V2V/tools erillisenä osiona kuten nyt (“Video Tools”).

### Mitä ei lisätä Sprint 2:ssa

- Kaikki Seedance 2.5 extend/edit/480p/1080p/4k -slugit kerralla — max ~4 id:tä per family, loput mode-resolvella tai Sprint 4.
- Spicy-variantit.
- Explore exclusive -nimet.

---

## 7. Explicitly OUT OF SCOPE

1. **Explore-malliselain** (gallery, Image/Video filter “All models”, hero-carousel mallikorteilla) — hylätty.
2. **Genjutsu Motion Transfer** API-kloonaus.
3. **Soul 2 / Soul Standard / Soul ID** API-kloonaus.
4. **Cinema Studio 4.0** “automatic scene direction” -palvelu HF-API:na.
5. **Marketing Studio Image** proprietary enhancer API.
6. Todellinen **Krea Realtime** stream.
7. Watermark-remover -tuotemarkkinointi.
8. Kaikkien MuAPI 710 mallin tuonti UI:hin.

Sallittua: matkia **UX-intenttiä** (presetit, Enhancer-slider, Assets, Cinema multi-shot UI olemassa olevilla malleilla).

---

## 8. Ehdotettu järjestys (checklist)

### Sprint 1

- [ ] `PostGenActions` ImageStudioon (Reuse, Compare, Send to Video/Enhance)
- [ ] Sama VideoStudioon (Reuse, Send to Lipsync/Enhance)
- [ ] `marketingPresets.js` + 3 templaattia ImageStudioon
- [ ] Client prompt-expand (template)
- [ ] `EnhanceStudio` tai Image enhance-mode → `topaz-image-upscale`
- [ ] Before/after slider + 2x/4x + 3 presetia
- [ ] Seed-nappi schemassa oleville malleille
- [ ] Badget 3–5 lippulaiva-mallille katalogissa
- [ ] Electron Audio-nav (jos build sallii) **tai** dokumentoi Next `/studio/audio`

### Sprint 2

- [ ] Live schema -check: Seedance 2.5, Wan 3.0, MiniMax H3, Flux 3
- [ ] Katalogi: 2–4 entryä / family + `family`/`variant`/`badges`
- [ ] `modelFamilies.js` + `resolveVariant`
- [ ] VideoStudio FamilyPicker + ModeChips
- [ ] ImageStudio Flux 3 family (T2I)
- [ ] Smoke-test T2V+I2V / family
- [ ] Kirjaa seedance-2 vs seedance-v2.0 alias-tehtävä Sprint 4:ään

### Sprint 3

- [ ] `assetsStore` IndexedDB + migraatio localStoragesta
- [ ] Assets-panel + Send to …
- [ ] Moodboard + Elements
- [ ] Edit-tools -hylly (4 toolia → i2i)
- [ ] Topaz generative/precision/creative katalogiin + Enhancer-mapping
- [ ] Side-by-side compare + Remix from history

### Sprint 4

- [ ] P2-mallit (LTX 2.5, Grok, Happy Horse, Kling 4K/turbo, Wan 2.7, MMAudio)
- [ ] Seedance-2 aliasointi
- [ ] Workflow templatet (3 ketjua)
- [ ] Agent brief -templatet (4)
- [ ] Cost / best-for pickerissä

### Sprint 5 (later)

- [ ] P3 draft imaget + Sora storyboard + Veo 4K/extend
- [ ] Director/Cinema-ketjut
- [ ] Sketch→I2I panel
- [ ] `sync-muapi-models` raportti (ei auto-dump)
- [ ] Cinema multi-scene UX (ilman exclusive API:a)

### Ennen jokaista mallilisäystä

- [ ] `GET /api/v1/models/{name}` schema
- [ ] `family` + mode-strategia (ei raakadropdownia)
- [ ] Ei spicy / watermark-remover
- [ ] Smoke generate proxyllä (`/api/api/v1/...`)

---

## 9. Riippuvuudet ja riskit (yhteenveto)

| Riski | Mitigointi |
|---|---|
| Kaksoisshell (Next vs Electron) | Priorisoi `packages/studio` + StandaloneShell; Electron vain navi-aukot |
| Dropdown räjähtää uusista slugeista | Family UX **ennen** laajaa P2-katalogia |
| Schema/nimeämisdrift | Live GET ennen implementointia; alias-kenttä |
| History hajallaan | Sprint 3 Assets IndexedDB |
| AppsStudio ≠ edit tools | Älä sekoita; erillinen Edit/Enhance UX |
| Hintaoletukset | Indicative badges; dynamic_pricing ilman estimateä piiloon |

---

*Suunnitelma on toteutettava dokumentti. Ennen koodia aja uudelleen MuAPI live-katalogi P1-slugien varmistamiseksi.*
