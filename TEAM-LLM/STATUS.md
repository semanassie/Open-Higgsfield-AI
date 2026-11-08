# TEAM-LLM Status

Lead, 2026-10-04. Validointi-loop käytetty **0/3**. `TEAM-LLM/FIXES.md` ei tarvittu.

## Onko suunnitelma QA-hyväksytty

**Kyllä.** `TEAM-LLM/QA-REPORT.md` alkaa `VERDICT: PASS`. Lead merkitsi `muapi-llm-paivityssuunnitelma.md` (versio 1) boardilla tilaan `DONE`.

Suunnitelma on repon juuressa. Sitä ei ole committoitu.

## Mitä uusia LLM:iä löytyi

Live-katalogi `GET https://api.muapi.ai/api/v1/models` (HTTP 200, `Date: Sun, 04 Oct 2026 14:15:12 GMT`): **765** mallia, joista **84** on chat-, LLM- tai vision-language -endpointteja. Kolme rajatapausta on samassa `Text to Text` -joukossa, mutta ne eivät ole yleistä chatia.

Koodissa ei ole yhtään rekisteröityä text/chat-riviä. Ainoa tekstikutsu on Electronin Director: `POST /api/v1/any-llm` ilman `model`-kenttää. Siksi kaikki 84 endpointtia ovat uusia suhteessa `packages/studio/src/models.js`:ään. Gateway `any-llm` on jo kytketty, eikä sitä lisätä uutena rivinä.

Omat frontier-slugit eivät kulje `any-llm`-enumissa. Ne vaativat oman polun `POST /api/v1/{slug}`.

Puuttuvat perheet omina chat-slugeina: Mistral, Mixtral, Cohere Command, Amazon Nova, virallinen ei-abliteroitu Qwen-instruct (poikkeus: Qwen3-VL vain `openrouter-vision`-enumissa) ja virallinen Llama-instruct (Llama 4 ja Llama 3.2 Vision vain `any-llm`-enumissa).

## Top-suositukset

Oletusvalitsin on **11 perhettä ja 22 slugia** (P1). Directorin hiljainen oletus säilyy: ilman valintaa kutsu on edelleen `any-llm` ilman `model`-kenttää. Ensimmäinen kokeiltava moodi perheessä:

| Perhe | Slug |
|---|---|
| Claude Fable | `claude-fable-5-1` |
| GPT-6 | `gpt-6-astra` |
| Gemini 3 Pro | `gemini-3-1-pro` |
| DeepSeek V4 | `deepseek-v4-pro` |
| Grok 4 | `grok-4-7` |
| Kimi | `kimi-k3` |
| Gemini 3.8 | `gemini-3-8-flash` |
| GPT-5.6 | `gpt-5-6-sol` |
| GPT-5.5 | `gpt-5-5` |
| Claude Opus | `claude-opus-5-5` |
| Claude Sonnet | `claude-sonnet-5-5` |

P1:n muut moodit (sama valitsin, ei erillistä prioriteettia): `gpt-6-1-sol`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5-6-terra`, `gpt-5-6-luna`, `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5`, `gemini-3-pro`, `deepseek-v4-1-flash`, `deepseek-v4-flash`.

`gpt-6-sol` ja `gpt-6-luna` pysyvät listalla, mutta niiden katalogin `cost` ei ole token-hinta eikä sitä näytetä.

**P2, ei oletusvalitsimeen:** Llama 4 Maverick, Llama 4 Scout ja Llama 3.2 90B Vision (`any-llm`-enum) sekä Qwen3-VL 235B ja reititin `openrouter-vision` (vaatii `images_list`, ei Directorin tekstipassiin).

**P3, ei tähän valitsimeen:** väli- ja vanhat versiot, abliteroidut mallit, character-chat ja ei-yleischat (SEO, moderointi, käsikirjoitusgeneraattori).

Toteutus järjestyy `ARCH.md`:n mukaan: sprint 1 lisää käsin pidettävän `packages/studio/src/llmModels.js` ja slug-kuljetuksen `callLLM`:ään, sprint 2 perhevalitsimen Directorissa, sprint 3 ei laajenna P2/P3:een. Ei uutta studiovälilehteä eikä rivejä generoituun `models.js`:ään.
