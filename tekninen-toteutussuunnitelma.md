# Tekninen toteutussuunnitelma

Directorin vienti, Cineman grade ja paikallinen efektigraafi. Lisenssiraja on tämän repon MIT. Suunnitelma on auditoitu: jaettu sopimus siirtyy vaiheeseen 2, grade käyttää nykyistä Dropdownia, ja kuvaketju lukee studio-muapin `url`-kentän.

## Rajat

- Vienti kuuluu Electron-kuoreen (`src/`). Cinema ja workflow kuuluvat Next-kuoreen (`packages/studio`).
- `@ffmpeg/core` (GPL-2.0-or-later) ei kasva editoriksi. Se poistetaan vasta, kun WebAV toistaa nykyisen kovan concat-tapauksen.
- OpenTimelineIO:sta otetaan käsitteet, ei C++-kirjastoa. Editlystä otetaan kenttien merkitys, ei npm-pakettia eikä gl-transitions-kokoelmaa.
- Mediabunny jää pois. `@webav/av-cliper@1.2.8` muxaa MP4:n (`Combinator.output`, `fixFMP4Duration`).
- OpenColorIO-kirjastoa, ACES-LUT-binäärejä ja SOP-evaluointia selaimessa ei tule.
- ComfyUI:n lähdettä ja workflow-JSONeja ei vendoroida. Vibe-Workflow täytetään git-alimoduulina, ei tiedostokopiona.
- Remotion, Twick, Shotstack, Creatomate, JSON2Video ja CapCut-draft jäävät pois.
- MoviePy jää pois: repossa ei ole Python-vientipolkuä.
- Electronin Cinema (`src/components/CinemaStudio.js`, `src/lib/promptUtils.js`) ja Directorin render/planner (`src/lib/directorRender.js`, `src/lib/directorPlanner.js`) eivät muutu näissä vaiheissa.

## Vaihe 1 — Aikajana

Uudet tiedostot:

- `src/lib/directorTimeline.js` — `timelineFromShots(shots, videoUrls)`, `validateTimeline`. Versio 1. Tasan yksi video- ja yksi audioraita. `sourceRange` on koko tiedosto (`startSec: 0`, `durationSec: null`). Siirtymä on `cut`. Ääniraita on tyhjä. Skip-aukko pudottaa klipin mutta säilyttää `shotId`:n.
- `src/lib/directorFade.js` — opacity-limitys sekunneissa. `cut` ei limitä.
- `src/lib/directorTimelineExport.js` — dynaaminen `import('@webav/av-cliper')`. Kova concat todistetaan `Combinatorilla`. `fastConcatMP4` vain, kun koodekki, resoluutio ja näytteenottotaajuus täsmäävät.
- `tests/directorTimeline.test.mjs` — ei aja WebAV:ta Nodessa.

`src/lib/directorProject.js` saa kentän `timeline: null`. Vanha `director_project`-JSON ilman kenttää latautuu. Epäkelpo aikajana nollautuu, `shots` säilyy. `blob:`-`combinedVideoUrl` hylätään kuten nyt.

Shot-olio ja `videoUrls` pysyvät lähteenä. Aikajana on johdettu näkymä.

Riippuvuus juuren `package.json`:iin:

```json
"@webav/av-cliper": "1.2.8"
```

MIT-teksti ja copyright 2023 风痕 sekä `@webav/mp4box.js` (BSD-3-Clause) kirjataan `THIRD_PARTY_NOTICES.md`:hen asennuksen jälkeen. Versiota ei nosteta ilman uutta lisenssilukua.

## Vaihe 2 — Vientinapin kytkentä

`src/components/DirectorStudio.js`: `runCombine` rakentaa aikajanan, jos `state.timeline` on tyhjä, ja kutsuu `exportTimelineLocally`. Pass 2, uusi projekti, render, regen ja skip nollaavat `state.timeline` samassa kohdassa, jossa media vaihtuu.

`src/lib/clientVideoCombine.js` säilyy tässä vaiheessa. `Combinator.isSupported()` epäonnistuessa virhe menee nykyiseen `director.statusCombineFail`-polkuun. `copySceneUrls` jää.

## Vaihe 3 — GPL-concat pois

Vasta kun WebAV tuottaa toistettavan `video/mp4`-blobin kahdesta tai useammasta kokonaisesta osoitteesta ilman leikkausta, fadea tai lisä-ääntä:

- Poista `getFfmpeg`, `execConcat` ja `combineVideosLocally`.
- Jätä `copySceneUrls`.
- Poista `@ffmpeg/core`, `@ffmpeg/ffmpeg` ja `@ffmpeg/util`.

Älä lisää siirtymiä tai ääniraitaa `execConcat`-funktioon missään vaiheessa.

## Vaihe 4 — Grade-sopimus

Uudet tiedostot:

- `packages/studio/src/lib/mediaContract.js` — pelkkä JS, ei Reactia. Kentät: shot, media-URL `{ url, kind }`, grade `{ look, slope, offset, power, sat }`, node `{ id, type, params, output }`.
- `packages/studio/src/lib/cinemaGrades.js` — kuusi CDL-presettiä. `gradeFromId(id)` palauttaa sopimusolion tai `null`. `gradePromptClause(id)` palauttaa lauseen tai `null` (`neutral-print`, tyhjä ja tuntematon). Lause ei sisällä CDL-lukuja.

Testi `tests/cinemaGrades.test.js` importtaa vain studio-moduulia.

Selain ei laske kaavaa `out = (in × slope + offset) ^ power`. Presetien numerot pysyvät tietueessa.

## Vaihe 5 — Cineman valinta

Vain `packages/studio/src/components/CinemaStudio.jsx`.

- Olemassa oleva `Dropdown` saa `gradeId`:n prompttipalkkiin. Ei uutta kamerakolumnia `ScrollColumn`-overlayhin.
- Oletus on look, jonka fraasi vastaa nykyistä `"natural color science"` (`neutral-print`, lause `null`).
- Sisäinen `buildNanoBananaPrompt` saa valinnaisen kuudennen argumentin. Ei-tyhjä lause korvaa vain color-science-osan.
- `settings.gradeId` tallentuu nykyiseen avaimeen `hg_cinema_studio_persistent`. Vanha tallenne ilman avainta on ei-look.
- `loadHistoryItem` palauttaa `gradeId`:n.

Directorin `gradeId`, Electron-cinema ja `promptUtils.js` ovat myöhempi kytkentä, eivät tämän viipaleen tiedostoja.

## Vaihe 6 — Alimoduuli

```bash
git submodule update --init packages/Vibe-Workflow
```

Gitlinkki on `4fed75125da0c9bb9d94ad18f0b7746ed6531a9f`. Hakemisto on nyt tyhjä (`.gitmodules` → `https://github.com/SamurAIGPT/Vibe-Workflow.git`). Initin jälkeen tarkistetaan checkoutin nodet ennen kytkentää. Upstreamin `client/` ja `server/` jäävät käynnistämättä. `npm run build:workflow` tuottaa `packages/Vibe-Workflow/packages/workflow-builder/dist/index.js`.

Uutta `@xyflow/react`-canvasia ei tehdä. `packages/studio/src/components/WorkflowUI.jsx` mounttaa jo `WorkflowBuilder`in.

## Vaihe 7 — Paikallinen ketju

Initin jälkeen nodet irrotetaan polusta `/api/workflow/.../run`. Oletusketju käyttää `packages/studio/src/muapi.js`:tä:

1. PromptConcate tai tekstikenttä antaa promptin paikallisesti.
2. `generateImage` → paluuolion `url`.
3. `generateI2V` saa tuon arvon kenttään `image_url`.
4. `generateAudio` → paluuolion `url`.

`submitAndPoll` palauttaa `{ ...result, url }`. `executeWorkflow` ja `runSingleNode` eivät ole oletusajo. Sama `x-api-key` kuin kuvastudiossa. Graafin tila pysyy selaimessa. Text- ja Api-nodeja ei ajeta tässä ketjussa. Electronin `src/lib/muapi.js`:stä puuttuu `generateAudio`, eikä tynkä aja graafia.

## Vaihe 8 — Electron-tynkä

`src/components/WorkflowStudio.js` jää tekstiin `workflows.webOnly`. Hosted `muapi.ai/workflow` ja `https://api.muapi.ai/workflow` eivät ole paikallisen ketjun oletuspolku. Nykyinen playground-lista saa jäädä `WorkflowStudio.jsx`:ään.

## Testit, joita ei rikota

- `tests/directorPlanner.test.mjs` (`normalizeShots`, `planShortFilm`, projektin lataus).
- `localInference*`, `assetsStore.normalize`, `marketingPresets`, `wan2gpModelAvailability`.

Selainvaihe tarkistaa erikseen `Combinator.isSupported()`, kahden klipin kovan concat-tuloksen ja yhden fade-viennin videon `video`-elementissä. Niitä ei ajeta Nodessa.

## Avoinna ilman alimoduulin alustusta

Upstream-nodien lähdettä ei luettu, koska checkout on tyhjä. Väite, että nodet kutsuvat nyt `/api/workflow/.../run`, ja `PromptConcate`-nodin olemassaolo tarkistetaan vaiheessa 6 ennen adapteria. WebAV:n fMP4:ää ei ole toistettu Electronissa. `@webav/av-cliper`-paketin npm-metatiedoissa ei ole lisenssikenttää; MIT on luettu repositorion LICENSE-tiedostosta.
