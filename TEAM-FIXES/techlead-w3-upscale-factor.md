# TechLead FIX: W3 Enhancer → `generateI2I` + `upscale_factor`

**Status:** BLOCKER (partially unblocked by TechLead)  
**Feature:** S1.3 Enhancer UX  
**Gate:** `TEAM-ARCH-GATE.md` §5  

---

## Ongelma

`packages/studio/src/muapi.js` → `generateI2I` ei aiemmin välittänyt `upscale_factor`-kenttää payloadiin.  
`topaz-image-upscale` schemassa (`models.js`) vaatii `upscale_factor` (1|2|4|8). Ilman tätä EnhanceStudio 1x/2x/4x -chipit eivät vaikuta API-kutsuun.

## TechLead-toimenpide

**Jo korjattu** `generateI2I`:ssä (schema-input pass-through):

```js
if (modelInfo?.inputs) {
  for (const key of Object.keys(modelInfo.inputs)) {
    if (payload[key] !== undefined) continue;
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      payload[key] = params[key];
    }
  }
}
```

Näin `upscale_factor` (ja muut katalogin `inputs`-avaimet) menevät payloadiin kun UI välittää ne.

```js
import { generateI2I } from "../muapi.js";

await generateI2I(apiKey, {
  model: "topaz-image-upscale", // fallback: "ai-image-upscaler"
  image_url: sourceUrl,
  upscale_factor: factor, // 1 | 2 | 4
});
```

## W3 checklist (arkkitehtuuri)

1. Uusi `EnhanceStudio.jsx` + StandaloneShell `enhance`-tab — **OK**
2. Kutsu `generateI2I` — **pakollinen** (ei fetch suoraan MuAPI:in)
3. Presetit (Flat Sharp / Strong / Portrait) mappaavat vain parametreihin / UI-stateen — Sprint 1:ssä Topaz-schemassa on lähinnä `upscale_factor`; älä inventoi proprietary Marketing Studio Image API -kenttiä
4. **Älä kirjoita** `models.js` (W6 omistaa)
5. Ei Explore-malliselainta

## Hyväksyntä

Kun EnhanceStudio wirettää yllä olevalla tavalla → TechLead: **APPROVED** (arkkitehtuuri).  
QA hoitaa before/after + AC erikseen.
