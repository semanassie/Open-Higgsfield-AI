# MuAPI LLM -päivityssuunnitelma

Versio 1 · 2026-10-04

Inventaario on tutkimuksen ja koodin leikkaus. Valitsimeen tulee vain `TEAM-LLM/ARCH.md`:n oletuslista (22 frontier-slugia). Loput vahvistetut puutteet on priorisoitu, eikä niitä dumpata dropdowniin.

## 1. Tiivistelmä

Ratkaisussa ei ole text/chat-katalogia. Ainoa tekstikutsu on Electronin Director: `POST /api/v1/any-llm` ilman `model`-kenttää. MuAPI:n live-katalogi (2026-10-04) sisältää 84 chat-, LLM- tai vision-language -endpointtia. Yksikään niistä ei ole rivinä `packages/studio/src/models.js`:ssä.

Oletusvalitsin on 11 tuoteperhettä ja 22 omaa slugia (`transport: slug`). Gatewayn enum ja abliteroidut sekä character-chat -mallit jäävät valitsimen ulkopuolelle. Directorin hiljainen oletus säilyy: jos käyttäjä ei valitse mallia, kutsu on edelleen `any-llm` ilman `model`-kenttää.

Kun käyttäjä valitsee mallin, ensimmäinen kokeiltava moodi kussakin perheessä:

| Perhe | Ensimmäinen moodi | Slug | Miksi |
|---|---|---|---|
| `claude-fable` | 5.1 | `claude-fable-5-1` | Tutkimus: uudempi lippulaiva, 1M-konteksti, extended thinking |
| `gpt-6` | Astra | `gpt-6-astra` | Tutkimus: GPT-6-lippulaiva, teksti ja kuva |
| `gemini-3-pro` | 3.1 Pro | `gemini-3-1-pro` | Tutkimus: suunnittelu, koodi, monikierros — vastaa Directorin kolmea passia |
| `deepseek-v4` | Pro | `deepseek-v4-pro` | Tutkimus: lippulaiva, koodi ja monivaiheinen päättely |
| `grok-4` | 4.7 | `grok-4-7` | Ainoa Grok-oletuschip |
| `kimi` | K3 | `kimi-k3` | Ainoa Kimi-slug, 1M-konteksti |
| `gemini-3.8` | Flash | `gemini-3-8-flash` | Frontier-Flash; kalliimpi kuin 3.5–3.7 Flash |
| `gpt-5.6` | Sol | `gpt-5-6-sol` | 5.6-lippulaiva, eri perhe kuin GPT-6 jotta Sol/Luna eivät sekoitu |
| `gpt-5.5` | Standard | `gpt-5-5` | Yksi moodi, ei chippejä |
| `claude-opus` | 5.5 | `claude-opus-5-5` | Tutkimus: seuraavan sukupolven Opus |
| `claude-sonnet` | 5.5 | `claude-sonnet-5-5` | Tutkimus: nopeampi päivitys Sonnet 5:een |

`gpt-6-sol` ja `gpt-6-luna` ovat oletuslistalla, koska ARCH laittaa ne GPT-6-perheeseen. Niiden listan `cost` (0.000001) ei ole token-hinta. Sitä ei näytetä käyttäjälle.

## 2. Nykytila

Lähde: `TEAM-LLM/research-codebase.md`.

Rekisteröityjä text/chat-LLM-rivejä on nolla. `packages/studio/src/models.js` on auto-generoitu mediakatalogi (257 riviä: t2i, t2v, i2i, i2v, v2v, lipsync, recast, audio). `src/lib/models.js` vain uudelleenvie sen. Eksportteja `llmModels`, `textModels` tai `chatModels` ei ole.

Ainoa tekstikutsu:

`src/components/DirectorStudio.js` → `src/lib/directorPlanner.js` (`runPass1Screenplay`, `runPass2Shots`, `runPass3Polish`, `planShortFilm`) → `MuapiClient.callLLM` tiedostossa `src/lib/muapi.js` → `POST /api/v1/any-llm`.

Body on `prompt` ja oletus-`system_prompt`. `options.model` on tuettu, mutta yksikään kutsuja ei aseta sitä. `useCase` menee vain lokiin. Web-client `packages/studio/src/muapi.js` ei sisällä `callLLM`ia. Director ei ole web-kuoressa `components/StandaloneShell.js`.

`src/lib/directorModels.js` valitsee still- ja video-mallit (`nano-banana-2`, Seedance). Se ei valitse LLM:ää.

Nämä näyttävät nimessä LLM:ltä ja ovat jo mediassa. Niitä ei lasketa text-LLM:iksi eikä lisätä tähän suunnitelmaan: Qwen Image -rivit, Grok Imagine, GPT Image, Sora, Nano Banana. Paikallinen Qwen3-4B (`electron/lib/modelCatalog.js`, id `__llm__`) on sd.cpp-tekstienkooderi, ei MuAPI-chat.

Web Agents ja Design Agent puhuvat erillisten proxien kautta. Agenttipaketin lähde (`packages/Open-Poe-AI`) ei ole tässä checkoutissa. Niiden mallilistaa ei päivitetä tästä reposta.

## 3. MuAPI:n uudet ja puuttuvat LLM:t

Lähde jokaiselle riville: `TEAM-LLM/research-muapi.md` (katalogi `GET https://api.muapi.ai/api/v1/models`, vastauksen `Date: Sun, 04 Oct 2026 14:15:12 GMT`). Puute: `TEAM-LLM/research-codebase.md` (ei katalogiriviä, ei `model`-kenttää kutsussa).

Slug-sarake on polun loppu (`POST /api/v1/{slug}`), paitsi gateway-taulukossa, jossa arvo on `any-llm`-skeeman `model`-enum eikä oma endpoint. Enum-arvoja ei keksitty: ne on kopioitu tutkimuksen haetusta skeemasta.

Prioriteetti:

- **P1** — ARCH:n oletusvalitsin. Toteutetaan sprinteissä 1–2.
- **P2** — tutkimus vahvistaa, omaa slugia ei ole, ja malli on ainoa polku kyseiseen perheeseen. Ei oletusvalitsimeen tässä toimituksessa.
- **P3** — tutkimus vahvistaa puuttuvaksi. ARCH rajaa oletuslistan ulkopuolelle. Ei entryä `llmModels.js`:ään tässä suunnitelmassa.

### P1 — oletusvalitsin (22 slugia)

`transport` on `slug`. `endpoint` on slug. Bodyyn ei laiteta `model`-kenttää. `image_url`ia ei lähetetä Directorista: täyttä input-skeemaa ei ole haettu näille, ja Directorin passit eivät anna kuvaa.

| Malli | Slug | Tyyppi | Miksi | Prioriteetti | Lähde | Luotettavuus |
|---|---|---|---|---|---|---|
| GPT-6 Astra | `gpt-6-astra` | vision | GPT-6-lippulaiva, teksti ja kuva | P1 | research-muapi.md § GPT | keskitaso — skeemaa ei haettu |
| GPT-6.1 Sol | `gpt-6-1-sol` | vision | Agenttikoodaus, noin viidesosa Astran token-hinnasta | P1 | research-muapi.md § GPT | keskitaso — skeemaa ei haettu |
| GPT-6 Sol | `gpt-6-sol` | chat | Koodaus ja agentit; ARCH:n GPT-6-moodi Sol | P1 | research-muapi.md § GPT | matala — listan `cost` 0.000001, ei kuvakenttää |
| GPT-6 Luna | `gpt-6-luna` | chat | Nopea volyymiteksti; ARCH:n GPT-6-moodi Luna | P1 | research-muapi.md § GPT | matala — sama `cost` 0.000001 |
| GPT-5.6 Sol | `gpt-5-6-sol` | vision | 5.6-lippulaiva | P1 | research-muapi.md § GPT | keskitaso |
| GPT-5.6 Terra | `gpt-5-6-terra` | vision | 5.6-tasapainomalli | P1 | research-muapi.md § GPT | keskitaso |
| GPT-5.6 Luna | `gpt-5-6-luna` | vision | 5.6-nopea malli | P1 | research-muapi.md § GPT | keskitaso |
| GPT-5.5 | `gpt-5-5` | vision | Lippulaiva vaikeisiin tehtäviin | P1 | research-muapi.md § GPT | keskitaso — tiedostokenttä ei näy `input_fields`-listassa |
| Claude Fable 5 | `claude-fable-5` | vision | Kuvaus: latest flagship | P1 | research-muapi.md § Claude | keskitaso |
| Claude Fable 5.1 | `claude-fable-5-1` | vision | Uudempi lippulaiva, 1M, extended thinking | P1 | research-muapi.md § Claude | keskitaso |
| Claude Opus 5.5 | `claude-opus-5-5` | vision | Seuraavan sukupolven Opus | P1 | research-muapi.md § Claude | keskitaso |
| Claude Opus 5 | `claude-opus-5` | vision | Opus-lippulaiva | P1 | research-muapi.md § Claude | keskitaso |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | vision | Nopeampi päivitys Sonnet 5:een | P1 | research-muapi.md § Claude | keskitaso |
| Claude Sonnet 5 | `claude-sonnet-5` | vision | Tasapainolippulaiva | P1 | research-muapi.md § Claude | keskitaso |
| Gemini 3.8 Flash | `gemini-3-8-flash` | vision | Nopea multimodaali, extended reasoning | P1 | research-muapi.md § Gemini | keskitaso — kalliimpi kuin 3.5–3.7 Flash |
| Gemini 3 Pro | `gemini-3-pro` | vision | Vahva multimodaalinen päättely | P1 | research-muapi.md § Gemini | keskitaso |
| Gemini 3.1 Pro | `gemini-3-1-pro` | vision | Suunnittelu, koodi, monikierros | P1 | research-muapi.md § Gemini | keskitaso — rinnakkain `gemini-3-pro` kanssa |
| Grok 4.7 | `grok-4-7` | vision | Grok-sarjan ylin slug | P1 | research-muapi.md § Grok | keskitaso — sama sapluuna kuin 4.3–4.6 |
| Kimi K3 | `kimi-k3` | vision | Ainoa Kimi, 1M-konteksti | P1 | research-muapi.md § Kimi | keskitaso — skeemaa ei haettu |
| DeepSeek V4 Pro | `deepseek-v4-pro` | vision | Lippulaiva, matematiikka ja päättely | P1 | research-muapi.md § DeepSeek | keskitaso — konteksti-ikkunaa ei kerrota |
| DeepSeek V4.1 Flash | `deepseek-v4-1-flash` | vision | 1M-konteksti, `reasoning_effort` | P1 | research-muapi.md § DeepSeek | keskitaso |
| DeepSeek V4 Flash | `deepseek-v4-flash` | vision | Matala latenssi | P1 | research-muapi.md § DeepSeek | keskitaso |

Nämä 22 eivät ole `any-llm`-enumissa. Niitä ei lähetetä gatewayn `model`-kentässä.

### P2 — ei omaa slugia, ei oletusvalitsinta

ARCH: vanha reititin ei ole oletuschippejä, eikä Llama 4 nouse frontier-perheiden edelle. Qwen3-VL on tutkimuksen ainoa virallinen Qwen-vision ja vain `openrouter-vision`-enumissa. `images_list` on pakollinen, joten sitä ei kytketä Directorin tekstipassiin.

| Malli | Slug tai enum | Tyyppi | Miksi | Prioriteetti | Lähde | Luotettavuus |
|---|---|---|---|---|---|---|
| Llama 4 Maverick | `meta-llama/llama-4-maverick` | enum `any-llm` | Ei omaa slugia; ainoa polku | P2 | research-muapi.md § any-llm | korkea enum-arvona (skeema haettu) |
| Llama 4 Scout | `meta-llama/llama-4-scout` | enum `any-llm` | Ei omaa slugia; ainoa polku | P2 | research-muapi.md § any-llm | korkea enum-arvona |
| Llama 3.2 90B Vision | `meta-llama/llama-3.2-90b-vision-instruct` | enum `any-llm` | Ei omaa slugia | P2 | research-muapi.md § any-llm | korkea enum-arvona |
| Qwen3-VL 235B | `qwen/qwen3-vl-235b-a22b-instruct` | enum `openrouter-vision` | Ainoa virallinen Qwen-vision | P2 | research-muapi.md § openrouter-vision | korkea enum-arvona; kuvaus matala |
| OpenRouter Vision | `openrouter-vision` | vision-router | Eri endpoint, `images_list` pakollinen | P2 | research-muapi.md § openrouter-vision | matala kuvaus (kopio `any-llm`:stä) |

`openrouter-vision`-enumin muut arvot (`google/gemini-2.5-flash`, `anthropic/claude-sonnet-4.5`, `openai/gpt-4o`, `x-ai/grok-4-fast`) ovat vanhaa kerrosta tai päällekkäisiä omien slugien kanssa. Niitä ei lisätä omiksi entryiksi.

### P3 — vahvistettu puuttuvaksi, ei tähän valitsimeen

ARCH: ikä on väli tai vanha, kuvaus on sama sapluuna, tehtävä ei ole yleinen chat, tai malli on abliteroitu tai character-chat. Ei Directorin listaan.

| Malli | Slug | Tyyppi | Miksi | Prioriteetti | Lähde | Luotettavuus |
|---|---|---|---|---|---|---|
| GPT-5.4 | `gpt-5-4` | vision | Väli; ARCH jättää oletuksen ulkopuolelle | P3 | research-muapi.md § GPT | keskitaso |
| GPT-5.2 | `gpt-5-2` | vision | Väli | P3 | research-muapi.md § GPT | keskitaso |
| GPT-5 nano | `gpt-5-nano` | vision | Kevyt GPT-5; ei frontier-oletusta | P3 | research-muapi.md § GPT | keskitaso — ei tarkkaa aliversiota |
| GPT-5 mini | `gpt-5-mini` | promptinlaajennin | Kuvaus on kuva- ja videopromptien laajennin, ei yleischat | P3 | research-muapi.md § GPT | matala yleis-LLM:nä |
| GPT Codex | `gpt-codex` | vision-router | Oma slug; sisäiset enum-arvot eivät ole omia slugeja | P3 | research-muapi.md § GPT ja § gpt-codex | korkea skeeman osalta |
| Claude Opus 4.8 | `claude-opus-4-8` | vision | Sama templatti kuin 4.5–4.7 | P3 | research-muapi.md § Claude | matala erottuvuus |
| Claude Opus 4.7 | `claude-opus-4-7` | vision | Sama templatti | P3 | research-muapi.md § Claude | matala erottuvuus |
| Claude Opus 4.6 | `claude-opus-4-6` | vision | Sama templatti | P3 | research-muapi.md § Claude | matala erottuvuus |
| Claude Opus 4.5 | `claude-opus-4-5` | vision | Vanha, sama templatti | P3 | research-muapi.md § Claude | keskitaso slugina, heikko ero 4.x-riveihin |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | vision | Vanhempi kuin Sonnet 5.5; listan `cost` on 1 | P3 | research-muapi.md § Claude | matala hinta |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | vision | Vanha; Sonnet 5.5 on oletuslistalla | P3 | research-muapi.md § Claude | keskitaso |
| Claude Haiku 4.5 | `claude-haiku-4-5` | vision | Nopein Claude, ei frontier-oletusta | P3 | research-muapi.md § Claude | keskitaso |
| Gemini 3.7 Flash | `gemini-3-7-flash` | vision | Tikas 3.8:n alla | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini 3.6 Flash | `gemini-3-6-flash` | vision | Tikas 3.8:n alla | P3 | research-muapi.md § Gemini | matala — hintateksti rikki |
| Gemini 3.5 Flash | `gemini-3-5-flash` | vision | Tikas 3.8:n alla | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini 3 Flash | `gemini-3-flash` | vision | Eri tuote kuin 3.5–3.8 -porras | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini 3.7 Flash OpenAI | `gemini-3-7-flash-openai` | vision | Sama malli kuin 3.7, ei uudempi | P3 | research-muapi.md § Gemini | keskitaso — `messages`-skeemaa ei haettu |
| Gemini 3.6 Flash OpenAI | `gemini-3-6-flash-openai` | vision | Kaksonen | P3 | research-muapi.md § Gemini | matala — rikki hintateksti |
| Gemini 3.5 Flash OpenAI | `gemini-3-5-flash-openai` | vision | Kaksonen | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini 2.5 Pro | `gemini-2-5-pro` | vision | Vanha kerros; oma slug | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini 2.5 Flash | `gemini-2-5-flash` | vision | Vanha kerros; gatewayn oletus on eri tunniste `google/gemini-2.5-flash` | P3 | research-muapi.md § Gemini | keskitaso |
| Gemini audio vision | `gemini-audio-vision` | audio → teksti | Mediapohjainen ymmärrys, enum vain `gemini-2.5-flash` | P3 | research-muapi.md § Gemini media | korkea enum — ei chat-valitsin |
| Gemini video vision | `gemini-video-vision` | video → teksti | Mediapohjainen ymmärrys, enum vain `gemini-2.5-flash` | P3 | research-muapi.md § Gemini media | korkea enum — ei chat-valitsin |
| Grok 4.6 | `grok-4-6` | vision | Tutkimus merkitsee frontieriksi; ARCH: oletuschip vain 4.7, sama sapluuna | P3 | research-muapi.md § Grok | keskitaso |
| Grok 4.5 | `grok-4-5` | vision | Sama sapluuna | P3 | research-muapi.md § Grok | keskitaso |
| Grok 4.3 | `grok-4-3` | vision | Sama sapluuna | P3 | research-muapi.md § Grok | keskitaso |
| DeepSeek R1 Llama 70B | `deepseek-r1-llama-70b-abliterated` | chat | Abliteroitu distill | P3 | research-muapi.md § DeepSeek | keskitaso |
| DeepSeek R1 Qwen 32B | `deepseek-r1-qwen-32b-abliterated` | chat | Abliteroitu distill | P3 | research-muapi.md § DeepSeek | keskitaso |
| Qwen 3.8 27B abliterated | `qwen-3-8-27b-abliterated` | vision | Abliteroitu, ei virallinen instruct | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.8 27B obliterated | `qwen-3-8-27b-obliterated` | vision | Toinen muokkaus samasta pohjasta | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.8 27B Fable | `qwen-3-8-27b-fable` | vision | Character-chat | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.8 27B Queen | `qwen-3-8-27b-queen` | vision | Character-chat | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.5 Blossom | `qwen-3-5-27b-blossom-derestricted` | vision | Derestricted | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.5 Queen | `qwen-3-5-27b-queen-derestricted` | vision | Derestricted | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 3.5 Opus distilled | `qwen-3-5-27b-opus-distilled-derestricted` | vision | Derestricted; “opus” ei ole Anthropic-slug | P3 | research-muapi.md § Qwen | keskitaso |
| Qwen 2.5 32B | `qwen-2-5-32b-abliterated` | chat | Vanha abliteroitu | P3 | research-muapi.md § Qwen | keskitaso |
| Cydonia 24B v4.1 | `cydonia-24b-v4-1` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Aion Llama 3.1 8B | `aion-llama-3-1-8b` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Euryale 70B | `euryale-70b-v2-3` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Eva Llama 3.3 70B | `eva-llama-3-33-70b` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Nevoria R1 70B | `nevoria-r1-70b` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Wayfarer 70B | `wayfarer-70b` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Anubis 70B | `anubis-70b-v1-1` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| Magnum v4 72B | `magnum-v4-72b` | chat | Character-chat | P3 | research-muapi.md § Llama | matala pohjan osalta |
| Stheno 8B | `stheno-8b-v3-2` | chat | Character-chat | P3 | research-muapi.md § Llama | keskitaso |
| MythoMax 13B | `mythomax-13b` | chat | Character-chat, Llama 2 -pohja | P3 | research-muapi.md § Llama | korkea iän osalta |
| Llama 3.3 70B abliterated | `llama-3-3-70b-abliterated` | chat | Abliteroitu | P3 | research-muapi.md § Llama | keskitaso |
| NeuralDaredevil 8B | `neuraldaredevil-8b-abliterated` | chat | Abliteroitu, pohjaa ei nimetä | P3 | research-muapi.md § Llama | matala pohjan osalta |
| GLM 5.3 | `glm-5-3-abliterated` | chat | Abliteroitu | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| GLM 5.3 Flash | `glm-5-3-flash-abliterated` | vision | Abliteroitu | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| GLM 4.6 | `glm-4-6-derestricted-v5` | chat | Derestricted | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| Gemma 4 31B Gembrain | `gemma-4-31b-gembrain-abliterated` | vision | Abliteroitu | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| Gemma 4 31B SDFT | `gemma-4-31b-sdft-abliterated` | vision | Abliteroitu | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| Gemma 4 26B A4B | `gemma-4-26b-a4b-abliterated` | chat | Abliteroitu MoE | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| MiMo V2.6 Flash | `mimo-v2-6-flash-abliterated` | vision | Abliteroitu | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso — valmistajaa ei nimetä |
| Hermes 4 405B | `hermes-4-405b` | chat | Matala kieltäytyminen; ARCH rajaa oletuksen ulkopuolelle | P3 | research-muapi.md § GLM, Gemma, MiMo | keskitaso |
| Venice | `venice-abliterated` | chat | Abliteroitu, pohjaa ei nimetä | P3 | research-muapi.md § GLM, Gemma, MiMo | matala |
| Abliterated | `abliterated-model` | vision | Pohjaa ei nimetä | P3 | research-muapi.md § GLM, Gemma, MiMo | matala |
| Abliterated large | `abliterated-model-large` | chat | Pohjaa ei nimetä | P3 | research-muapi.md § GLM, Gemma, MiMo | matala |
| Abliterated large v2 | `abliterated-model-large-v2` | chat | Pohjaa ei nimetä | P3 | research-muapi.md § GLM, Gemma, MiMo | matala |

`gpt-codex`-skeeman enum (`gpt-5.4-codex`, `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.1-codex`, `gpt-5-codex`) ei ole omia katalogislugeja. Tutkimus toteaa, että `gpt-5.3-codex`, `gpt-5.1-codex` ja pelkkä `gpt-5-codex` eivät ole omia slugeja. Niitä ei lisätä riveinä.

Vanhan `any-llm`-enumin loput arvot ovat P3. Ne eivät ole omia slugeja, ja frontier-slugit eivät kuulu tähän kenttään. Nykyinen Director-kutsu osuu oletukseen `google/gemini-2.5-flash` juuri siksi, ettei `model`-kenttää lähetetä. Sitä oletusta ei rekisteröidä toiseksi entryksi slugiin `gemini-2-5-flash`.

| Enum-arvo | Tyyppi | Miksi | Prioriteetti | Lähde | Luotettavuus |
|---|---|---|---|---|---|
| `anthropic/claude-3.7-sonnet` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `anthropic/claude-3.5-sonnet` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `anthropic/claude-3-haiku` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.5-flash` | enum `any-llm` | Gatewayn nykyinen oletus ilman `model`-kenttää | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.5-pro` | enum `any-llm` | Vanha kerros; oma slug `gemini-2-5-pro` on eri kuljetus | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.5-flash-preview-09-2025` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.0-flash-001` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.0-flash-lite-001` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `google/gemini-2.0-flash-exp:free` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `openai/gpt-4o` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `openai/gpt-4.1` | enum `any-llm` | Vanha kerros | P3 | research-muapi.md § any-llm | korkea enum-arvona |
| `openai/gpt-5-chat` | enum `any-llm` | Ei omaa slugia; GPT-6-perhe kattaa oletusvalitsimen | P3 | research-muapi.md § any-llm | korkea enum-arvona |

## 4. Päivityssuunnitelma sprintteinä

Järjestys on `TEAM-LLM/ARCH.md`: ensin käsin ylläpidetty lista, sitten `callLLM` lukee entryn, sitten valitsin siinä näkymässä joka kutsun tekee. Ei koodia tässä dokumentissa.

### Sprint 1 — lista ja slug-kuljetus

Tiedostot:

- `packages/studio/src/llmModels.js` (uusi, käsin). Vain P1-taulukon 22 entryä. Kentät: `id` (sama kuin slug), `name`, `family`, `modeKey`, `modeLabel`, `transport: "slug"`, `endpoint` (slug). `LLM_FAMILY_PRIORITY` täsmälleen: `gpt-6`, `gpt-5.6`, `gpt-5.5`, `claude-fable`, `claude-opus`, `claude-sonnet`, `gemini-3.8`, `gemini-3-pro`, `grok-4`, `kimi`, `deepseek-v4`.
- `src/lib/llmModels.js` (uusi). Uudelleenvienti: `export * from "studio/src/llmModels.js"`. Sama kuvio kuin `src/lib/models.js`.
- `src/lib/muapi.js`. `callLLM` lukee entryn id:llä. `transport: "slug"` käyttää `POST /api/v1/{endpoint}`, header `x-api-key`, sama poll `predictions/{id}/result` ja sama tekstin purku (`output.text`, `output`, `text`, `response`, `outputs[0]`, `choices[0]`). Body on `prompt` ja nykyinen `system_prompt`. Kenttää `model` ei lähetetä slug-haarassa. Ilman entryä kutsu jää entiselleen: `POST /api/v1/any-llm` ilman `model`-kenttää.

Ei näitä:

- `packages/studio/src/models.js` ja `models_dump.json`. Generointi pyyhkisi käsin lisätyt rivit, ja Image/Video lukevat saman tiedoston.
- `src/lib/models.js` pysyy mediakatalogin uudelleenvientinä.
- `packages/studio/src/muapi.js`. Webillä ei ole tekstikutsujaa, joten `callLLM`ia ei kopioida.
- `src/lib/directorModels.js`. Still- ja video-valinta ei muutu.

### Sprint 2 — perhe/moodi Directorissa

Tiedostot:

- `src/components/DirectorStudio.js`. Valitsin kutsuvan näkymän korttiin (promptin ja passi-nappien yhteyteen). Alkutila on “nykyinen”: kolme passia kutsuvat `callLLM`ia ilman id:tä. Kun käyttäjä valitsee perheen ja moodin, sama id menee kaikkiin kolmeen passiin ja `planShortFilm`-ketjuun.
- `src/lib/directorPlanner.js`. `runPass1Screenplay`, `runPass2Shots`, `runPass3Polish` ja `planShortFilm` välittävät valitun id:n. Ilman id:tä ne eivät aseta `model`-kenttää.
- `packages/studio/src/modelFamilies.js`. Ryhmittelyfunktiota `getFamilies(models, { preferredOrder })` käytetään sellaisenaan. `IMAGE_FAMILY_PRIORITY` ja `VIDEO_FAMILY_PRIORITY` eivät kasva.
- `src/lib/i18n.js`. Vain valitsimen otsikko ja alkutilan nimi, molempiin olemassa oleviin kieliin (sama rakenne kuin `director.title`). `modeLabel`-arvot pysyvät ARCH:n tasoina (Astra, Sol, Luna, 5.1, Flash, Pro, K3). Niitä ei käännetä slugiksi.
- `tests/directorPlanner.test.mjs`. Oletuspolku ei lukitse mallia eikä lähetä `model`-kenttää. Polku, jolle annetaan P1-id, osoittaa slug-endpointtiin.

Valitsimen sopimus on `packages/studio/src/components/FamilyModePicker.jsx` ja `ModeChips`: yksi rivi per `family`, chipit vain kun moodeja on vähintään kaksi. Komponenttia ei syötetä `t2iModels`- tai `t2vModels`-listalla, eikä sitä mountata Image- tai Video-studioon. Director on DOM-rakentaja (`document.createElement`), ei React-puu, joten sama `getFamilies`-tulos piirretään `DirectorStudio.js`:ssä. Uutta picker-tiedostoa ei tehdä web-puolelle.

Chipit piirretään perheille `gpt-6` (4), `gpt-5.6` (3), `claude-fable` (2), `claude-opus` (2), `claude-sonnet` (2), `gemini-3-pro` (2) ja `deepseek-v4` (3). Yhden moodin perheet `gpt-5.5`, `gemini-3.8`, `grok-4` ja `kimi` ovat pelkkä perherivi.

### Sprint 3 — ei laajennusta

P2- ja P3-rivejä ei lisätä `llmModels.js`:ään eikä Directorin valitsimeen. Esteet, jotka sprintin pitää jättää voimaan:

- Frontier-slugia ei kirjoiteta `any-llm`:n `model`-kenttään.
- `openrouter-vision` ja Qwen3-VL jäävät odottamaan näkymää, jolla on `images_list`. Directorin passit eivät sitä lähetä.
- Llama 4 -enum jää odottamaan erillistä päätöstä. Se on eri `transport` (`any-llm`) eikä sekoitu slug-perheen moodiin.
- `gemini-audio-vision` ja `gemini-video-vision` jäävät odottamaan kutsujää, jolla on `audio_url` tai `video_url`.

## 5. Family/mode -valitsin

Valitsin ei ole katalogin text-to-text -dropdown. Yksi perhe on yksi tuote­linja. Moodi on sen linjan taso, ei jokainen puuttuva slug.

`LLM_FAMILY_PRIORITY` (järjestys valitsimessa):

1. `gpt-6` — moodit `astra`, `1-sol`, `sol`, `luna`
2. `gpt-5.6` — moodit `sol`, `terra`, `luna` (eri perhe, jotta nimi Sol/Luna ei ole sama chip kuin GPT-6:ssa)
3. `gpt-5.5` — yksi moodi `standard`, ei chippejä
4. `claude-fable` — moodit `5`, `5-1`
5. `claude-opus` — moodit `5-5`, `5`
6. `claude-sonnet` — moodit `5-5`, `5`
7. `gemini-3.8` — yksi moodi `flash`, ei chippejä
8. `gemini-3-pro` — moodit `pro`, `3-1-pro`
9. `grok-4` — yksi moodi `4-7`, ei chippejä
10. `kimi` — yksi moodi `k3`, ei chippejä
11. `deepseek-v4` — moodit `pro`, `1-flash`, `flash`

Kentät tulevat entryistä (`family`, `modeKey`, `modeLabel`), eivät nimen arvauksesta `modelFamilies.js`:n regex-säännöillä. Gateway-enum ja slug-endpoint ovat eri kuljetus, eivät saman perheen kaksi moodia.

Alkutila ei ole mikään näistä 22:sta. Alkutila on nykyinen gateway-kutsu ilman mallia. Valitsin näkyy, jotta käyttäjä voi vaihtaa. Vaihto ei ole oletus.

## 6. Out of scope

- Uusi Text-, Chat- tai Assistant-studio. `app/assistant/page.js` jää ohjaukseksi polkuun `/studio`. Ei uutta välilehteä `src/main.js`:ssä eikä `components/StandaloneShell.js`:ssä.
- Explore-malliselain. Web-kuoren Explore Apps -pinta jää ennalleen. LLM-listaa ei viedä sinne.
- Image-, video- ja audiogeneraattorit, mukaan lukien jo kytketyt Qwen Image, Grok Imagine, GPT Image, Sora ja Nano Banana.
- Paikallinen Qwen3-4B-enkooderi (`electron/lib/modelCatalog.js`, `electron/lib/localInference.js`).
- Agenttien mallilista (`app/agents/[agent_id]/AgentChatClient.js`, `packages/studio/src/components/AgentStudio.jsx`, `src/components/AgentStudio.js`). Lähdepaketti puuttuu checkoutista.
- `messages`-taulukko ja `/{slug}/stream`. Katalogissa ei ole `messages`-kenttää. Kolme Gemini `-openai` -slugia ei saa messages-clienttiä: skeemaa ei haettu.
- `packages/studio/src/models.js`:n regenerointi MuAPI-dumpista.
- Web-clientin `callLLM`, kunnes jollain web-näkymällä on kutsuja. Proxy `app/api/api/v1/[[...path]]/route.js` on jo olemassa.
- Rajatapaukset, jotka tutkimus erottaa yleischatista: `generate-social-video-script`, `moderate-text`, `molmo2-video-captioner`, `seo-ai-response`, `research-web-answer`.
- Katalogissa olemattomat tunnisteet. Niitä ei lisätä, koska tutkimuksessa ei ole slugia eikä enum-arvoa: Mistral, Mixtral, Cohere Command, Amazon Nova, virallinen Qwen-instruct ilman abliterointia (poikkeus P2: Qwen3-VL enumissa), virallinen Llama-instruct muuten kuin P2-enumissa, Perplexity `sonar-reasoning-pro`, sekä kuvauksessa mainitut mutta enumista puuttuvat `deepseek/deepseek-r1`, `google/gemini-pro-1.5`, `anthropic/claude-3-5-haiku`, `openai/o3`, pelkkä `gpt-5`.
- P3-taulukon mallit ja `gpt-codex`-enumin sisäiset nimet omina slugeina.

## 7. Riskit

- `any-llm` hylkää `model`-arvon, joka ei ole enumissa. P1-slugit kulkevat omassa polussa. Niiden työntäminen gatewayn `model`-kenttään rikkoo kutsun.
- `gpt-6-sol` ja `gpt-6-luna` ovat oletuslistalla, mutta tutkimuksen luotettavuus niille on matala (`cost` 0.000001). Hintaa ei lueta listan `cost`-kentästä. Sama varaus koskee koko katalogia: `cost` ei ole token-hinta (`claude-sonnet-4-6` listan `cost` 1, `gemini-3-6-flash` hintateksti rikki). Token-hinnat ovat kuvauksia, eikä niitä varmennettu valmistajalta.
- Useimmille P1-slugeille ei haettu täyttä input-skeemaa. Ensimmäinen kutsu lähettää vain `prompt` ja `system_prompt`. `image_url`, `reasoning_effort` ja sampling-kentät jäävät pois, kunnes skeema on haettu.
- Vastauksen tekstikenttä vaihtelee. Slug-haara käyttää `callLLM`:n nykyistä purkua, ei mediapolun kuva-URLia.
- Kaksi clienttiä. Tekstikutsu elää `src/lib/muapi.js`:ssä. `packages/studio/src/muapi.js` ei saa rinnakkaista toteutusta tässä toimituksessa.
- `any-llm`-kuvauksen premium-lista ja enum eivät täsmää. Kuvauksessa olevia id:itä, joita enumissa ei ole, ei lähetetä.
- `openrouter-vision`-kuvaus on kopio, ja `images_list`-teksti puhuu image-to-videosta. Endpointtia ei käytetä ilman erillistä kuvasyötettä.
- Agenttichatin mallilistaa ei voitu lukea (`packages/Open-Poe-AI` puuttuu). Päätös jättää agentit rauhaan perustuu siihen ja proxyn rajaan.
- Directorin oletuksen muuttaminen vahingossa (esivalittu P1-slug) vaihtaisi kaikkien nykyisten käyttäjien käsikirjoitus-, otos- ja polish-passit. Alkutila ilman id:tä estää sen.
- `FamilyModePicker` olettaa image- tai video-prioriteetin, jos `preferredOrder` puuttuu. Directorin valitsin välittää `LLM_FAMILY_PRIORITY`. LLM-perheitä ei lisätä image- tai video-listoihin.
- Abliteroidut ja character-chat -mallit ovat enabled katalogissa. Niiden tuominen Directorin käsikirjoituspassiin muuttaisi tuotteen rajauksen. Ne jäävät P3:een.

## 8. Lähteet

- `TEAM-LLM/research-muapi.md` — live-katalogi `GET https://api.muapi.ai/api/v1/models`, HTTP 200, `Date: Sun, 04 Oct 2026 14:15:12 GMT`. 765 mallia, joista 84 chat/LLM/vision-endpointtia. Skeema haettu erikseen: `any-llm`, `openrouter-vision`, `gpt-codex`, `gemini-audio-vision`, `gemini-video-vision`, `seo-ai-response`. Muilla riveillä vain listan `input_fields` ja kuvaus.
- `TEAM-LLM/research-codebase.md` — 2026-10-04. Ei rekisteröityä text-LLM:ää. Ainoa kutsu `POST /api/v1/any-llm` ilman `model`-kenttää, vain Electronin Director.
- `TEAM-LLM/ARCH.md` — 2026-10-04. Entryt tiedostoon `packages/studio/src/llmModels.js`, kaksi kuljetusta, oletuslista 22 slugia, `LLM_FAMILY_PRIORITY`, vanha enum ja abliteroidut rajattu oletusvalitsimen ulkopuolelle.
