# TEAM-ARCH-GATE — pakolliset arkkitehtuurissäännöt

**Rooli:** Tech Lead gatekeeping (Open-Higgsfield-AI / MuAPI Explore -sprintti)  
**Peruste:** `muapi-explore-toteutussuunnitelma.md`  
**Päivitetty:** 2026-09-20  

Workerit **eivät** saa merge-/done-tilaan featurea joka rikkoo näitä. Jos rikkoo → TechLead kirjoittaa `TEAM-FIXES/techlead-<aihe>.md` ja merkitsee boardiin `REJECTED`.

---

## 1. Missä muutokset tehdään

| Kerros | Polku | Sääntö |
|---|---|---|
| **Mallikatalogi + MuAPI + studio-UI** | `packages/studio/**` | **Ainoa** paikka katalogille, `muapi.js`:lle, Image/Video/Enhance/Assets-komponenteille |
| **Next-host** | `components/StandaloneShell.js`, `app/studio/**` | Vain tabit, cross-tab navigointi, shell-state — ei mallilistoja |
| **Electron/Vite** | `src/components/Header.js`, `src/main.js`, vanillat | Vain navi-aukot (esim. Audio). Ei uutta mallikatalogia |
| **Proxy** | `app/api/api/v1/[[...path]]/route.js` | Pass-through; **älä** muuta ellei blocker |

**Kielletty:** kopioida / peilata mallilistoja `app/`, `src/lib/` (paitsi re-export), tai worker-kohtaisiin “temp catalog” -tiedostoihin.

---

## 2. `models.js` — single source of truth

1. **SSoT:** `packages/studio/src/models.js`
2. **`src/lib/models.js` on vain re-export** (`export * from "studio/src/models.js"`).  
   - **ÄLÄ** duplikoi entryjä, input-schemaa tai listoja sinne.  
   - **ÄLÄ** lisää uusia malleja Electron-puolelle erikseen.
3. Uusi malli → oikea lista: `t2iModels` / `i2iModels` / `t2vModels` / `i2vModels` / `v2vModels` / `audioModels` / …
4. Getterit (`getVideoModelById`, …) riittävät — **ei** erillistä toista rekisteriä.

### Pakolliset kentät uusille P1/P2-perheille

```js
{
  id, name, endpoint,
  family,          // pakollinen P1: seedance-2.5 | wan-3.0 | minimax-h3 | flux-3 | …
  variant,         // tai modeKey / modeLabel — mode-chip resoluutioon
  inputs,          // MuAPI schema -vahvistettu
  badges?, bestFor?, aliasOf?, imageField?
}
```

- Max **~2–4 endpoint-id:tä per family** Sprint 2:ssa (ei kaikkia resoluutio-slugia dropdowniin).
- Vanhat mallit ilman `family`: fallback OK (yksittäinen rivi); älä poista olemassa olevia `family`-arvoja.

---

## 3. MuAPI schema -vahvistus (ennen katalogilisäystä)

**Pakollinen** ennen jokaista uutta / muutettua endpointtia:

1. `GET https://api.muapi.ai/api/v1/models/{name}` (tai proxy `/api/api/v1/models/{name}`)
2. Vahvista: duration, resolution, image-kentät (`image_url` / `images_list` / …), seed, erikoiskentät
3. Kirjaa `inputs` katalogiin **schemaan perustuen** — ei arvailua
4. Smoke: yksi generate proxy-polun kautta (`POST /api/api/v1/{endpoint}`) kun feature merkitään DONE

**Hylkäysperuste (W6):** entry ilman vahvistettua schemaa / väärät kenttänimet / spicy- tai watermark-remover -slugit.

---

## 4. Family / modes -metadata & UI

| Tehtävä | Tiedosto | Sääntö |
|---|---|---|
| Ryhmittely | `packages/studio/src/modelFamilies.js` (uusi OK) | `getFamilies`, `resolveVariant` — ei logiikkaa hajallaan 5 komponentissa |
| Video UI | `VideoStudio.jsx` | FamilyPicker + ModeChips; **ei** raakadump 75 slugia |
| Image UI | `ImageStudio.jsx` | Sama pattern Flux/NB-perheille |
| Dropdown | `ModelDropdown` / family-picker | Haku: family name **tai** id; suositut perheet ensin |

**W7 hyväksyntä:** Seedance 2.5 = yksi rivi + mode-chipit vaihtavat `selectedModel` id:n; ei Explore-gallerystä.

---

## 5. API-kutsupolku

```
UI → packages/studio/src/muapi.js → submitAndPoll(endpoint, payload, apiKey)
```

- Uusi malli **ei** tarvitse uutta `muapi.js`-funktiota jos payload sama (prompt, aspect_ratio, duration, resolution, image_url / images_list).
- Poikkeukset katalogissa: `imageField`, `requiresRequestId`, `aliasOf`.
- **Enhancer (W3):** käytä olemassa olevaa `generateI2I` → `topaz-image-upscale` (fallback `ai-image-upscaler`). Älä tee uutta HTTP-clienttiä.
- Marketing ads: olemassa oleva `generateMarketingStudioAd` — älä kloonaa HF Marketing Studio Image API:a.

---

## 6. Assets / IndexedDB (W8)

- Yksi store: `packages/studio/src/lib/assetsStore.js` (IndexedDB).
- Migroi studio-kohtaiset `localStorage`-avaimet / `muapi_history` → Assets; älä jätä kahta kilpailevaa “truth”-lähdettä.
- Quota-virheet käsiteltävä; ei base64-dumppeja localStorageen videoille.
- “Send to …” -integraatio PostGenActions / shell-eventtien kanssa — ei erillistä Explore-browsea.

---

## 7. Shell-säännöt

- **Ensisijainen UX:** Next `StandaloneShell` + `packages/studio` React.
- Electron: vain navi-aukot; älä blokkaa React-quick wineja Electron-vanillalla.
- Cross-tab (Send to Video/Enhance): `StandaloneShell` + sessionStorage / custom event — payload dokumentoitava fix-filessä jos muuttuu.

---

## 8. OUT OF SCOPE (automaattinen REJECT)

1. **Explore-malliselain** / gallery-browse Image/Video-suodattimilla / hero-carousel mallikorteilla  
2. Genjutsu / Soul 2 / Cinema Studio 4.0 exclusive API / Marketing Studio Image proprietary API  
3. Kaikkien ~487 puuttuvan MuAPI-endpointin dump UI:hin  
4. Todellinen Krea Realtime -stream  
5. Watermark-remover -markkinointi  
6. Spicy/unrestricted -variantit oletuksena  
7. Duplikointi `src/lib/models.js`:ään tai toiseen katalogiin  
8. Uusi proxy-logiikka ilman blocker-syytä  

Sallittua: UX-intentin matkiminen (presetit, Enhancer-slider, Assets, Cinema multi-shot) **olemassa olevilla** MuAPI-endpointeilla.

---

## 9. Review-fokus (TechLead prioriteetti)

| Worker | Feature | Gate |
|---|---|---|
| **W6** | `models.js` P1-schema | Schema live-vahvistettu; `family`/`variant`; max 2–4/id family; ei duplikointia |
| **W7** | Family selector | `modelFamilies.js` + ModeChips; ei slug-dump; search OK |
| **W3** | Enhancer → `muapi.js` | `generateI2I` + topaz; preset → parametrit; ei uutta clienttiä |
| **W8** | IndexedDB Assets | yksi `assetsStore`; migraatio; Send to … |

Muut workerit: sama gate, kevyempi diff-tarkistus.

---

## 10. Board-merkinnät

Kun `TEAM-BOARD.md` on olemassa, TechLead merkitsee per feature:

```
TechLead: APPROVED | REJECTED
```

- **APPROVED** = arkkitehtuuri OK (ei välttämättä product-AC valmis — Lead/QA voi erottaa).  
- **REJECTED** = rikkoo tätä gatea → linkki `TEAM-FIXES/techlead-<aihe>.md`.

**Älä committoi** gate-/fix-tiedostoja ellei Lead/käyttäjä pyydä.  
**Älä** toteuta Explore-malliselainta. Preferoi worker-ohjausta fix-filen kautta; pieni blocker-fix vain jos worker jumissa.
