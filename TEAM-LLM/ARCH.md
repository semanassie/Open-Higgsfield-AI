# ARCH — miten uusi MuAPI LLM lisätään

Tech reviewer, 2026-10-04. Perustuu koodiin, `TEAM-LLM/research-codebase.md`:hen ja `TEAM-LLM/research-muapi.md`:hen (katalogi `GET https://api.muapi.ai/api/v1/models`, 2026-10-04). Slugit alla ovat vain tutkimuksen vahvistamia. Abliteroituja ja character-chat -malleja ei oteta oletuslistaan: tutkimus kuvaa ne erillisenä lohkona, ei perusteena Directorin valitsimeen.

Tämä ei ole päivityssuunnitelma. Se sanoo, mihin entry koskee ja mitä ei rakenneta.

## Lähtökohta

Ratkaisussa ei ole text/chat-katalogia. `packages/studio/src/models.js` on auto-generoitu media­katalogi (`t2i` / `t2v` / `i2i` / `i2v` / `v2v` / lipsync / recast / audio, 257 riviä). `src/lib/models.js` vain uudelleenvie sen.

Ainoa tekstikutsu on Electronin Director:

`DirectorStudio.js` → `directorPlanner.js` (`planShortFilm` ja kolme passia) → `MuapiClient.callLLM` tiedostossa `src/lib/muapi.js` → `POST /api/v1/any-llm`.

Kukaan ei välitä `options.model`. `useCase` menee vain lokiin. Web-client `packages/studio/src/muapi.js` ei sisällä `callLLM`ia. Director ei ole web-kuoressa (`components/StandaloneShell.js`).

## Minne uudet LLM-entryt

**Tiedosto:** `packages/studio/src/llmModels.js` (käsin ylläpidetty).

Älä lisää rivejä `packages/studio/src/models.js`:ään. Tiedoston ensimmäinen rivi sanoo, että se generoidaan `models_dump.json`:sta. Generointi pyyhkii käsin lisätyt rivit, ja Image/Video-studio lukee omat taulukkonsa samasta tiedostosta.

Electron näkee listan samalla kuviolla kuin median: lisää `src/lib/llmModels.js`, joka tekee `export * from "studio/src/llmModels.js"`. `src/lib/models.js` jää media­katalogin uudelleenvienniksi.

Yksi entry, ei enempää kenttiä kuin kutsu tarvitsee:

- `id` — valitsimen avain
- `name` — näyttönimi
- `family`, `modeKey`, `modeLabel` — vain jos saman perheen variantteja on useampi (alla)
- `transport` — `"any-llm"` tai `"slug"`
- `model` — vain kun `transport` on `any-llm` (gatewayn `model`-kentän arvo)
- `endpoint` — vain kun `transport` on `slug` (polun loppu, ilman `/api/v1/`)
- valinnaiset input-avaimet, jotka skeema oikeasti vaatii (`system_prompt`, `image_url`, `max_tokens`, …)

`callLLM` lukee entryn id:llä. Directorin oletus säilyy: ei entryä, ei `model`-kenttää, sama `any-llm`-kutsu kuin nyt. Uusi malli ei vaihda oletusta, ennen kuin joku passi välittää id:n.

Web-clientiin ei kopioida `callLLM`ia, ennen kuin jollain web-näkymällä on kutsuja. Nextin proxy `app/api/api/v1/[[...path]]/route.js` välittää polun jo valmiiksi, jos kutsu joskus tehdään selaimesta (`/api/api/v1/...` → `https://api.muapi.ai/api/v1/...`).

## Text/Chat-studio vai agenttien mallilista

Ei uutta Text- eikä Chat-studiota.

Agenttien mallilista ei ole tämä lisäyskohta.

- Web-chat on paketti `ai-agent` (`app/agents/[agent_id]/AgentChatClient.js`). Lähde olisi `packages/Open-Poe-AI/packages/agents`. Hakemistoa ei ole tässä checkoutissa, joten listaa ei voi muokata tästä reposta.
- Selain puhuu `app/api/agents/...` → `https://api.muapi.ai/agents/...` ja `creative-agent`-proxyn kautta. Se ei lue `models.js`:ää eikä `callLLM`ia.
- `packages/studio/src/components/AgentStudio.jsx` listaa templaatit, omat agentit ja keskustelut. Ei LLM-entryjä.
- Electronin `src/components/AgentStudio.js` on tynkä (`agents.webOnly`).

Directorin kolme passia ovat ainoa kytketty tekstinkäyttö. Niihin riittää entry + `callLLM`:n id. Käyttäjälle näkyvä valinta on perhe/moodi-valitsin siinä näkymässä, joka kutsun tekee — ei uusi välilehti.

`app/assistant/page.js` ohjaa jo `/studio`-polkuun. Sitä ei herätetä chat-studioksi.

## API-kutsumalli

Kaksi kuljetusta, yksi funktio. Body on aina `prompt` + valinnainen `system_prompt`. Ei `messages`-taulukkoa. Skeemassa ei ole `messages`-kenttää.

Poll ja tekstin luku pysyvät nykyisessä `callLLM`:ssä: `predictions/{id}/result`, sitten `output.text` / `output` / `text` / `response` / `outputs[0]` / `choices[0]`.

### 1. Gateway `any-llm`

Nykyinen kutsu. URL `POST /api/v1/any-llm`. Body:

- `prompt` (pakollinen)
- `system_prompt`
- `model` vain jos entryn `transport` on `any-llm`
- valinnaiset `reasoning`, `priority`, `temperature`, `max_tokens` vain jos entry ne asettaa

`model` on suljettu enum (provider/malli -merkkijonoja, noin 15 arvoa skeemassa). Tuntematon slug ei kuulu tähän kenttään. Oletuskutsu ilman `model`-kenttää jätetään ennalleen.

Electron DEV: `baseUrl` tyhjä, Vite proxaa `/api`. Muuten `https://api.muapi.ai`.

### 2. Oma slug

Katalogin text-generation -endpointit (oma `/api/v1/{slug}`) eivät ole gatewayn enum. Niitä ei työnnetä `any-llm`:n `model`-kenttään.

URL `POST /api/v1/{endpoint}`. Sama header `x-api-key`, sama poll kuin media­jobissa (`submitAndPoll` / `pollForResult`). Ero mediaan: vastauksesta otetaan teksti, ei `outputs[0]`-kuva-URLia, jos kenttä on merkkijono. `callLLM`:n nykyinen purku tekee tämän jo gatewaylle; slug-haara käyttää samaa purkua.

Slug-bodyn vähimmäis­kentät ovat `prompt` ja tarvittaessa `system_prompt`. `image_url` on vision-syöte samassa tekstikutsussa, ei kuvagenerointia. Sitä ei lähetetä, jos entryn skeema ei sitä määritä.

`openrouter-vision` on eri endpoint (`images_list` pakollinen). Tutkimus merkitsee sen vision-LLM:ksi, mutta se ei ole oletus­gateway. Kuvagenerointi ei. Enum on slug-osion vanhassa kerroksessa.

## Family / mode

Valitsin vain, jos käyttäjä valitsee mallin. Directorin oletus ei tarvitse valitsinta.

Käytä olemassa olevaa `FamilyModePicker`ia ja `modelFamilies.js`:n kenttiä (`family`, `modeKey`, `modeLabel`). Syötä sille `llmModels`, älä `t2iModels` / `t2vModels`. Oma järjestys­taulukko (esim. `LLM_FAMILY_PRIORITY`) samassa `llmModels.js`:ssä. `IMAGE_FAMILY_PRIORITY` ja `VIDEO_FAMILY_PRIORITY` eivät kasva.

Sääntö: yksi perhe = yksi tuote­linja tutkimuksen frontier-kappaleesta. Moodi­chip = sen linjan taso (astra / sol / luna, fable 5 vs 5.1, pro vs flash). Jokainen slug ei ole oma perhe. Jos perheessä on yksi entry, chippejä ei piirretä (`ModeChips` tekee tämän jo, kun moodeja on alle kaksi). Konkreettiset perheet ja moodit ovat slug-taulukossa.

Gatewayn enum ja omat slugit ovat eri `transport`. Niitä ei sekoiteta samaan moodiin. `any-llm`-enum on vanha kerros; frontier-slugit eivät ole siinä enumissa (`research-muapi.md`, Lead-kohta 1).

## Mitä ei tehdä

- Ei dumpata katalogin text-to-text -rivejä dropdowniin. Kategoria sisältää SEO-, enrichment- ja finance-työkaluja, jotka eivät ole chat-LLM:iä. Ei abliteroituja eikä character-chat -slugeja oletuslistaan. Tutkimus nimeää ne (Qwen-, Llama-, GLM-, Gemma-, MiMo- ja DeepSeek-R1-ablat, `llama-character-chat`, `cydonia-character-chat`, `qwen-character-chat`) mutta ei perustele niitä Directorin valitsimeen. `hermes-4-405b` ja `venice-abliterated` jäävät samaan rajaukseen.
- Ei image- eikä video­generointimalleja tähän listaan. `research-codebase.md` nimeää jo kytketyt, jotka näyttävät LLM:ltä mutta ovat mediaa: Qwen Image, Grok Imagine, GPT Image, Sora, Nano Banana. Ne jäävät `models.js`:ään.
- Ei paikallista Qwen3-4B-enkooderia (`electron/lib/modelCatalog.js`, `__llm__`, sd.cpp `--llm`). Se ei ole MuAPI-chat.
- Ei uutta studiovälilehteä, ei `messages`-clienttiä, ei stream-clienttiä (`/stream`), ei toista HTTP-luokkaa.
- Ei agentti­paketin mallilistaa tästä reposta, kun alimoduuli puuttuu.
- Ei `models.js`:n regenerointia koko MuAPI-dumpista LLM-lisäyksen vuoksi.

## Slugit (vain `research-muapi.md`)

Oletuslista on tutkimuksen frontier-kerros, omina slugeina. `transport` on `slug`: `endpoint` = slug, URL `POST /api/v1/{slug}`. Bodyyn ei laiteta `model`-kenttää. `image_url` vain kun tyyppi on vision. Kaikki nämä ovat tutkimuksessa `text-generation`, enabled, eivät `any-llm`-enumissa.

`LLM_FAMILY_PRIORITY` oletusvalitsimessa: `gpt-6`, `gpt-5.6`, `gpt-5.5`, `claude-fable`, `claude-opus`, `claude-sonnet`, `gemini-3.8`, `gemini-3-pro`, `grok-4`, `kimi`, `deepseek-v4`.

### Oletus: frontier-slugit

| family | modeKey | modeLabel | slug | tyyppi |
|---|---|---|---|---|
| `gpt-6` | `astra` | Astra | `gpt-6-astra` | vision |
| `gpt-6` | `1-sol` | 1 Sol | `gpt-6-1-sol` | vision |
| `gpt-6` | `sol` | Sol | `gpt-6-sol` | chat |
| `gpt-6` | `luna` | Luna | `gpt-6-luna` | chat |
| `gpt-5.6` | `sol` | Sol | `gpt-5-6-sol` | vision |
| `gpt-5.6` | `terra` | Terra | `gpt-5-6-terra` | vision |
| `gpt-5.6` | `luna` | Luna | `gpt-5-6-luna` | vision |
| `gpt-5.5` | `standard` | Standard | `gpt-5-5` | vision |
| `claude-fable` | `5` | 5 | `claude-fable-5` | vision |
| `claude-fable` | `5-1` | 5.1 | `claude-fable-5-1` | vision |
| `claude-opus` | `5-5` | 5.5 | `claude-opus-5-5` | vision |
| `claude-opus` | `5` | 5 | `claude-opus-5` | vision |
| `claude-sonnet` | `5-5` | 5.5 | `claude-sonnet-5-5` | vision |
| `claude-sonnet` | `5` | 5 | `claude-sonnet-5` | vision |
| `gemini-3.8` | `flash` | Flash | `gemini-3-8-flash` | vision |
| `gemini-3-pro` | `pro` | Pro | `gemini-3-pro` | vision |
| `gemini-3-pro` | `3-1-pro` | 3.1 Pro | `gemini-3-1-pro` | vision |
| `grok-4` | `4-7` | 4.7 | `grok-4-7` | vision |
| `kimi` | `k3` | K3 | `kimi-k3` | vision |
| `deepseek-v4` | `pro` | Pro | `deepseek-v4-pro` | vision |
| `deepseek-v4` | `1-flash` | 1 Flash | `deepseek-v4-1-flash` | vision |
| `deepseek-v4` | `flash` | Flash | `deepseek-v4-flash` | vision |

Yhden moodin perheet (`gpt-5.5`, `gemini-3.8`, `grok-4`, `kimi`) eivät piirrä chippejä. GPT-6, GPT-5.6, Claude-linjat, Gemini 3 Pro ja DeepSeek V4 piirtävät.

GPT-5.6 ja GPT-5.5 ovat tutkimuksen frontier-kappaleessa GPT-6:n kanssa, eri perheenä, jotta 6:n ja 5.6:n Sol/Luna eivät ole sama chip. Claude 5 ja 5.5 ovat tutkimuksessa frontier; 4.x ei ole tässä taulukossa. Gemini-oletus on 3.8 Flash; Pro-pari on samassa frontier-kappaleessa eri perheenä. Grok-oletus on vain 4.7.

### Vanha reititin, ei oletuschippejä

`any-llm` on eri kuljetus. Nämä eivät ole omia slugeja. Entry: `transport: "any-llm"`, `model` = enum-arvo, URL pysyy `POST /api/v1/any-llm`. Oletus ilman `model`-kenttää on tutkimuksen mukaan `google/gemini-2.5-flash`. Älä lähetä frontier-slugia tähän kenttään.

| family | modeKey | model (enum) |
|---|---|---|
| `any-llm-anthropic` | `3.7-sonnet` | `anthropic/claude-3.7-sonnet` |
| `any-llm-anthropic` | `3.5-sonnet` | `anthropic/claude-3.5-sonnet` |
| `any-llm-anthropic` | `3-haiku` | `anthropic/claude-3-haiku` |
| `any-llm-google` | `2.5-flash` | `google/gemini-2.5-flash` |
| `any-llm-google` | `2.5-pro` | `google/gemini-2.5-pro` |
| `any-llm-google` | `2.5-flash-preview` | `google/gemini-2.5-flash-preview-09-2025` |
| `any-llm-google` | `2.0-flash` | `google/gemini-2.0-flash-001` |
| `any-llm-google` | `2.0-flash-lite` | `google/gemini-2.0-flash-lite-001` |
| `any-llm-google` | `2.0-flash-exp` | `google/gemini-2.0-flash-exp:free` |
| `any-llm-openai` | `gpt-4o` | `openai/gpt-4o` |
| `any-llm-openai` | `gpt-4.1` | `openai/gpt-4.1` |
| `any-llm-openai` | `gpt-5-chat` | `openai/gpt-5-chat` |
| `any-llm-llama` | `4-maverick` | `meta-llama/llama-4-maverick` |
| `any-llm-llama` | `4-scout` | `meta-llama/llama-4-scout` |
| `any-llm-llama` | `3.2-90b-vision` | `meta-llama/llama-3.2-90b-vision-instruct` |

Llama 4 Maverick ja Scout ovat tutkimuksen mukaan vain tässä enumissa, ei omina slugeina. Ne eivät nouse frontier-perheiden edelle. Kuvauksen premium-id:t, joita enumissa ei ole (`deepseek/deepseek-r1`, `google/gemini-pro-1.5`, `anthropic/claude-3-5-haiku`, `openai/o3`), eivät ole entryjä.

`openrouter-vision` on eri endpoint (`images_list` pakollinen). Ei oletustekstivalitsin. Enum, jos vision-reititin joskus tarvitaan: `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4.5`, `openai/gpt-4o`, `qwen/qwen3-vl-235b-a22b-instruct`, `x-ai/grok-4-fast`. Qwen3-VL 235B on tutkimuksen ainoa virallinen Qwen-vision, ja se on vain tässä enumissa.

### Vahvistettu, ei oletuslistaan

Tutkimus vahvistaa nämä viralliset chat/vision-slugit. Niitä ei laiteta oletusvalitsimeen: ikä on väli tai vanha, tai kuvaus on sama sapluuna kuin uudemmalla rivillä, tai tehtävä ei ole yleinen chat.

- GPT: `gpt-5-4`, `gpt-5-2`, `gpt-5-nano`. `gpt-5-mini` on tutkimuksen mukaan promptinlaajennin kuva- ja videogeneraattoreille, ei yleis-LLM. `gpt-codex` on oma slug, jonka skeema-enum on `gpt-5.4-codex`, `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.1-codex`, `gpt-5-codex`. Nämä enum-arvot eivät ole oletuslistan slugeja. Tutkimus toteaa erikseen, että `gpt-5.3-codex`, `gpt-5.1-codex` ja pelkkä `gpt-5-codex` eivät ole omia katalogislugeja.
- Claude 4.x ja Haiku: `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5`.
- Gemini-tikapuut 3.8:n alla: `gemini-3-7-flash`, `gemini-3-6-flash`, `gemini-3-5-flash`, `gemini-3-flash`, sekä `-openai`-kaksoset `gemini-3-7-flash-openai`, `gemini-3-6-flash-openai`, `gemini-3-5-flash-openai`. Tutkimus sanoo kaksosen samaksi malliksi, ei uudemmaksi; `messages`-skeemaa ei haettu, joten niille ei tehdä messages-clienttiä. Vanha kerros: `gemini-2-5-pro`, `gemini-2-5-flash`.
- Grok saman sapluunan alemmat: `grok-4-6` (tutkimus merkitsee frontieriksi, sama sapluuna kuin 4.7), `grok-4-5`, `grok-4-3`. Oletuschip on silti vain `grok-4-7`.
- Mediaa ymmärtävät, ei chat-valitsin: `gemini-audio-vision`, `gemini-video-vision` (enum vain `gemini-2.5-flash`). Rajatapaukset pois: `generate-social-video-script`, `moderate-text`, `molmo2-video-captioner`, `seo-ai-response`, `research-web-answer`.

Abliteroidut ja character-chat jäävät pois oletuksesta, kuten yllä. Virallista Qwen-, Llama-, Gemma-, GLM- tai MiMo-instruct-slugia ilman abliterointia tutkimuksessa ei ole, lukuun ottamatta `any-llm`- ja `openrouter-vision`-enumeita.

## Riskit

- `any-llm` hylkää `model`-arvon, joka ei ole enumissa. Uusi nimetty malli kulkee slug-haarassa.
- Kaksi clienttiä (`src/lib/muapi.js` ja `packages/studio/src/muapi.js`). Tekstikutsu elää vain ensimmäisessä, kunnes webillä on kutsuja. Älä kahdenna logiikkaa etukäteen.
- Vastauksen tekstikenttä vaihtelee. Purku on jo `callLLM`:ssä; slug-haara ei saa olettaa pelkkää kuva-URLia.
- Agenttichatin mallilistaa ei voitu lukea, koska `packages/Open-Poe-AI` puuttuu. Päätös “ei agenttilistaa” perustuu siihen ja proxyn rajaan, ei paketin lähdekoodiin.
