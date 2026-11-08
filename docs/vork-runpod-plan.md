# Vork RunPodissa — ehdotus

Tämä on ehdotus, ei osa 7.11.2026 hyväksyttyä suunnitelmaa. Paikallinen renderöinti jää ennalleen. Toteutus käyttää RunPodin REST v2 -rajapintaa (`https://api.runpod.io/v2`), koska v1 poistuu 15.11.2026. Saldo haetaan GraphQL-kutsulla `myself { clientBalance }`, koska REST ei palauta sitä. Vaiheet ovat samat kuin alla.

Hyväksytty suunnitelma (`docs/vork-integration-plan.md`) käynnistää virallisen binäärin käyttäjän koneella. Tämä ehdotus lisää toisen reitin: työpöytä vuokraa käyttäjän omalla RunPod-tilillä yhden RTX 4090 -podin, ajaa saman still-renderöinnin siellä ja sammuttaa podin. Selain ei edelleenkään renderöi. Next, MuAPI ja `packages/studio` eivät osallistu.

Kokeilu 8.11.2026 (Europe/Kiev) näytti, että reitti toimii käsin: pod `bxna625cly209s`, RTX 4090, `vork 0.1.0`, `std/final`, 1,32 s, `/tmp/final.png`. Vulkan ei käynnistynyt ennen kuin konttiin asennettiin `libegl1` ja kontin ympäristössä oli `NVIDIA_DRIVER_CAPABILITIES=all`. Sen jälkeen `vork setup` kesti noin puolitoista minuuttia.

## Lisenssi

Nullframe-preview kieltää hostatun palvelun, johon muut lähettävät töitä. Se sallii muokkaamattoman binäärin omalla koneella ja oman organisaation vuokralla näytönohjaimella.

Siksi:

- Avain on käyttäjän oma RunPod-avain. Sitä ei ole repossa, ei palvelimellamme eikä Nextissä.
- Työpöytäprosessi puhuu RunPodin rajapinnalle suoraan. Välissä ei ole meidän jonoa, työntekijää tai jaettua podia.
- Yksi käyttäjän aloittama renderöinti vuokraa enintään yhden podin ja sammuttaa sen, kun kuva on haettu tai ajo keskeytyy.
- Binääriä ei muuteta eikä kopioida repositorioon. Pod lataa julkaistun `vork-0.1.0-linux-x64.tar.gz` -paketin ja tarkistaa SHA256-summan.
- Web-sovellus ei saa tätä nappia. Ilman Electronia kutsu ei lähde.

## Arkkitehtuuri

Neljä uutta palaa Electronin pääprosessissa. Renderer näkee vain tilan ja napin.

| Pala | Tehtävä |
|---|---|
| `electron/lib/vorkRunpod.js` | Avaimen luku, saldon kysely, podin luonti, tilan kysely, tuhoaminen. Ei SSH:ta. |
| `electron/lib/vorkRemote.js` | SSH: asennus, tiedostojen siirto, `vork setup`, renderöinti, PNG takaisin. |
| `electron/lib/vorkProvider.js` | Nykyinen paikallinen polku. Uusi haara vain, jos käyttäjä valitsee RunPodin. |
| `src/components/VfxStudio.js` | Saldo, latauslinkki, tuntihinta, vahvistus, edistyminen, peruutus. Ei JSON-editoria. |

`src/lib/vorkClient.js` ja `electron/preload.js` saavat kapean pinnan: onko avain tallessa, tallenna avain, hae saldo, renderöi RunPodissa, peruuta. Avain ei koskaan palaa rendererille takaisin, vain tieto että se on tallessa. Saldo palaa lukuna ja valuuttana.

Paikallinen `runRender` ei muutu. Testit, joissa ei ole verkkoa, mockaavat rajapinnan ja SSH:n.

## 1. Avain

RunPodin rajapinta-avain salataan Electronin `safeStorage`-rajapinnalla ja kirjoitetaan tiedostoon `userData/local-ai/vork-runpod.bin`. Selkokielistä avainta ei kirjoiteta `vork.json`-tiedostoon, lokiin eikä `localStorageen`. MuAPI-avain on selaimen `localStorage`ssa; tätä avainta ei laiteta samaan paikkaan.

Asetusnäkymä on vain työpöydällä. Käyttäjä liittää avaimen kerran. Sovellus tarkistaa sen kutsulla, joka listaa käyttäjän omat podit, ja näyttää onnistumisen ilman että avain piirretään uudelleen.

Jos käyttöjärjestelmä ei tarjoa salausta, nappi pysyy poissa ja sovellus kertoo sen. Avainta ei silloin tallenneta tiedostoon.

## Käyttöliittymä: saldo ja lataus

VFX-studio näyttää RunPod-tilin saldon samassa näkymässä kuin renderöintinapin, heti kun avain on tallessa. Luku haetaan pääprosessissa käyttäjän omalla avaimella RunPodin tilirajapinnasta. Rendererille palautetaan vain summa ja valuutta, samassa muodossa kuin RunPod sen antaa. Avainta ei piirretä.

Saldo päivitetään, kun studio avataan, kun avain tallennetaan, ja kun podi on tuhottu renderöinnin jälkeen. Jos kysely epäonnistuu, näytetään että saldoa ei saatu, eikä nappi arvaa summaa.

Saldon vieressä on linkki RunPodin laskutussivulle, `https://console.runpod.io/user/billing`. Klikkaus avaa sen käyttöjärjestelmän selaimessa (`shell.openExternal`). Sovellus ei upota maksulomaketta, ei käsittele korttitietoja eikä tee latausta puolesta. Käyttäjä lisää rahat RunPodin omalla sivulla ja palaa studioon, jossa saldo haetaan uudelleen.

Ennen podin luontia vahvistus näyttää sekä saldon että tuntihinnan. Jos saldo ei kata lyhyttä ajoa, nappi pysyy käytössä mutta rivi korostaa linkkiä. RunPod itse hylkää vuokrauksen, jos kate ei riitä. Sovellus ei siirrä rahaa.

## 2. Podin luonti

Käyttäjä painaa VFX-studiossa «Renderöi omalla RunPod-tilillä». Sovellus näyttää tuntihinnan ja kysyy vahvistuksen. Vasta vahvistus luo podin.

Pyyntö käyttäjän avaimella RunPodin REST-rajapintaan `POST https://rest.runpod.io/v1/pods`:

- näytönohjain `NVIDIA GeForce RTX 4090`, yksi kappale
- on-demand, ei spotia
- kuva sama kuin kokeilussa: `runpod/pytorch` Ubuntu 24.04:llä ja CUDA 12.8:lla
- levy vähintään 20 GB, ei erillistä verkkolevyä
- ympäristömuuttuja `NVIDIA_DRIVER_CAPABILITIES=all` jo luontivaiheessa. Sitä ei voi korjata kontin käynnistyttyä, ja ilman sitä Vulkan ei näe korttia.
- SSH-portti auki
- nimi `vork-` ja lyhyt satunnainen loppu

Jos 4090:tä ei ole, sovellus ei vaihda A100-, H100- tai muuhun korttiin. vork ei tue niitä. Se ilmoittaa, että kapasiteettia ei ole.

## 3. Valmiuden odotus

Sovellus kysyy `GET /v1/pods/{id}` muutaman sekunnin välein, enintään noin kymmenen minuuttia. Valmis tarkoittaa, että podi on käynnissä ja SSH-osoite sekä portti näkyvät. Pelkkä «starting» ei riitä.

Edistyminen tulee nykyistä `local-ai:progress` -kanavaa pitkin, `engine: 'vork'`. Peruutus tuhoaa podin, jos se ehdittiin luoda.

## 4. Asennus

Pääprosessi avaa SSH:n juurena. Avainpari on sovelluksen luoma ed25519 ja se elää vain `userData`-kansiossa. Julkinen puolisko lisätään kerran käyttäjän RunPod-tilille. Yksityinen puolisko ei lähde podille eikä repositorioon.

Podilla ajetaan sama asennus kuin kokeilussa, ei mitään muuta:

1. `libegl1`, `libvulkan1`, `libgomp1`, `ca-certificates`, `curl`. `libegl1` on pakollinen. Ilman sitä `vk_icdNegotiateLoaderICDInterfaceVersion` palauttaa alustusvirheen, vaikka `nvidia-smi` näkee 4090:n.
2. Ladataan `v0.1.0` -arkisto ja `SHA256SUMS`, tarkistetaan summa.
3. Koko arkisto kopioidaan hakemistoon `/usr/local/lib/vork` ja binääri linkitetään polkuun `/usr/local/bin/vork`. Pelkkä binääri ei riitä.
4. `vork --version` pitää tulostaa `0.1.0`.
5. `vork setup` ajetaan kerran. Se saa olla hiljaa minuutin tai kaksi. Ensimmäinen kokeilu kesti noin 96 sekuntia.

## 5. Kohtauksen siirto

Lähde on sama kansio kuin paikallisessa ajossa: `userData/local-ai/vork/shots/current/`. Sovellus lähettää `shot.json`-tiedoston ja, jos kohtaus viittaa siihen, `model.glb`-tiedoston. Polku tarkistetaan nykyisellä `validateScene`- ja `glbFiles`-logiikalla. `../` ei lähde. Podille ei lähetetä muuta käyttäjän levyä.

## 6. Renderöinti

Komento on sama kuin paikallisessa `planRender`-funktiossa:

```text
vork render /tmp/shot.json --profile std/previs|std/final --out /tmp/final.png
```

Profiilin valitsee studion nappi, kuten nyt. Videoleike käyttää samaa JSONia ja oletusväliä 0–47. Asennus asentaa myös `ffmpeg`-ohjelman, jotta vork saa muxattua MP4:n. Tiedosto haetaan polkuun `clip.mp4` eikä sitä upoteta data-URLina.

Aikakatkaisu on minuuteissa, ei sekunneissa. Setup ja ensimmäinen käännös ovat hiljaa. Sovellus ei tapa ajoa muutaman sekunnin hiljaisuuden takia.

## 7. Kuvan nouto

PNG haetaan SSH:lla takaisin shot-kansioon. Tyhjä tiedosto käsitellään kuten paikallinen puuttuva tuloste: `{ kind: 'image', missing: true }`. Kelvollinen tiedosto näytetään samalla data-URL-polulla kuin paikallinen renderöinti. Tiedostoa ei lähetetä meidän palvelimelle.

## 8. Sammutus

`finally` tuhoaa podin rajapinnan poistokutsulla, onnistui renderöinti tai ei. Tuhous on terminate, ei pelkkä stop: stoppaa jäänyt podi voidaan käynnistää uudelleen ja se voi vielä laskuttaa. Oletus on, että podia ei jätetä päälle. Erillinen «jätä podi päälle» on pois päältä, ja sen päälle laittaminen vaatii oman vahvistuksen, koska tuntihinta juoksee.

Jos tuhoaminen epäonnistuu, studion virhe näyttää podin id:n ja kehottaa sammuttamaan sen RunPodin konsolissa. Sovellus yrittää tuhoamista uudelleen kerran.

## Mitä ei rakenneta

- Jaettu renderöintijono, palvelimeton RunPod-endpoint tai meidän ylläpitämä kuva, johon vieraat lähettävät töitä.
- Avaimen tai kohtauksen lähetys Nextiin.
- Automaattinen kortin vaihto 4090:stä datacenter-korttiin.
- Binäärin muokkaus, `install.sh`-skriptin ajo tai Blender-silta.
- Maksun ottaminen sovelluksessa. Lataus tapahtuu vain RunPodin omalla sivulla.

## Avoimet kysymykset

1. Lisätäänkö SSH-julkinen avain RunPod-tilille kerran käsin, vai onko siihen pysyvä rajapintakutsu jonka varaan voi nojata?
2. Community- vai Secure-podi oletuksena? Kokeilun hinta oli noin 0,90 USD tunnissa. Secure on kalliimpi ja kapasiteetti vaihtelee.
3. Tuhotaanko podi aina, vai saako käyttäjä jättää lämpimän podin seuraavaa still-kuvaa varten? Lämmin podi säästää käynnistyksen ja asennuksen, mutta lasku juoksee.
4. Mikä on yläraja, jonka yli sovellus ei edes ehdota vuokrausta, jos tuntihinta on odotettua korkeampi?
5. Riittääkö still-kuva ensimmäiseen viipaleeseen, ja tuleeko MP4 samalle podille ennen tuhoamista vai eri viipaleessa?
6. Miten sovellus käyttäytyy, jos käyttäjällä on jo omia podeja? Se ei saa sammuttaa podia, jota se ei itse luonut. Tunniste on nimietuliite `vork-` ja muistissa oleva id.
