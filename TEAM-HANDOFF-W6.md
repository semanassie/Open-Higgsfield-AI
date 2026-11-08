# W6 Handoff — P1 models.js ONLY

**Omistus:** VAIN `packages/studio/src/models.js`
**Älä koske:** UI, Explore, spicy, watermark-remover, Genjutsu/Soul2

## Lisättävät entryt (max ~4 / family)

### seedance-2.5 (family id: `seedance-2.5`)
1. `seedance-2.5-text-to-video` → t2vModels  
   - badges: `["New"]`, bestFor: `"final"`, variant: `"t2v-standard"`, modeLabel: `"Standard"`
   - inputs: prompt, resolution enum 480p/720p/1080p/4k default 720p, duration 4–30 default 5, aspect_ratio, seed, high_bitrate
2. `seedance-2.5-image-to-video` → i2vModels  
   - imageField: `"image_url"`, hasPrompt: true, variant: `"i2v-standard"`
   - inputs: prompt, image_url, resolution, duration, seed, high_bitrate

### wan-3.0 (family: `wan-3.0` — käytä tätä UI:ssa; MuAPI family-kenttä on `wan3.0`)
1. `wan3.0-text-to-video` → t2vModels — badges `["New","Audio"]`, variant `t2v-standard`
2. `wan3.0-image-to-video` → i2vModels — imageField image_url, lastImageField: `last_image`, variant `i2v-standard`
3. Optional mode: `wan3.0-prime-text-to-video` variant `t2v-prime` modeLabel `"Prime"` (jos mahtuu max 4)

Inputs (standard): prompt, resolution 480p/720p/1080p, aspect_ratio, duration 2–30, thinking_mode bool, enable_audio bool default true, seed default -1

### minimax-h3 (family: `minimax-h3`)
1. `minimax-h3-text-to-video` → t2vModels — badges `["New"]`
2. `minimax-h3-image-to-video` → i2vModels — imageField image_url, lastImageField optional `last_image_url` if in schema
3. Optional: `minimax-h3-max-text-to-video` variant `t2v-max` modeLabel `"Max"` — family pysyy `minimax-h3` (älä käytä MuAPI:n `minimax-h3-max` family-stringiä UI:ssa)

### flux-3 (family: `flux-3`)
1. `flux-3-text-to-image` → t2iModels — badges `["New"]`, inputs: prompt, resolution, aspect_ratio
2. `flux-3-text-to-video` → t2vModels — badges `["New","Audio"]`, inputs: prompt, aspect_ratio, resolution, duration, generate_audio
3. `flux-3-image-to-image` → i2iModels — imageField `images_list`, hasPrompt true
4. `flux-3-image-to-video` → i2vModels — imageField `image_url`, hasPrompt true

## Muoto
Seuraa olemassaisiä seedance-v2.0 / kling-v3.0 -merkintöjä. Muunna input_schema.properties → `inputs` objekti (kuten muissa entryissä).

## Badge-meta lippulaivoille (S1.5 W4 tarvitsee)
Lisää `badges: ["New"]` myös 2–3 olemassa olevalle lippulaivalle jos puuttuu (esim. seedance-v2.0-t2v, kling-v3.0) — varovasti, älä massamuuta.

## Valmis
Status QA_REVIEW. Kirjoita lyhyt lista lisätyistä id:istä TEAM-BOARD notes -tyyliin raporttiin.
