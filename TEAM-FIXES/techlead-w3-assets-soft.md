# TechLead note: W3 Enhancer → Assets (soft)

**Feature:** S1.3  
**TechLead (API-wiring):** APPROVED  
**Soft follow-up (ei blocker DONE:lle jos QA passaa AC:t):**

`EnhanceStudio` tallentaa historian `localStorage` avaimeen `muapi_enhance_history`.  
W8 `assetsStore` on SSoT — Enhance-tulokset kannattaa myös:

```js
import { saveGeneration } from "../lib/assetsStore.js";

await saveGeneration({
  url: res.url,
  type: "image",
  model: modelUsed,
  studio: "enhance",
  refs: [sourceUrl],
  meta: { upscaleFactor, presetId, beforeUrl: sourceUrl },
});
```

Ei uutta clienttiä; `generateI2I` + topaz on oikein. Tab shellissä OK.
