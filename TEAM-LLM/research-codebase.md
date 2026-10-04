# Codebase-gap: mitä LLM/text-malleja ratkaisussa jo on

Tutkimus 2026-10-04. Vain koodi tässä repossa. Live-MuAPI-katalogia ei tulkita integroiduksi, vaikka `TEAM-LLM/_llm-extract.json` listaisi endpointteja.

**Johtopäätös:** ratkaisussa ei ole yhtään rekisteröityä text/chat-LLM:ää. Ainoa tekstikutsu on yksi gateway, `POST /api/v1/any-llm`, ilman mallitunnistetta. Sitä käyttää vain Electronin Director. Image-, video- ja audio-katalogi (257 mallia) ei sisällä text-to-text -listaa.

## Missä LLM:t rekisteröidään ja kutsutaan

### Katalogi (ei LLM-listaa)

| Polku | Rooli |
|---|---|
| `packages/studio/src/models.js` | Ainoa mallikatalogi. Auto-generoitu `models_dump.json`:sta. |
| `src/lib/models.js` | Uudelleenvienti: `export * from "studio/src/models.js"`. |

Eksportit ovat pelkkiä media-listoja. `llmModels` / `textModels` / `chatModels` puuttuu.

| Eksportti | Kpl | Modality |
|---|---:|---|
| `t2iModels` | 54 | text-to-image |
| `t2vModels` | 50 | text-to-video |
| `i2iModels` | 58 | image-to-image |
| `i2vModels` | 68 | image-to-video |
| `v2vModels` | 4 | video-to-video |
| `lipsyncModels` | 9 | lipsync |
| `recastModels` | 2 | recast |
| `audioModels` | 12 | musiikki / puhe / SFX |
| **yhteensä** | **257** | ei text-to-text -riviä |

Slug resolvedaan kutsussa näin: `modelInfo.endpoint || params.model` (`src/lib/muapi.js`, `packages/studio/src/muapi.js`). Jos `endpoint` puuttuu oliosta, id on slug.

### Ainoa tekstikutsu

`src/lib/muapi.js` — `MuapiClient.callLLM(prompt, options)`.

- URL: `{baseUrl}/api/v1/any-llm`
- Body: `prompt`, `system_prompt` (oletus: "You are a helpful creative AI assistant."), valinnainen `model`
- `options.model` ja `options.useCase` ovat tuettuja. `useCase` menee vain `console.log`:iin. **Yksikään kutsuja ei aseta `model`-kenttää**, joten tuote ei valitse Claudea, GPT:tä, Geminiä, Grokia, Qwen-chattia, DeepSeekiä, Llamaa eikä Mistralia.
- Vastaus luetaan kentistä `output.text` / `output` / `text` / `response` / `outputs[0]` / `choices[0]`. Async-poll samaan `predictions/{id}/result` -polkuun kuin mediajobit.
- Electron DEV: `baseUrl` on tyhjä, Vite proxaa `/api` → `https://api.muapi.ai` (`vite.config.mjs`). Muuten suora `https://api.muapi.ai`.
- Web-studion client (`packages/studio/src/muapi.js`) **ei sisällä `callLLM`ia**. Nextin catch-all `app/api/api/v1/[[...path]]/route.js` välittäisi polun eteenpäin, jos joku kutsuisi `/api/api/v1/any-llm`, mutta mikään web-UI ei tee sitä. Kommentti routesissa: proxy on AiAgent-kirjaston kaksois-`/api/api` -prefiksiä varten.

### Kutsuketju (ainoat call-saitit)

```
src/components/DirectorStudio.js
  → src/lib/directorPlanner.js
      runPass1Screenplay  useCase: director_screenplay
      runPass2Shots       useCase: director_shots
      runPass3Polish      useCase: director_polish
      planShortFilm       ketjuttaa kolme passia
  → muapi.callLLM  (src/lib/muapi.js)
  → POST /api/v1/any-llm
```

`src/lib/directorModels.js` valitsee vain still/video-mallit (`nano-banana-2`, Seedance-i2v/t2v). Se ei valitse LLM:ää.

Testit (`tests/directorPlanner.test.mjs`) parsaavat JSON-tekstiä. Ne eivät kutsu verkkoa eivätkä lukitse mallia.

## Taulukko: integroidut text/LLM-endpointit

| id katalogissa | endpoint-slug | UI |
|---|---|---|
| *(ei id:tä)* | `any-llm` | Electron: `src/components/Header.js` → sivu `director` → `src/main.js` → `DirectorStudio.js`. Kolme nappia (käsikirjoitus, otokset, polish) ja Auto. Käyttäjä ei näe eikä vaihda LLM:ää. |

Web-kuori `components/StandaloneShell.js` **ei** sisällä Director-välilehteä. Director on vain Electron-headerissa (`src/components/Header.js`: image, video, audio, lipsync, cinema, director, workflows, agents, mcp-cli).

## Näyttää LLM:ltä, mutta on media

Nämä osuvat hakuun `llm|openai|claude|gemini|grok|qwen|gpt`. Ne ovat kuva-, video- tai enkooderimalleja. Niitä ei lasketa olemassa oleviksi text-LLM:iksi. Endpoint-sarake on slug, jota `generate*` käyttää (`endpoint` tai id).

| id | slug | lista | UI |
|---|---|---|---|
| `qwen-image` | `qwen-image` | t2i | Image Studio |
| `qwen-text-to-image-2512` | `qwen-text-to-image-2512` | t2i ja i2i | Image |
| `qwen-image-edit` | `qwen-image-edit` | i2i | Image |
| `qwen-image-edit-plus` | `qwen-image-edit-plus` | i2i | Image |
| `qwen-image-edit-plus-lora` | `qwen-image-edit-plus-lora` | i2i | Image |
| `qwen-image-edit-2511` | `qwen-image-edit-2511` | i2i | Image |
| `grok-imagine-text-to-image` | `grok-imagine-text-to-image` | t2i | Image |
| `grok-imagine-image-to-image` | `grok-imagine-image-to-image` | i2i | Image |
| `grok-imagine-text-to-video` | `grok-imagine-text-to-video` | t2v | Video |
| `grok-imagine-image-to-video` | `grok-imagine-image-to-video` | i2v | Video |
| `gpt-image-1.5` | `gpt-image-1.5` | t2i | Image |
| `gpt-image-2` | `gpt-image-2-text-to-image` | t2i | Image |
| `gpt-image-1.5-edit` | `gpt-image-1.5-edit` | i2i | Image |
| `gpt-image-2-edit` | `gpt-image-2-image-to-image` | i2i | Image |
| `gpt4o-image-to-image` | `gpt4o-image-to-image` | i2i | Image |
| `gpt4o-edit` | `gpt4o-edit` | i2i | Image |
| `openai-sora` | `openai-sora` | t2v | Video |
| `openai-sora-2-text-to-video` | `openai-sora-2-text-to-video` | t2v | Video |
| `openai-sora-2-pro-text-to-video` | `openai-sora-2-pro-text-to-video` | t2v | Video |
| `openai-sora-2-image-to-video` | `openai-sora-2-image-to-video` | i2v | Video |
| `openai-sora-2-pro-image-to-video` | `openai-sora-2-pro-image-to-video` | i2v | Video |
| `nano-banana` / `nano-banana-pro` / `nano-banana-2` (+ edit-variantit) | sama id | t2i / i2i | Image, Cinema (`nano-banana-pro`), Director-stillit (`nano-banana-2`) |

Haku ei löytänyt katalogista id:tä tai slugia, jossa olisi `claude`, `deepseek`, `llama`, `mistral` tai `text-to-text`.

Audio (12) on Suno, Minimax-puhe/klooni ja `mmaudio-v2/text-to-audio`. Ei chat-LLM.

### Paikallinen Qwen3-4B ei ole chat

`electron/lib/modelCatalog.js` → `ZIMAGE_AUXILIARY.llm`:

- id `__llm__`
- tiedosto `Qwen3-4B-Instruct-2507-UD-Q4_K_XL.gguf`
- näyttönimi "Qwen3-4B Text Encoder"
- `electron/lib/localInference.js` antaa sen sd.cpp:lle lipulla `--llm`
- UI: `src/components/LocalModelManager.js` (Settings → Local Models, Z-Imagen apuri)

Tämä on diffuusiomallin tekstienkooderi, ei keskustelumallia eikä MuAPI-endpointtia.

### Promptinhantaja ei ole LLM

`src/components/ImageStudio.js` + `src/lib/promptUtils.js`: tagit liitetään pilkulla pohjapromptiin (`ENHANCE_TAGS`). Ei verkkokutsua. Web-studion Image Studiossa tätä paneelia ei ole.

## Aukot

### Text-studio

Ei ole. Kumpikaan kuori ei rekisteröi sivua `text` / `chat` / `llm`.

Web-välilehdet (`components/StandaloneShell.js`): Image, Enhancer, Video, Assets, Audio, AI Clipping, Vibe Motion, Lip Sync, Body Swap, Cinema, Marketing, Workflows, Agents, Design Agent, Explore Apps.

Electron-sivut (`src/main.js`): image, video, cinema, director, audio, lipsync, workflows, agents, mcp-cli. Sidebar (`src/components/Sidebar.js`) on kapeampi: canvas, video, library, settings.

`app/assistant/page.js` tekee `redirect('/studio')`. Ei assistenttinäkymää.

`packages/studio/src/components/McpCliStudio.jsx` on exportattu, mutta `StandaloneShell` ei mounttaa sitä. Electronin `src/components/McpCliStudio.js` on ohjesivu: miten Claude / Cursor / Windsurf / Gemini CLI kytketään MuAPI-mediaan (`https://api.muapi.ai/mcp`). Se ei hostaa LLM:ää eikä listaa text-malleja.

### Chat-UI

Kaksi chat-pinta-alaa on, kumpikaan ei ole tämän repon text-mallikatalogi.

1. **Web Agents** — `app/agents/[agent_id]/AgentChatClient.js` renderöi npm-paketin `ai-agent` (`AiAgent`, `usedIn="muapiapp"`). Riippuvuus: `package.json` → `"ai-agent": "file:./packages/Open-Poe-AI/packages/agents"`. **Tätä hakemistoa ei ole työtilassa** (0 tiedostoa), joten mallilista ei ole tässä repossa luettavissa. Selain puhuu proxyn kautta:
   - `app/api/agents/[[...path]]/route.js` → `https://api.muapi.ai/agents/...`
   - `app/api/v1/creative-agent/[[...path]]/route.js` → `https://api.muapi.ai/api/v1/creative-agent/...`
   - Lista-UI: `packages/studio/src/components/AgentStudio.jsx` (templaatit, omat agentit, keskustelut).
   - Electronin `src/components/AgentStudio.js` on tynkä: teksti `agents.webOnly` ("Available in the web app"). Ei chattia, ei mallivalintaa.

2. **Design Agent** — `packages/studio/src/components/DesignAgentStudio.jsx` käärii `design-agent`-paketin `CreativeCanvas`. Workspace-polku `packages/Open-AI-Design-Agent/packages/design-agent` ei ole tässä checkoutissa. Ei text-mallirekisteriä tässä repossa.

Directorin käsikirjoitusruutu on tekstialue LLM:n raakavastaukselle, ei monikierroksinen chat.

## Rajoitteet

- Tuote on media-studio. `package.json` description: "AI image, video, cinema and lip sync studio". Katalogi, nav ja `packages/studio/src/muapi.js`-funktiot (`generateImage`, `generateI2I`, `generateVideo`, `generateI2V`, `generateAudio`, lipsync, recast, clipping, motion, marketing) vastaavat sitä.
- Text-LLM ei ole käyttäjän valitsema malli. Se on Directorin sisäinen suunnittelija, ja vain desktop-buildissa.
- Gateway on yksi slug (`any-llm`) ilman id:tä katalogissa. Uusi nimetty text-malli (oma id, slug, input-schema, studio-välilehti) on puute, ei päällekkäisyys `any-llm`:n kanssa — ellei suunnitelma tietoisesti jatka samaa gatewaytä ja vain välitä `model`-kenttää.
- Grok Imagine, GPT Image, Qwen Image, Sora ja Nano Banana ovat jo kuvassa/videossa. Niiden lisääminen "LLM-uutena" olisi väärä aukko.
- Qwen3-4B on jo ladattava paikallinen enkooderi. Sen lisääminen chat-mallina vaatisi eri polun kuin `--llm` sd.cpp:lle.

## Mitä "uusi" tarkoittaa tässä repossa

Puute on kaikki seuraavista, koska niitä ei ole:

- text/chat-mallin rivi `packages/studio/src/models.js`:ssä (id + endpoint-slug + inputit)
- Text Studio tai vastaava välilehti webissä ja Electronissa
- `callLLM`, joka saisi mallitunnisteen ja näkyisi muualla kuin Directorin kolmessa passissa
- web-clientin (`packages/studio/src/muapi.js`) tekstikutsu
- käyttäjälle näkyvä valinta Claude / GPT / Gemini / Grok-chat / Qwen-chat / DeepSeek / Llama / Mistral
