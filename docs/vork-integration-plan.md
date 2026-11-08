# Vork-integraatio

**Hyväksyntä:** käyttäjä hyväksyi tämän suunnitelman sellaisenaan 7.11.2026 (Europe/Kiev).

Vork ([voyager-so/vork](https://github.com/voyager-so/vork)) lisätään uutena työpöytästudiona. Sama kuvio kuin nykyisillä paikallisilla moottoreilla: Electron käynnistää käyttäjän koneella olevan virallisen binäärin, selainpuoli ei renderöi. Pilvi, MuAPI ja `packages/studio` jäävät koskematta.

Periaate: sovellus ja agentti tekevät niin paljon kuin mahdollista. Ihmiseltä jäävä työ pidetään pienenä.

## Rajaukset

| Aihe | Päätös |
|---|---|
| Kohtauksen tekijä | Agentti kirjoittaa scene-JSONin. Käyttäjä ei kirjoita JSONia eikä täytä lomaketta. |
| Binääri | Etsitään automaattisesti oletuspoluista. |
| `vork setup` | Sovellus saa käynnistää sen napista. Ei kuulu ensimmäiseen toteutusviipaleeseen. |
| Ensimmäinen versio | Still-kuva, profiilit `std/previs` ja `std/final`. |
| Video | Ruutuvälin MP4 heti still-putken perään. Agenttipuoli on sama. Ei tässä viipaleessa. |
| glTF | Myöhemmin. `"type":"asset"` ja `model.glb` eivät kuulu still-ytimeen. |

Lisenssi rajaa toteutuksen. Preview-lisenssi sallii muokkaamattoman binäärin käytön omalla koneella. Se kieltää hostatun renderöinnin ja muokatun version jakelun. Binääriä ei commitoida, `install.sh`-skriptiä ei ajeta, PATH-muuttujaa ei muuteta, eikä renderöintiä avata Nextin API-reitteihin. Blender-silta (GPL) jää pois. npm-paketti nimeltä `vork` on eri ohjelma, eikä sitä asenneta.

## Arkkitehtuuri

Työpöytä on Vite ja Electron: `src/main.js`, `src/components/` ja `electron/`. Vain täällä on `window.localAI`. Web on Next: `app/studio/[[...slug]]/page.js`, `components/StandaloneShell.js` ja `packages/studio`. Se puhuu vain MuAPIlle. VFX-välilehteä ei lisätä sinne.

vork ei ole kuvamalli. Sitä ei lisätä tiedostoon `src/lib/localModels.js` eikä kytketä tiedostoihin `ImageStudio.js` tai `VideoStudio.js`.

Selain kirjoittaa kohtauksen. Electron kirjoittaa sen levylle ja käynnistää binäärin:

```text
vork render shot.json --profile std/previs|std/final --out tiedosto.png
```

## Tiedostosaumat

1. `electron/lib/vorkScene.js` — stub-kohtaus, binäärihaku, JSONin tarkistus, argumentit.
2. `electron/lib/vorkProvider.js` — `register()`, spawn ilman shelliä, PNG data-URLina.
3. `electron/preload.js` — `window.localAI.vork`.
4. `electron/main.js` — `registerVork()`.
5. `src/lib/vorkClient.js` — agentin `writeScene` ja `render`.
6. `src/components/VfxStudio.js` — tila, esikatselu, lopullinen kuva. Ei JSONin muokkausta.
7. `src/main.js` — sivu `vfx`.
8. `src/components/Header.js` — navigointi vain työpöydässä.
9. `src/lib/i18n.js` — `nav.vfx` ja studion tekstit.
10. `tests/vorkProvider.test.js` — haku, argumentit ja käynnistys ilman näytönohjainta.

Asetukset: `userData/local-ai/vork.json`. Kohtaukset: `userData/local-ai/vork/shots/current/`. Välimuisti: `VORK_CACHE_DIR`.

Haku: tallennettu polku, sitten `~/.local/bin/vork` tai `%LOCALAPPDATA%\Programs\vork\vork.exe`, sitten `PATH`.

## Toteutettu hyväksynnän jälkeen

Still-kuva, ruutuvälin MP4 samasta `shot.json`-tiedostosta, `.glb`-tuonti nimellä `model.glb`, ja `vork setup` napista. Ensimmäinen renderöinti ajaa setupin itse, jos sitä ei ole vielä tehty.

Pilveä, vendoroitua binääriä ja Next-studion välilehteä ei lisätä.

## Ehdotus: RunPod käyttäjän omalta tililtä

Työpöytäversio osaa nyt vuokrata RTX 4090:n käyttäjän omalla RunPod-avaimella, asentaa vorkin mukaan lukien `libegl1`, siirtää kohtauksen, renderöidä, hakea PNG:n ja tuhota podin. Yksityiskohdat ovat tiedostossa `docs/vork-runpod-plan.md`. Jaettua jonoa ei ole, eikä Next-studio osallistu. Paikallinen binääri jää oletukseksi.

Käyttöliittymä näyttää VFX-studiossa RunPod-tilin senhetkisen saldon ja linkin sivulle `https://console.runpod.io/user/billing`, josta käyttäjä voi ladata lisää rahaa. Sovellus ei tee latausta itse.
