# MuAPI LLM / text / chat — live-katalogi

**Päivämäärä:** 2026-10-04  
**Lähde:** `GET https://api.muapi.ai/api/v1/models`  
**HTTP:** 200, `Content-Type: application/json`, vastauksen `Date: Sun, 04 Oct 2026 14:15:12 GMT`  
**Vastauksen muoto:** `{ models, total, currency }` — `currency` = `USD`

Täyttä `input_schema`-objektia **ei ole** listavastauksessa (0/87 LLM-rivillä). Skeema haettiin erikseen vain näille: `any-llm`, `openrouter-vision`, `gpt-codex`, `gemini-audio-vision`, `gemini-video-vision`, `seo-ai-response`. Muilla riveillä kentät ovat listan `input_fields` + kuvaus.

Katalogiriveillä ei ole `created_at`-kenttää. “Frontier / vanha” on päätelty slugista ja kuvauksen versiosta, ei julkaisupäivästä. Kuvaukset ovat MuAPI:n omia tekstejä, eikä niitä varmennettu valmistajien julkaisutiedoista.

## Luvut

| Mittari | Määrä |
|---|---|
| Katalogi yhteensä (`total` ja `models.length`) | **765** |
| Kategoria `Text to Text` | **150** (19,6 %) |
| Chat / LLM / vision-language -endpointit (alla) | **84** (11,0 %) |
| Rajatapaukset samassa `Text to Text` -joukossa | **3** |
| `Text to Text`, joka ei ole LLM (SEO, enrichment, finance, ecommerce, Suno, Sora-hahmo) | **63** |

Kaikki 84 + 3 ovat `is_enabled: 1` ja `is_coming_soon: false`. Yksikään tulossa-oleva malli ei ole tekstimalleissa (coming soon -rivit ovat kuva/video-malleja). Kaikilla 87:llä on `dynamic_pricing: true`. Listan `cost` on pieni USD-luku, ei kuvauksen token-hintaa.

`group_of: "text"` on 87 riviä, mutta yksi niistä on `seedance-2-character` (Image to Image). LLM-suodatus tehtiin kategoriasta `Text to Text` ja perheestä, ei `group_of`-kentästä.

## Rajapinnan muoto

Yhteinen kuvio on yhden kierroksen generointi: `prompt` ja usein `system_prompt`. Listassa ei ole kenttää `messages` yhdelläkään mallilla, joten tämä ei ole OpenAI Chat Completions -viestilista.

Monen frontier-kuvauksen mukaan samalla slugilla on myös SSE-polku `/{slug}/stream`. Stream-polut eivät ole erillisiä katalogirivejä, eikä niiden skeemaa haettu.

Tyypit taulukoissa:

- **chat** — vain teksti
- **vision** — teksti + `image_url` tai `images_list`
- **router** — `model`-enum valitsee taustamallin
- **audio** / **video** — mediatiedosto + prompt, vastaus on tekstiä

## Puuttuvat perheet

Näitä **ei ole** omina chat-slugeina eikä haetuissa enumeissa: Mistral, Mixtral, Cohere Command, Amazon Nova, virallinen ei-abliteroitu Qwen-instruct (poikkeus: yksi VL-id `openrouter-vision`-enumissa), virallinen Llama-instruct (Llama 4 ja Llama 3.2 Vision ovat vain `any-llm`-enumissa).

Perplexity `sonar-reasoning-pro` esiintyy vain SEO-työkalun `seo-ai-response` enumissa, ei chat-endpointtina.

---

## Yhteenveto: frontier vs vanha

Katalogin korkeimmat versiot (kuvauksen mukaan, skeemaa ei haettu ellei toisin mainita):

- **GPT-6:** `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-6-1-sol` sekä **GPT-5.6** `sol` / `terra` / `luna` ja **GPT-5.5**
- **Claude:** `claude-fable-5`, `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`
- **Gemini:** `gemini-3-8-flash` (kuvaus: extended reasoning + tool use), sitten 3.7 / 3.6 / 3.5 Flash ja `gemini-3-pro` / `gemini-3-1-pro`
- **Grok:** `grok-4-7` (sarjassa 4.3–4.7)
- **Kimi:** `kimi-k3` (ainoa; kuvaus 2.8T MoE, 1M konteksti)
- **DeepSeek:** `deepseek-v4-pro`, `deepseek-v4-1-flash`, `deepseek-v4-flash`
- **Muut uudet nimet, vain muokattuina:** GLM 5.3, Gemma 4, Qwen 3.8 27B, MiMo V2.6 Flash

Vanhempi kerros on yhä enabled: Gemini 2.5, Claude Haiku/Sonnet/Opus 4.5, Llama 2/3.x -roolipelifinetunet, DeepSeek R1 -distillaatiot. Reititin `any-llm` on tätä vanhempi: Claude 3.x, GPT-4o / GPT-4.1, Gemini 2.0/2.5, Llama 4.

---

## GPT (OpenAI) — 13 omaa slugia

Perhe katalogissa: `text-generation`. Valmistajaksi kuvaus nimeää OpenAI:n.

| slug | tyyppi | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|
| `gpt-6-astra` | vision | frontier | Kuvaus: GPT-6-lippulaiva, teksti+kuva+tiedosto, web-haku, reasoning effort. Token-hinta kuvauksessa $10 / $50 per M | keskitaso — skeemaa ei haettu; listan `cost` 0.0008 |
| `gpt-6-1-sol` | vision | frontier | Kuvaus: GPT-6 Solin ja Lunaan välissä, agenttikoodaus ja computer-use, 1/5 Astran token-hinnasta ($2 / $10) | keskitaso — skeemaa ei haettu |
| `gpt-6-sol` | chat | frontier | Kuvaus: koodaus, päättely, agentit. Token-hinta $2 / $10, cache-hinnat mukana | matala — inputeissa ei kuvaa vaikka 6.1 Solilla on; listan `cost` 0.000001 |
| `gpt-6-luna` | chat | frontier | Kuvaus: nopea volyymiteksti. Token-hinta $0.10 / $0.50 | matala — sama `cost` 0.000001; ei kuvaa |
| `gpt-5-6-sol` | vision | frontier | Kuvaus: 5.6-lippulaiva, matematiikka, koodi, tiede. $10 / $60 | keskitaso |
| `gpt-5-6-terra` | vision | frontier | Kuvaus: 5.6 tasapainomalli, bisnes ja analyysi. $5 / $30 | keskitaso |
| `gpt-5-6-luna` | vision | frontier | Kuvaus: 5.6 nopea malli. $2 / $12 | keskitaso |
| `gpt-5-5` | vision | frontier | Kuvaus: lippulaiva vaikeisiin tehtäviin, kuva ja tiedosto, web-haku. $2.40 / $16 | keskitaso — tiedostokenttä ei näy `input_fields`-listassa (`prompt`, `image_url`, `system_prompt`, `web_search_switch`, `reasoning_effort`) |
| `gpt-5-4` | vision | väli | Kuvaus: päättely, koodi, ammattityö; async + `/stream`. $1.25 / $9 | keskitaso — listassa vain `prompt` ja `image_url`, ei reasoning-kenttää |
| `gpt-5-2` | vision | väli | Kevyt päättelymalli, web-haku ja reasoning effort. $1.25 / $9 | keskitaso |
| `gpt-codex` | vision + router | väli | Koodaus. Skeeman enum: `gpt-5.4-codex`, `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.1-codex`, `gpt-5-codex`. $1.25 / $9, async + stream kuvauksessa | korkea skeeman osalta — 5.3-, 5.1- ja pelkkä `gpt-5-codex` eivät ole omia slugeja |
| `gpt-5-nano` | vision | väli | Kuvaus: kevyt nopea GPT-5-teksti (kirjoitus, yhteenveto, dialogi, koodi) | keskitaso — “GPT-5-perhe”, ei tarkkaa aliversiota |
| `gpt-5-mini` | chat | epäselvä | Kuvaus on promptinlaajennin kuva- ja videogeneraattoreille, ei yleinen chat | matala yleis-LLM:nä — eri tehtävä kuin muut GPT-rivit |

`any-llm`-enumissa on lisäksi `openai/gpt-4o`, `openai/gpt-4.1`, `openai/gpt-5-chat`. Ne eivät ole omia slugeja. Kuvaus mainitsee `openai/o3`:n premium-listassa, mutta sitä **ei ole** enumissa.

## Claude (Anthropic) — 13 slugia

Kaikki `text-generation`, kaikki vision (`prompt`, `image_url`, `system_prompt`). Kuvaukset lupaavat async-endpointin ja `/{slug}/stream`. Skeemaa ei haettu.

| slug | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|
| `claude-fable-5` | frontier | Kuvaus: “latest flagship”, teksti+kuva. $8 / $40 | keskitaso |
| `claude-fable-5-1` | frontier | Kuvaus: uudempi lippulaiva, extended thinking aina päällä, 1M konteksti, agenttikoodaus, dokumenttianalyysi. $10 / $50 | keskitaso — listan `cost` 0.0008 |
| `claude-opus-5-5` | frontier | Kuvaus: seuraavan sukupolven Opus, halvempi kuin Opus 5. $4 / $20 | keskitaso |
| `claude-opus-5` | frontier | Kuvaus: lippulaiva, koodi ja multimodaali. $3 / $15 | keskitaso |
| `claude-sonnet-5-5` | frontier | Kuvaus: nopeampi ja halvempi päivitys Sonnet 5:een, koodi ja agentit. $2 / $10 | keskitaso |
| `claude-sonnet-5` | frontier | Kuvaus: tasapainolippulaiva. $3 / $15 | keskitaso |
| `claude-opus-4-8` | väli | Kuvaus: “most capable” koodi ja agentit. $3 / $15 | matala erottuvuus — 4.5 / 4.6 / 4.7 / 4.8 -kuvaukset ovat lähes sama templaatti ja sama token-hinta |
| `claude-opus-4-7` | väli | Sama templatti, $3 / $15 | matala erottuvuus |
| `claude-opus-4-6` | väli | Sama templatti, $3 / $15 | matala erottuvuus |
| `claude-opus-4-5` | vanha | Sama templatti, $3 / $15 | keskitaso slugina, heikko ero uudempiin 4.x-riveihin |
| `claude-sonnet-4-6` | väli | Kuvaus: computer-use, 1M konteksti. Token-hinta $1.80 / $9 | matala hinta — listan `cost` on **1** (muilla Claudella 0.0001–0.001) |
| `claude-sonnet-4-5` | vanha | Kuvaus: koodi, kirjoitus, analyysi. $1.80 / $9 | keskitaso |
| `claude-haiku-4-5` | vanha | Kuvaus: nopein ja halvin Claude. $0.60 / $3 | keskitaso |

`any-llm`-enum (vanhempi kerros, ei omia slugeja): `anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-haiku`.  
`openrouter-vision`-enum: `anthropic/claude-sonnet-4.5`.

## Gemini (Google) — 12 teksti-slugia + 2 media-ymmärrystä

Kaikki tekstirivit ovat vision ja perhettä `text-generation`. Kuvaukset lupaavat async + `/stream`, paitsi jos alla toisin.

| slug | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|
| `gemini-3-8-flash` | frontier | Kuvaus: nopea multimodaali, extended reasoning ja tool use. $2.50 / $12.50 | keskitaso — kalliimpi kuin 3.5–3.7 Flash |
| `gemini-3-7-flash` | frontier | Nopea Flash, $0.60 / $3.60, async + stream | keskitaso |
| `gemini-3-7-flash-openai` | frontier | Sama malli, kuvaus sanoo OpenAI-yhteensopiva. Samat kentät kuin ei-openai-rivillä | keskitaso — erillinen slug, ei uudempi malli; `messages`-skeemaa ei haettu |
| `gemini-3-6-flash` | frontier | Flash-porras 3.6 | matala hinta — kuvauksen token-teksti on rikki: “.60/M input” ja “.60/M output”, dollarimerkki puuttuu |
| `gemini-3-6-flash-openai` | frontier | OpenAI-yhteensopiva kaksonen 3.6:sta | matala — sama rikki hintateksti |
| `gemini-3-5-flash` | frontier | Flash 3.5, $0.60 / $3.60 | keskitaso |
| `gemini-3-5-flash-openai` | frontier | OpenAI-yhteensopiva kaksonen | keskitaso |
| `gemini-3-pro` | frontier | Kuvaus: vahva multimodaalinen päättely. $4 / $24 | keskitaso |
| `gemini-3-1-pro` | frontier | Kuvaus: suunnittelu, koodi, monikierros. $4 / $24, async + stream | keskitaso — rinnakkain `gemini-3-pro` kanssa, eroa ei täsmennetä muuten kuin nimessä |
| `gemini-3-flash` | väli | Function calling ja Google Search -grounding. $0.30 / $1.80 | keskitaso — eri tuote kuin 3.5–3.8 Flash -porras |
| `gemini-2-5-pro` | vanha | Päättely, $1.25 / $10 | keskitaso |
| `gemini-2-5-flash` | vanha | Nopea, $0.30 / $2.50 | keskitaso |

Media (skeema haettu):

| slug | tyyppi | miksi kiinnostava | luotettavuus |
|---|---|---|---|
| `gemini-audio-vision` | audio | Puhe, sävy, tausta, puhujavaihdot. Kentät `model`, `prompt`, `audio_url`, `system_prompt` | korkea enum — ainoa arvo `gemini-2.5-flash` |
| `gemini-video-vision` | video | Liike, sommittelu, ruututeksti | korkea enum — ainoa arvo `gemini-2.5-flash`. Skeeman kuvaus: `gemini-2.5-pro` poistettu enumista, koska Google palauttaa uusille käyttäjille 404 |

`any-llm`-enumissa on myös Gemini 2.0 Flash, 2.0 Flash Lite, 2.0 Flash Exp (free), 2.5 Flash preview 09-2025, 2.5 Pro. Oletus on `google/gemini-2.5-flash`.

## Grok (xAI) — 4 slugia

Kaikki vision, perhe `text-generation`. Kentät: `prompt`, `image_url`, `web_search`, `system_prompt`, `reasoning_effort`. Kuvaus lupaa async + `/stream`.

| slug | ikä | kuvauksen token-hinta (in/out per M) | luotettavuus |
|---|---|---|---|
| `grok-4-7` | frontier | $1.40 / $4.20 — kuvaus: next-generation | keskitaso — teksti on sama sapluuna kuin 4.3–4.6 |
| `grok-4-6` | frontier | $1.50 / $4.50 | keskitaso |
| `grok-4-5` | väli | $1.60 / $4.80 | keskitaso |
| `grok-4-3` | väli | $2.50 / $5.00 | keskitaso |

`openrouter-vision`-enum: `x-ai/grok-4-fast` (ei omaa slugia).

## DeepSeek — 3 frontier-slugia + 2 vanhaa distill-abliterointia

| slug | perhe | tyyppi | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|---|
| `deepseek-v4-pro` | text-generation | vision | frontier | Kuvaus: lippulaiva, koodi, matematiikka, monivaiheinen päättely. Säätimet: temperature, max_tokens, top_p, frequency/presence penalty | keskitaso — konteksti-ikkunaa ei kerrota |
| `deepseek-v4-1-flash` | text-generation | vision | frontier | 1M konteksti, kuvaymmärrys, `reasoning_effort` | keskitaso |
| `deepseek-v4-flash` | text-generation | vision | frontier | Kuvaus: ultra-fast, matala latenssi | keskitaso |
| `deepseek-r1-llama-70b-abliterated` | deepseek-r1-abliterated | chat | vanha | R1-distill Llama 70B, 16K, abliterated | keskitaso — pohja nimetty |
| `deepseek-r1-qwen-32b-abliterated` | deepseek-r1-abliterated | chat | vanha | R1-distill Qwen 32B, 16K, abliterated | keskitaso |

`any-llm`-kuvaus mainitsee `deepseek/deepseek-r1`:n premium-mallina. Sitä **ei ole** `model`-enumissa.

## Kimi (Moonshot) — 1 slug

| slug | tyyppi | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|
| `kimi-k3` | vision | frontier | Kuvaus: 2.8T MoE, 1M konteksti, koodi ja agentit. $3 / $15. Kentät mukana sampling-parametreina. Async + `/stream` kuvauksessa | keskitaso — skeemaa ei haettu |

K2:ta tai vanhempaa Kimiä ei ole katalogissa.

## Reitittimet (`family: llm`)

Nämä ovat ainoat paikat, joissa vanhemmat avoimet mallit (Llama 4, GPT-4o, Qwen3-VL) ovat valittavissa. Skeema haettu.

### `any-llm` — chat-router

- Tyyppi: chat-router. Kentät: `prompt` (pakollinen), `system_prompt`, `model`, `reasoning`, `priority` (`throughput`|`latency`), `temperature`, `max_tokens`
- Listan `cost` 0.01, `dynamic_pricing` true
- Oletus: `google/gemini-2.5-flash`
- Enum (tämä on valittavissa oleva joukko):

`anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-haiku`, `google/gemini-2.5-flash`, `google/gemini-2.0-flash-001`, `google/gemini-2.0-flash-lite-001`, `google/gemini-2.5-flash-preview-09-2025`, `google/gemini-2.0-flash-exp:free`, `google/gemini-2.5-pro`, `openai/gpt-4o`, `openai/gpt-4.1`, `openai/gpt-5-chat`, `meta-llama/llama-3.2-90b-vision-instruct`, `meta-llama/llama-4-maverick`, `meta-llama/llama-4-scout`

Luotettavuus: **matala kuvauksen ja enumin välillä**. Kuvauksen premium-lista sisältää id:itä joita enumissa ei ole (`deepseek/deepseek-r1`, `google/gemini-pro-1.5`, `anthropic/claude-3-5-haiku`, `openai/o3`). Output-skeema on kopioitu videoprediktiosta (`video`-esimerkki, `has_nsfw_contents`).

Ikä: enum on vanha kerros. Llama 4 Maverick/Scout ovat kiinnostavat, koska niillä ei ole omaa slugia.

### `openrouter-vision` — vision-router

- Tyyppi: vision-router. `images_list` pakollinen, max 4 kuvaa. `cost` 0.025, strategia `any-llm`
- Oletus: `google/gemini-2.5-flash`
- Enum: `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4.5`, `openai/gpt-4o`, `qwen/qwen3-vl-235b-a22b-instruct`, `x-ai/grok-4-fast`

Luotettavuus: **matala kuvaus**. Kuvaus on kopio `any-llm`:stä. `images_list`-kuvaus sanoo “image-to-video generation”. Qwen3-VL 235B on ainoa iso virallinen Qwen-vision tässä katalogissa.

### `gpt-codex`

Katso GPT-taulukko. Enum on luotettava (skeema haettu).

---

## Qwen — ei virallista instruct-slugia

Kuusi abliteroitua (`qwen-abliterated`) ja kaksi character-finetunea (`qwen-character-chat`). Kaikki enabled. Yhteinen listan `cost` 0.0002.

| slug | tyyppi | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|
| `qwen-3-8-27b-abliterated` | vision | frontier-nimi | 27B, 524K, kuva, valinnainen `thinking` | keskitaso — abliterated, skeemaa ei haettu |
| `qwen-3-8-27b-obliterated` | vision | frontier-nimi | Sama 3.8 27B -pohja, toinen muokkaus, `thinking` | keskitaso — ero abliterated-riviin on vain kuvauksen sanassa |
| `qwen-3-8-27b-fable` | vision | frontier-nimi | Character-chat, pitkä proosa. Kuvaus: ei abliterated. 524K + kuva | keskitaso |
| `qwen-3-8-27b-queen` | vision | frontier-nimi | Character-chat. Kuvaus: ei abliterated. 524K + kuva | keskitaso |
| `qwen-3-5-27b-blossom-derestricted` | vision | väli | Qwen3.5 27B, 262K, kuva | keskitaso |
| `qwen-3-5-27b-queen-derestricted` | vision | väli | Qwen3.5 27B derestricted, 262K, kuva | keskitaso |
| `qwen-3-5-27b-opus-distilled-derestricted` | vision | väli | Kuvaus: reasoning-distilloitu Qwen3.5 27B, 262K, kuva | keskitaso — “opus” on kuvauksen sana, ei erillinen Anthropic-malli |
| `qwen-2-5-32b-abliterated` | chat | vanha | Qwen 2.5 32B Instruct -pohja, 32K | keskitaso |

Lisäksi `openrouter-vision`: `qwen/qwen3-vl-235b-a22b-instruct`.

## Llama — community-chat ja abliteroinnit, ei virallista instruct-slugia

Character-rivit (`llama-character-chat` ja `cydonia-character-chat`) ovat kuvauksen mukaan roolipeliä ja fiktiota, ja kuvaus sanoo etteivät ne ole abliterated. Yhteinen `cost` 0.0002. Kaikki chat, ei kuvaa.

| slug | perhe | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|
| `cydonia-24b-v4-1` | cydonia-character-chat | väli | 24B, 131K, luova chat. Pohjamallia ei nimetä Llama-versioksi | keskitaso |
| `aion-llama-3-1-8b` | cydonia-character-chat | vanha | Llama 3.1 8B, 32K, tool-calling kuvauksessa | keskitaso |
| `euryale-70b-v2-3` | llama-character-chat | vanha | Llama 3.3 70B, 20K | keskitaso |
| `eva-llama-3-33-70b` | llama-character-chat | vanha | Llama 3.3 70B, 32K | keskitaso |
| `nevoria-r1-70b` | llama-character-chat | vanha | Llama 3.3 70B merge, 32K | keskitaso |
| `wayfarer-70b` | llama-character-chat | vanha | Llama 3.3 70B, seikkailu / tekstipeli, 32K | keskitaso |
| `anubis-70b-v1-1` | llama-character-chat | vanha | 70B Llama-pohja, 32K. Tarkkaa 3.x-versiota ei nimetä | keskitaso |
| `magnum-v4-72b` | llama-character-chat | vanha | 72B proosa, 16K. Pohjaperhettä ei nimetä | matala pohjan osalta |
| `stheno-8b-v3-2` | llama-character-chat | vanha | Llama 3 8B, 16K | keskitaso |
| `mythomax-13b` | llama-character-chat | vanha | Llama 2 13B, 4K — katalogin vanhin selvä chat-pohja | korkea iän osalta (kuvaus sanoo classic Llama 2) |
| `llama-3-3-70b-abliterated` | llama-abliterated | vanha | Llama 3.3 70B Instruct, 32K, abliterated | keskitaso |
| `neuraldaredevil-8b-abliterated` | llama-abliterated | vanha | 8B chat, 8K. Pohjaa ei nimetä | matala pohjan osalta |

`any-llm`-enum (ei omia slugeja): `meta-llama/llama-4-maverick`, `meta-llama/llama-4-scout`, `meta-llama/llama-3.2-90b-vision-instruct`.

## GLM, Gemma, MiMo, Hermes, Venice, nimeämätön abliterated

Kaikki chat tai vision, `cost` 0.0002, enabled. Kuvaukset painottavat alennettua kieltäytymistä (abliteration / derestricted). Skeemaa ei haettu.

| slug | perhe | tyyppi | ikä | miksi kiinnostava | luotettavuus |
|---|---|---|---|---|---|
| `glm-5-3-abliterated` | glm-abliterated | chat | frontier-nimi | Kuvaus: täysi GLM 5.3, 1M, tool-calling | keskitaso |
| `glm-5-3-flash-abliterated` | glm-abliterated | vision | frontier-nimi | GLM 5.3 Flash, 1M, kuva, tool-calling | keskitaso |
| `glm-4-6-derestricted-v5` | glm-abliterated | chat | väli | GLM 4.6, 131K | keskitaso |
| `gemma-4-31b-gembrain-abliterated` | gemma-abliterated | vision | frontier-nimi | Gemma 4 31B, 262K, kuva, tool-calling | keskitaso |
| `gemma-4-31b-sdft-abliterated` | gemma-abliterated | vision | frontier-nimi | Gemma 4 31B, 262K, kuva, luova chat | keskitaso |
| `gemma-4-26b-a4b-abliterated` | gemma-abliterated | chat | frontier-nimi | Gemma 4 26B A4B MoE, 65K, tool-calling | keskitaso |
| `mimo-v2-6-flash-abliterated` | mimo-abliterated | vision | frontier-nimi | MiMo V2.6 Flash, 1M, kuva, tool-calling | keskitaso — valmistajaa ei nimetä kuvauksessa |
| `hermes-4-405b` | low-refusal-llm | chat | väli | Nous Research, 405B, 128K, hybrid reasoning. Kuvaus: matala kieltäytyminen, ei sanaa abliterated | keskitaso — pohja nimetty |
| `venice-abliterated` | low-refusal-llm | chat | epäselvä | 128K yleischat, abliterated. Pohjamallia ei nimetä | matala |
| `abliterated-model` | abliterated-model | vision | epäselvä | 262K, kuva. Pohjaa ei nimetä | matala |
| `abliterated-model-large` | abliterated-model | chat | epäselvä | 1M, tool-calling. Pohjaa ei nimetä | matala |
| `abliterated-model-large-v2` | abliterated-model | chat | epäselvä | Kuvaus: toinen revisio, 1M, tool-calling | matala |

Virallista Gemma-, GLM- tai MiMo-chatia ilman abliterointia ei ole.

---

## Rajatapaukset (eivät ole yleistä chatia)

| slug | perhe | miksi mukana maininnassa | luotettavuus |
|---|---|---|---|
| `generate-social-video-script` | text-generation | Tekstin tuotto, mutta kentät ovat `title`, `niche`, `platform`, `duration`, `reference_hook`. Lyhytvideokäsikirjoitus, ei vapaata chatia. `cost` 0.1 | korkea tehtävän osalta |
| `moderate-text` | moderation | Luokittelu, kenttä `text`. Kuvaus: OpenAI:n moderointikategoriat | keskitaso — ei generointia |
| `molmo2-video-captioner` | video-understanding | Videokuvaus 2 minuuttiin asti, vain `video_url` + `detail_level`. Ei promptia | keskitaso |
| `seo-ai-response` | seo | Ei chat-API. Skeeman enum: `gpt-5`, `claude-sonnet-4-5`, `gemini-2.5-pro`, `sonar-reasoning-pro`. Kuvaus puhuu GPT-5:stä, Claude Sonnet 4.5:stä, Gemini 2.5 Prosta ja Perplexity Sonarista | korkea enumin osalta — `sonar-reasoning-pro` ja pelkkä `gpt-5` eivät ole chat-slugeja |
| `research-web-answer` | enrichment | Kysymys + web-haku, kenttä `question`. Ei vapaata LLM-valintaa | keskitaso |

## Pois jätetty (lyhyt)

765 rivistä suurin osa on kuva-, video-, audio- ja 3D-generaattoreita sekä LoRA-treeniä (mm. Image to Video 180, Text to Video 109, Image to Image 80, Text to Image 74). Niitä ei listattu.

`Text to Text` -kategoriasta pois jätetty 63 ei-LLM-riviä: SEO 28, enrichment 24, financial_data 4, ecommerce_data 4, Suno-sanoitus/tyyli 2 (`suno-boost-music-style`, `suno-generate-lyrics`), `openai-sora-2-pro-characters`.

Puhe: `openai-whisper` on litterointi (`other`), Gemini TTS -rivit ovat Text to Audio. Ne eivät ole chat-LLM:iä.

## Leadille

1. Omat frontier-chatit ovat erillisiä slugeja (GPT-6, Claude Fable 5 / Opus 5.5 / Sonnet 5.5, Gemini 3.8 Flash, Grok 4.7, Kimi K3, DeepSeek V4). Ne eivät kulje `any-llm`-enumissa.
2. `any-llm` ja `openrouter-vision` ovat vanhempi OpenRouter-tyylinen kerros. Llama 4 ja Qwen3-VL 235B ovat vain siellä.
3. Toinen iso LLM-lohko on abliteroidut ja character-chat -mallit (Qwen 3.8, GLM 5.3, Gemma 4, Llama 3.3 -finetunet). Usean pohjamallia ei nimetä.
4. Hintakenttä `cost` ei ole token-hinta. Ristiriidat: `gpt-6-luna`, `gpt-6-sol` (`cost` 0.000001), `claude-sonnet-4-6` (`cost` 1), `gemini-3-6-flash` (rikki hintateksti).
5. Integraatio on `prompt` + valinnainen `system_prompt`, ei `messages`. OpenAI-yhteensopivuus on kolmen Gemini-slugin kuvauksessa; niiden skeemaa ei haettu.
