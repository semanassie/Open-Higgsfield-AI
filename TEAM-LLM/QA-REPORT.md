VERDICT: PASS

# QA-raportti — MuAPI LLM -päivityssuunnitelma

**Verdict:** PASS  
**Kohde:** `muapi-llm-paivityssuunnitelma.md` (versio 1, 2026-10-04)  
**Iter:** 0/3  
**Päivä:** 2026-10-04  
**Luettu:** `TEAM-LLM/research-muapi.md`, `TEAM-LLM/research-codebase.md`, `TEAM-LLM/ARCH.md`

Tutkimusta ei hylätä. Live-katalogi on olemassa: `GET https://api.muapi.ai/api/v1/models`, HTTP 200, vastauksen `Date: Sun, 04 Oct 2026 14:15:12 GMT`. Luvut 765 mallia ja 150 `Text to Text` -riviä täsmäävät samaan kaappaukseen. `any-llm`-skeeman 15 enum-arvoa täsmäävät tutkimukseen ja suunnitelman P2/P3-enumtaulukoihin.

## Checklist

| # | Kriteeri | Tulos | Näyttö |
|---|----------|--------|--------|
| 1 | Jokaisella suositellulla mallilla on lähde ja luotettavuus | **PASS** | P1 (22), P2 (5) ja P3 (slugit + `any-llm`-enum) -taulukoissa on slug tai enum-arvo, viite `research-muapi.md`-osioon ja luotettavuus (korkea / keskitaso / matala). Katalogin URL ja aikaleima ovat kohdissa 3 ja 8. |
| 2 | “Uusi” = puuttuu paikallisesta katalogista | **PASS** | `research-codebase.md`: ei text/chat-riviä `packages/studio/src/models.js`:ssä; ainoa tekstikutsu on `POST /api/v1/any-llm` ilman `model`-kenttää. Suunnitelma ei lisää `any-llm`-gatewayta uutena rivinä. Jo kytketyt media-idt (Qwen Image, Grok Imagine, GPT Image, Sora, Nano Banana) ja paikallinen Qwen3-4B (`__llm__`) on rajattu ulos. |
| 3 | Ei image/video-generointimallien dumppia | **PASS** | Osio 6 kieltää kuva-, video- ja audiogeneraattorit. `gpt-5-mini` on P3-inventaariossa tyypillä promptinlaajennin, ei yleischat, eikä sitä lisätä `llmModels.js`:ään. `gemini-audio-vision` ja `gemini-video-vision` ovat tekstin tuottavia ymmärrysmalleja, P3, ei valitsinta. Rajatapaukset (`generate-social-video-script`, `moderate-text`, `molmo2-video-captioner`, `seo-ai-response`, `research-web-answer`) ovat out of scope. |
| 4 | P1 / P2 / P3 perusteltu | **PASS** | P1 = `ARCH.md`:n oletusvalitsin (22 frontier-slugia, sprintit 1–2). P2 = ei omaa slugia ja ainoa polku perheeseen tai vision-enumiin; ei oletusvalitsimeen. P3 = tutkimus vahvistaa, ARCH jättää oletuksen ulkopuolelle (väli/vanha, sama sapluuna, abliteroitu, character-chat tai ei yleischat). Grok 4.6 on tutkimuksessa frontier, suunnitelma laittaa sen P3:een koska ARCH:n ainoa Grok-chip on `grok-4-7` ja kuvaus on sama sapluuna. |
| 5 | Ei keksittyjä id:itä | **PASS** | Kaikki P1-slugit ovat tutkimuksen frontier-taulukossa ja katalogikaappauksessa. Enum-arvot ovat haetun `any-llm`- ja `openrouter-vision`-skeeman joukkoa. Suunnitelma kieltää lisäämästä tunnisteita, joita tutkimuksessa ei ole (Mistral, Mixtral, Cohere, Nova, `openai/o3`, pelkkä `gpt-5`, `gpt-codex`-enumin sisäiset nimet omina slugeina). |
| 6 | Suomeksi ja konkreettiset tiedostopolut | **PASS** | Osio 4: `packages/studio/src/llmModels.js`, `src/lib/llmModels.js`, `src/lib/muapi.js` (`callLLM`), `src/components/DirectorStudio.js`, `src/lib/directorPlanner.js`, `packages/studio/src/modelFamilies.js` (`getFamilies`, `preferredOrder`), `src/lib/i18n.js`, `tests/directorPlanner.test.mjs`. `LLM_FAMILY_PRIORITY` on sama 11 perhettä kuin ARCH:ssa. |
| 7 | Toteutusjärjestys ei riko ARCH:ia | **PASS** | Sprint 1 lista + slug-kuljetus, sprint 2 valitsin kutsuvassa näkymässä, sprint 3 ei lisää P2/P3:a. Ei rivejä `models.js`:ään, ei uutta studiovälilehteä, ei `messages`- eikä stream-clienttiä, ei web-`callLLM`-kopiota. |
| 8 | Tutkimus ei ole heikko | **PASS** | Live-lista, aikaleima, 84 chat/LLM/vision-endpointin rajaus ja ei-LLM-rivien (SEO, enrichment, finance) poisjättö. Luotettavuus on merkitty, kun skeemaa ei haettu. |

## P1-rivi vs ARCH

22 slugia täsmää `ARCH.md`:n oletustaulukkoon: GPT-6 (4), GPT-5.6 (3), GPT-5.5 (1), Claude Fable (2), Opus (2), Sonnet (2), Gemini 3.8 (1), Gemini 3 Pro (2), Grok 4.7 (1), Kimi K3 (1), DeepSeek V4 (3). Yhden moodin perheet (`gpt-5.5`, `gemini-3.8`, `grok-4`, `kimi`) eivät saa chippejä. `ModeChips` piilottaa chipit, kun moodeja on alle kaksi (`FamilyModePicker.jsx`).

`any-llm`-enumin 15 arvoa ovat joko P2 (Llama 4 Maverick, Scout, Llama 3.2 90B Vision) tai P3 (loput 12). Llama 4 ei nouse frontier-perheiden edelle.

## Huomiot (eivät kaada verdictiä)

- Useimpien P1-slugien luotettavuus on **keskitaso** (täyttä input-skeemaa ei haettu). `gpt-6-sol` ja `gpt-6-luna` ovat **matala**. Suunnitelma pitää ne P1:ssä ARCH:n GPT-6-perheen takia ja kieltää näyttämästä listan `cost`-kenttää. Ensimmäinen kutsu lähettää vain `prompt` ja `system_prompt`.
- Director on `document.createElement`-näkymä. Suunnitelma ei mounttaa React-`FamilyModePicker`ia vaan piirtää saman `getFamilies`-tuloksen `DirectorStudio.js`:ssä. Sopimus (yksi rivi per `family`, chipit vain kun moodeja on vähintään kaksi, `LLM_FAMILY_PRIORITY`) on sama kuin ARCH:ssa.
- P3-taulukko on inventaario, ei valitsin. Sitä ei kirjoiteta `llmModels.js`:ään.

## Lead

```
QA: MuAPI LLM -päivityssuunnitelma v1
VERDICT: PASS
STATUS → Lead merkitsee suunnitelman DONE
FIX: — (ei TEAM-LLM/FIXES.md)
ITER: 0/3
```
