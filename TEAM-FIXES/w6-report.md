# W6 Report — P1 models.js

**Worker:** W6  
**Feature:** P1.1–4 Katalogi  
**Status:** QA_REVIEW  
**File:** `packages/studio/src/models.js` only  
**Schema:** live `GET https://api.muapi.ai/api/v1/models/{name}` → `input_schema.schemas.input_data.properties`

## Lisätyt / täydennetyt model id:t (13)

### seedance-2.5 (2/4)
- `seedance-2.5-text-to-video` → t2v — modes `["standard"]`, badges `New`/`4K`/`Audio`, `inputs.seed` + resolution 480p–4k
- `seedance-2.5-image-to-video` → i2v — `imageField: image_url`

### wan-3.0 (3/4) — UI family `wan-3.0` (ei MuAPI `wan3.0`)
- `wan3.0-text-to-video` — Standard
- `wan3.0-prime-text-to-video` — Prime
- `wan3.0-image-to-video` — Standard; `lastImageField: last_image`
- modes: `["standard","prime"]`, badges `New`/`Audio`, `inputs.seed`

### minimax-h3 (4/4) — family `minimax-h3` (ei `minimax-h3-max`)
- `minimax-h3-text-to-video` — Standard
- `minimax-h3-image-to-video` — Standard; `lastImageField: last_image_url`
- `minimax-h3-max-text-to-video` — Max
- `minimax-h3-max-turbo-text-to-video` — Turbo
- modes: `["standard","max","turbo"]`  
- seed: ei schemassa → ei keksittyä `inputs.seed`

### flux-3 (4/4) — i2i + i2v schema OK
- `flux-3-text-to-image` → t2i
- `flux-3-text-to-video` → t2v
- `flux-3-image-to-image` → i2i (`images_list`)
- `flux-3-image-to-video` → i2v (`image_url`)
- modes: `["standard"]`; video badges `New`/`Audio`  
- seed: ei schemassa flux-3:lle → ei lisätty

## Meta (W7 / W4)
Jokaisella P1-entryllä: `family`, `variant`, `modeLabel`, `modeKey`, `modes`, `badges`, `bestFor`, schema-`inputs`.

t2v sibling `family` coverage: **29/50** (Seedance/Kling/Veo/Wan/Runway).

QUEUE-W6 P0 badges/seed + P1 family: käsitelty.

## Ei tehty (gate)
- Ei spicy / watermark-remover / Explore
- Ei resoluutio-slug-dumpia
- Ei `src/lib/models.js` -duplikointia
- Ei commitia

## Validoitu
≤4 entryä / family; `modes` array; schema-inputs — OK.
