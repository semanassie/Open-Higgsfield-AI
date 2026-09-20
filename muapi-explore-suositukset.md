# MuAPI & Explore — suositusraportti (Open-Higgsfield-AI)

**Päivämäärä:** 2026-09-20  
**Laajuus:** MuAPI-mallivertailu + `open.higgsfield.ai/explore` UX-ideat + Krea-tyyliset UI/workflow-suositukset  
**Rajoite:** Kohdat 4–5 eivät vaadi uusia backend-API-kutsuja (UI/UX, presetit, workflowt olemassa olevilla endpointeilla).

---

## 1. Tiivistelmä

- Projektissa on jo vahva studio-pohja: Image, Video, Lip Sync, Cinema, Director, Workflows, Agents, MCP/CLI sekä ~**241** mallia `packages/studio/src/models.js`-katalogissa.
- MuAPI:n live-katalogi (`GET https://api.muapi.ai/api/v1/models`) sisältää **710** mallia — paikallisesta puuttuu nimen perusteella noin **487** endpointia (osa on variantteja/resoluutioita, ei kaikki uusia kyvykkyyksiä).
- Explore-kärkimallit **Seedance 2.5**, **Wan 3.0 / Prime**, **MiniMax H3**, **LTX 2.5**, **Grok Imagine 2.0 / Video 1.5**, **Flux 3** ja **Happy Horse 1.1** löytyvät MuAPIsta mutta eivät (tai vain osittain) paikallisesta listasta — **vahvistettu live-katalogista**.
- Higgsfield-exclusive Explore-tuotteet (**Genjutsu**, **Soul 2**, **Cinema Studio 4.0**, **Marketing Studio Image**) eivät näy MuAPI-katalogissa samoilla nimillä — näitä ei kannata “kopioida API:na”, vaan matkia **UI/preset-kerroksena**.
- Suurin nopea voitto ilman API-muutosta: marketing-preset-workflowt, history/compare/remix, Enhancer-UX olemassa oleville upscalereille, moodboard/elements paikallisina.
- ~~Explore-tyylinen malliselain~~ — **Hylätty käyttäjän toimesta** (ei suositella).

---

## 2. Nykytila (mitä meillä jo on)

### Studiot & navigaatio (`src/main.js`, `Header.js`)

| Studio | Tila | Huomio |
|---|---|---|
| Image | Käytössä | T2I + I2I |
| Video | Käytössä | T2V + I2V (+ osin V2V) |
| Lip Sync | Käytössä | Image+Video lipsync |
| Cinema | Käytössä | Kamerakontrollit / prompt-kompilointi |
| Director | Käytössä | Projektisuunnittelu / render |
| Workflows | Käytössä | WorkflowStudio |
| Agents | Käytössä | AgentStudio |
| MCP & CLI | Käytössä | McpCliStudio |
| Audio | Malli-data olemassa, reitti puuttuu standalone-navista | `audioModels` + `packages/studio/.../AudioStudio.jsx` |

### Paikallinen mallikatalogi (`packages/studio/src/models.js`)

| Kategoria | Määrä (uniikit `id`) |
|---|---:|
| T2I | 53 |
| I2I | 57 |
| T2V | 43 |
| I2V | 64 |
| V2V | 4 |
| Lipsync | 9 |
| Audio | 12 |
| Recast | 2 |
| **Yhteensä (uniikit)** | **~241** |

### Jo vahvoja perheitä paikallisesti

- **Kling v3.0** (standard/pro/omni/motion/recast) — mutta **4K- ja turbo-variantit** puuttuvat.
- **Seedance** v1.5 / v2.0 / lite / pro — mutta **ei Seedance 2.5**-perhettä.
- **Wan** 2.1 → 2.6 — mutta **ei Wan 2.7 / 3.0**.
- **Hailuo 02 / 2.3**, **LTX 2 / 2.3 lipsync**, **Grok Imagine v1**, **Nano Banana / Pro / 2**, **Z-Image**, **Suno**, **Minimax Speech/Voice**, **Flux PuLID**, **Topaz image upscale**.

### Dokumentaation tilannekuva

- `open-higgsfield-improvement-plan.md` listaa paljon MuAPI-kyvykkyyksiä “unused” — osa on sittemmin jo katalogissa (esim. audio-mallit), mutta UI-aukkoja (Apps/effects, moodboard, character) on edelleen. ~~Explore-gallery / malliselain~~ — **Hylätty käyttäjän toimesta**.
- README markkinoi hosted-versiota laajemmilla studioilla (Audio, Apps, Marketing…) — paikallinen Electron/Vite-navi on kapeampi.

---

## 3. MuAPI — uudet / puuttuvat mallit

**Lähde:** live `GET https://api.muapi.ai/api/v1/models` (710 mallia, 2026-09-20) vs. paikallinen `models.js`.  
**Luotettavuus:** `vahvistettu` = löytyy live-katalogista nimellä; `epävarma` = Explore/markkinointi, ei löytynyt MuAPI-nimellä.

| Malli (MuAPI `name`) | Tyyppi | Miksi lisätä | Prioriteetti | Lähde / luotettavuus |
|---|---|---|---|---|
| `seedance-2.5-text-to-video` (+ i2v, extend, edit, first-last, 480p/1080p/4k) | Video | Explore-hero; 30s, audio, nykyinen lippulaiva | **P1** | MuAPI live — **vahvistettu** |
| `wan3.0-prime-text-to-video` / `wan3.0-text-to-video` (+ i2v, reference) | Video | Explore-kärki; native audio, pidemmät klipit | **P1** | MuAPI live — **vahvistettu** |
| `minimax-h3-text-to-video` / `minimax-h3-image-to-video` (+ max/turbo/open) | Video | Explore-kärki; Hailuo-seuraaja, 2K-luokka | **P1** | MuAPI live — **vahvistettu** |
| `flux-3-text-to-image` / `flux-3-text-to-video` (+ i2i, i2v, extend) | Image+Video | Uusi frontier-perhe; yksi brändi image+video | **P1** | MuAPI live — **vahvistettu** |
| `ltx-2.5-text-to-video` / `ltx-2.5-image-to-video` | Video | Explore; native audio + camera motion | **P2** | MuAPI live — **vahvistettu** |
| `grok-imagine-image-2` / `grok-imagine-image-2-edit` | Image | Explore Image-osio; parempi instruction-following | **P2** | MuAPI live — **vahvistettu** |
| `grok-imagine-video-1-5-preview` / `grok-imagine-extend` | Video | Explore; T2V/I2V/ref + extend | **P2** | MuAPI live — **vahvistettu** |
| `happy-horse-1.1-text-to-video` (+ i2v, reference, edit) | Video | Explore; expressive + sync audio | **P2** | MuAPI live — **vahvistettu** |
| `kling-v3.0-4k-text-to-video` / `kling-v3.0-4k-image-to-video` | Video | Meillä on v3.0, mutta ei 4K-variantteja | **P2** | MuAPI live — **vahvistettu** |
| `kling-v3-turbo-pro-image-to-video` (+ standard) | Video | Nopea Kling 3 -iterointi | **P2** | MuAPI live — **vahvistettu** |
| `wan2.7-text-to-video` / `wan2.7-image-to-video` (+ edit/extend) | Video | Explore listaa Wan 2.7; silta 2.6→3.0 | **P2** | MuAPI live — **vahvistettu** |
| `seedance-2-text-to-video` / `seedance-2-image-to-video` (+ mini/vip/omni) | Video | Meillä `seedance-v2.0-*`; MuAPI käyttää `seedance-2-*` -nimiperhettä — synkkaa/aliasoi | **P2** | MuAPI live — **vahvistettu** (nimeämisero) |
| `nano-banana-2-lite` / `nano-banana-2-lite-edit` | Image | Halpa/nopea draft-kerros NB2:lle | **P3** | MuAPI live — **vahvistettu** |
| `z-image-p` | Image | Erittäin halpa draft (~$0.004) | **P3** | MuAPI live — **vahvistettu** |
| `topaz-upscale-image-generative` / `precision` / `creative` (+ video) | Edit/Enhance | Krea Enhancer -tyylinen UX tarvitsee nämä | **P2** | MuAPI live — **vahvistettu** |
| `mmaudio-v2-video-to-video` | Audio→Video | Auto-SFX olemassa olevalle videolle | **P2** | MuAPI live — **vahvistettu** |
| `ai-background-remover`, `ai-object-eraser`, `ai-image-extension`, `ai-product-shot` | Image tools | Explore “Apps/Edit” -kerros ilman uutta UX-brändiä | **P2** | MuAPI live — **vahvistettu** |
| `openai-sora-2-pro-storyboard` | Video | Director/Cinema multi-shot | **P3** | MuAPI live — **vahvistettu** |
| `veo3.1-4k-video` / `veo3.1-extend-video` | Video | 4K/extend Veo-polulle | **P3** | MuAPI live — **vahvistettu** |
| **Higgsfield Soul 2 / Soul Standard** | Image | Explore exclusive | — | Explore — **epävarma MuAPIssa** (`higgsfield-soul-*` ei löytynyt live-katalogista 2026-09-20) |
| **Genjutsu Motion Transfer** | Video/Workflow | Explore exclusive | — | Explore — **epävarma / ei MuAPI-nimeä** |
| **Cinema Studio 4.0 / Marketing Studio Image** | Video/Image | Explore exclusive | — | Explore — **epävarma / ei MuAPI-nimeä** |
| **Ideogram 4.0 / Recraft 4.1 / Qwen Image 3** (Explore-nimet) | Image | Explore Image-osio | — | Explore-nimet; MuAPIssa vastaavia voi olla eri slugilla — **epävarma ilman slug-matchia** |

### MuAPI-katalogin koko (konteksti)

| Category | Live count |
|---|---:|
| Image to Video | 180 |
| Text to Video | 109 |
| Text to Text | 102 |
| Video to Video | 83 |
| Image to Image | 77 |
| Text to Image | 72 |
| Text to Audio | 18 |
| Audio to Video (lipsync) | 13 |
| Image/Text to 3D | 10 |
| Muut (LoRA, Training, other) | … |
| **Yhteensä** | **710** |

**Suositus mallilisäyksille:** älä lisää kaikkia 487:ää. Lisää P1-perheet (Seedance 2.5, Wan 3.0, MiniMax H3, Flux 3) + 1–2 resoluutio-/mode-varianttia per perhe, ja rakenna UI:lle “model family” -valitsin (Standard / Fast / 1080p / 4K) sen sijaan että dumpataan jokainen slug dropdowniin.

---

## 4. Explore-työkalut joita voi kahdentaa **ilman API-muutosta**

Analysoitu: [open.higgsfield.ai/explore](https://open.higgsfield.ai/explore) (+ Product shots playground).

### Mitä Explore näyttää (havainto)

1. **Hero-carousel** uusimmille malleille (Seedance 2.5, Genjutsu, Kling 3.0, Marketing Studio, Cinema 4.0).
2. **Image / Video -suodattimet** + “All models”.
3. **Model-kortit**: video-preview, provider, lyhyt kuvaus, hinta/s tai /img, alennusbadge.
4. **Workflow-kortit**: Product shots, Graphic ads, Marketplace design — preset-ohjattu marketing-flow.
5. **Higgsfield Exclusive** -merkintä (Genjutsu, Soul, Cinema).
6. **Playground-flow** Product shots: *tuotekuva → prompt enhancer → generointi → valmis*.

### Feature-ideat ilman uutta API:a (käyttävät jo olemassa olevia MuAPI-kutsuja / paikallista dataa)

| Idea | Miten toteutetaan UI-only | Miksi |
|---|---|---|
| ~~**Explore-sivu / malliselain**~~ | ~~Paikallinen gallery `models.js`-datasta: preview, tagit, Image/Video filter, haku~~ | **Hylätty käyttäjän toimesta** — ei Explore-browse / malliselain UI-only -featurea |
| **Marketing preset -workflowt** | Kolme templaattia (Product shots / Graphic ads / Marketplace): kiinteät prompt-prefixit + aspect + “enhance prompt” -tekstilaajennus clientissä | Explore Product shots -flow; ei vaadi Marketing Studio -API:a |
| **Prompt enhancer (client)** | Sääntöpohjainen / valinnainen paikallinen LLM-promptti (jos `any-llm` jo käytössä Agentissa — muuten pelkkä template-expand) | Explore “preset-guided enhancer” |
| **Seed & Variations** | Seed-kenttä + “🎲 new variation” nappi niille malleille joilla seed jo schemassa | Soul 2 -sivun seed/reproducibility-pattern |
| **Side-by-side compare** | Kaksi viimeisintä tulosta / kaksi mallia rinnakkain samalla promptilla | Explore + Krea Enhancer -sliderin serkku |
| **Remix from history** | History-kortista “Reuse prompt + refs” | Nopea iterointi ilman uutta endpointtia |
| **Alennus-/feature-badget** | “New”, “Fast”, “4K”, “Audio” badge mallikorteissa | Explore-visuaali |
| **Workflow templates gallery** | WorkflowStudioon valmiit ketjut: Image→I2V, Product→Hero shots, Keyframe→Animate | Explore Workflows & agent -osio |
| **Style / moodboard panel** | Paikallinen moodboard (kuvat localStorage): syötetään multi-ref -malleihin jotka jo tukevat useita image_url | Explore Moodboard / Soul style gallery -idea |
| **Apps-hylly (one-click tools)** | UI-reitit olemassa oleviin: upscale, bg remove, object erase, outpaint, product shot — jos endpointit lisätään katalogiin; itse UI voi olla stub + “coming” | Explore Apps/Edit |

### Vaativat API-muutoksen / uuden endpointin (älä matki “UI-only”)

- Genjutsu motion transfer (exclusive)
- Soul 2 / Soul ID (exclusive)
- Cinema Studio 4.0 “automatic scene direction” -palvelu
- Marketing Studio Image -proprietary enhancer API
- Todellinen realtime-stream (Krea Realtime) — eri infra

---

## 5. Krea-tyyliset UX/workflow-suositukset (ilman API-muutosta)

Lähteet: [krea.ai](https://krea.ai/), [Realtime docs](https://www.krea.ai/docs/user-guide/features/realtime), [Enhancer docs](https://www.krea.ai/docs/user-guide/features/enhancer), [Krea docs index](https://www.krea.ai/docs/llms.txt).

| Krea-pattern | Suositus OH:lle (UI-only) | Huomio |
|---|---|---|
| **Realtime canvas** (live draw→image) | **Älä** yritä täyttä realtimea ilman stream-API:a. Tee “Sketch compose” -paneeli: piirrä/lähetä sketch → yksi I2I-kutsu olemassa olevalla mallilla (esim. Kontext / Nano Banana Edit) | Matkii intenttiä, ei infraa |
| **Enhancer UX** | Dedicated Enhance-näkymä: before/after slider, 1x/2x/4x UI, Strength/Resemblance-sliderit (mapataan olemassa oleviin Topaz/upscale-parametreihin), presetit (Flat Sharp / Strong / Portrait) | Voimakkain Krea-voitto OH:lle |
| **Generations grid + Assets** | Yhtenäinen Assets-kirjasto (localStorage/IndexedDB): thumbnail-grid, filter type, “Send to Video/Enhance/Lipsync” | Krea Assets / history |
| **Moodboards** | Visuaalinen board → ref-imaget generointiin | Krea Moodboards |
| **Elements (@character)** | Tallenna character/product refs + ohjeteksti; inject multi-image + prompt-prefix | Krea Elements / Seedance Studio |
| **Template Agent briefs** | AgentStudioon valmiit briefit: “Hydration Campaign”, “YouTube Thumbnail”, “Sizzle Reel”, “Product Walkthrough” | Krea Agent templates — workflow UI, ei uusi API |
| **Model picker with cost & “best for”** | Mallivalitsin: cost badge, “Best for: draft / final / faces / text” | Krea model overview |
| **Seed button** | Yksi klikkaus → uusi seed, sama prompt | Realtime/Image pattern |
| **Nodes** | Meillä on jo WorkflowStudio — lisää **template-nodes** (Product→Ads, Keyframe→I2V) | Krea Nodes |
| **Post-gen action rail** | Tuloksen alla: Upscale / Animate / Lipsync / Remix / Compare | Krea “send to Enhancer/Video” -ketju |

---

## 6. Priorisoitu roadmap

### Quick wins (1–3 pv, UI-painotteinen)

1. ~~**Explore-sivu** mallikorteilla + Image/Video/filter (data `models.js`:stä).~~ — **Hylätty käyttäjän toimesta** (ei malliselainta).
2. **Marketing preset -workflowt** (3 templaattia + prompt expand) ImageStudioon / WorkflowStudioon.
3. **Post-gen action rail** (Reuse / Compare / Send to Video).
4. **Enhancer-näkymä** olemassa olevalle `topaz-image-upscale` (+ myöhemmin generative-variantit).
5. **AudioStudio-nav** — mallit on jo katalogissa, reitti puuttuu standalone-Headeristä.

### Medium (1–2 vk)

1. Lisää **P1-malliperheet** katalogiin: Seedance 2.5, Wan 3.0 Prime, MiniMax H3, Flux 3 (T2V+I2V minimissään).
2. **Assets/history**-kirjasto + moodboard + elements.
3. **Apps-hylly** edit-työkaluille (bg remove / eraser / outpaint / product shot) — endpointit MuAPIssa valmiina.
4. **Model family UX** (älä listaa 75 Seedance-slugia raakana).

### Later

1. Director + `openai-sora-2-pro-storyboard` / Seedance extend -ketjut.
2. Sketch→I2I “pseudo-realtime” canvas.
3. Automaattinen katalogisynk `GET /api/v1/models` → generoitu `models.js` (vähentää driftia; 241 vs 710).
4. Exclusive-featurejen **käyttäjäkokemuksen** matkiminen (Cinema multi-scene UI) ilman HF-brändiä/API:a.

---

## 7. Mitä EI kannata / riskit

| Riski | Miksi |
|---|---|
| **Higgsfield-brändin / exclusive-mallien kloonaus** | Genjutsu, Soul 2, Cinema 4.0, Marketing Studio — Explore-exclusive; ei löytynyt MuAPI-slugina. Brändi- ja ToS-riski. |
| **Kaikkien 487 mallin dumpaus UI:hin** | Käyttökokemus romahtaa; priorisoi perheet + “New/Popular”. |
| **Spicy / unrestricted -variantit oletuksena** | MuAPIssa on `*-spicy-*` -endpointeja — pidä erillisenä, ikäraja/policy. |
| **Nimeämisdrift** | Paikallinen `seedance-v2.0-*` vs MuAPI `seedance-2-*` — aliasointi tai regenerointi katalogista. |
| **Todellinen Krea Realtime** | Vaatii stream/realtime-infran; UI-matkiminen ≠ sama tuote. |
| **Lisenssit / watermarkit** | Seedance watermark-remover -työkalut: juridinen/ToS-riski; älä markkinoi “poista watermark”. |
| **Hintaoletukset** | Live-katalogin `cost` on indikaattori; dynamic_pricing-videot vaativat estimate-cost ennen UI-hintaa. |

---

## 8. Lähteet

- [open.higgsfield.ai/explore](https://open.higgsfield.ai/explore) (scrape/WebFetch, 2026-09-20)
- [Product shots playground](https://open.higgsfield.ai/models/workflows/product-shots/playground)
- [MuAPI Models docs](https://muapi.ai/docs/models)
- [MuAPI Pricing / programmatic catalog](https://muapi.ai/docs/pricing)
- [MuAPI Agent Skills — 710+ models](https://muapi.ai/agent-skills)
- Live catalog: `GET https://api.muapi.ai/api/v1/models` (710 models, 2026-09-20)
- [krea.ai](https://krea.ai/)
- [Krea Realtime docs](https://www.krea.ai/docs/user-guide/features/realtime)
- [Krea Enhancer docs](https://www.krea.ai/docs/user-guide/features/enhancer)
- [Krea docs index (llms.txt)](https://www.krea.ai/docs/llms.txt)
- Paikallinen: `packages/studio/src/models.js`, `src/main.js`, `src/components/Header.js`, `README.md`, `open-higgsfield-improvement-plan.md`, `open-higgsfield-beginner-guide.md`

---

*Raportti on luotu tutkimusajankohdan live-katalogin perusteella. MuAPI-mallilista päivittyy; ennen implementointia aja uudelleen `GET /api/v1/models` ja `GET /api/v1/models/{name}` scheman varmistamiseksi.*
