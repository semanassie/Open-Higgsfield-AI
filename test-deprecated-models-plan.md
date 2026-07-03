# Plan: Test API Endpoints for Deprecated Models

## Objective
Systematically test all model endpoints to identify which models are deprecated/unavailable on MuAPI.ai by checking for 404 errors, "model not found" messages, and deprecation headers.

## Testing Strategy

### Phase 1: Create Test Script (High Priority)
Create a Node.js script that:
1. Reads all model IDs from `models.js`
2. Makes minimal API calls to each endpoint
3. Records response status codes, error messages, and headers
4. Generates a report of unavailable models

### Phase 2: Categorized Testing
Test models by category to identify patterns in deprecations.

### Phase 3: Results Analysis
Analyze results and update model files to remove confirmed deprecated models.

---

## Implementation Steps

### Step 1: Create Test Script

**File:** `scripts/test-model-endpoints.js`

**Requirements:**
- Load API key from `.env` or prompt user
- Import model lists from `src/lib/models.js`
- For each model:
  - Send minimal test request (small payload, short prompt)
  - Capture:
    - HTTP status code (200, 404, 400, 503, etc.)
    - Response body (error messages)
    - Response headers (look for `Deprecation`, `Sunset`, `X-API-Status`)
    - Response time
  - Categorize result:
    - ✅ Available (2xx status)
    - ❌ Deprecated (404, "model not found", "deprecated" in body)
    - ⚠️ Rate Limited (429)
    - ⚠️ Server Error (5xx)
    - ⚠️ Unknown Error (other)

### Step 2: Define Test Payloads by Model Type

```javascript
// Minimal test payloads to avoid unnecessary costs
const testPayloads = {
  t2i: {
    prompt: "test",
    aspect_ratio: "1:1",
    num_images: 1
  },
  t2v: {
    prompt: "test",
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "480p"
  },
  i2i: {
    prompt: "test",
    image_url: "https://via.placeholder.com/512x512.png",
    aspect_ratio: "1:1"
  },
  i2v: {
    prompt: "test",
    image_url: "https://via.placeholder.com/512x512.png",
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "480p"
  },
  v2v: {
    video_url: "https://via.placeholder.com/512x512.mp4",
    prompt: "extend"
  },
  lipsync: {
    image_url: "https://via.placeholder.com/512x512.png",
    audio_url: "https://via.placeholder.com/test.mp3"
  }
};
```

### Step 3: Priority Testing Order

Test in this order (most likely deprecated first):

**Batch 1: Very Likely Deprecated (Quick Wins)**
| Priority | Model Category | Models to Test |
|----------|---------------|----------------|
| 1 | Wan 2.1 | `wan2.1-text-to-image`, `wan2.1-text-to-video`, `wan2.1-i2v` |
| 2 | Seedance v1.5 | `seedance-v1.5-pro-t2v`, `seedance-v1.5-pro-t2v-fast`, `seedance-lite-t2v` |
| 3 | Kling v2.1 | All v2.1 master/standard/pro variants (T2V and I2V) |
| 4 | Veo 3.0 | `veo3-text-to-video`, `veo3-fast-text-to-video`, `veo3-image-to-video` |
| 5 | Pixverse v4.5 | `pixverse-v4.5-t2v`, `pixverse-v4.5-i2v`, `pixverse-v4.5-transition` |
| 6 | Hailuo 02 | `minimax-hailuo-02-standard-t2v`, `minimax-hailuo-02-pro-t2v` |

**Batch 2: Possibly Deprecated (Medium Priority)**
| Priority | Model Category | Models to Test |
|----------|---------------|----------------|
| 7 | Wan 2.5/2.6 | `wan2.5-text-to-image`, `wan2.6-text-to-image`, `wan2.5-text-to-video`, `wan2.6-text-to-video` |
| 8 | Kling v2.5/2.6 | `kling-v2.5-turbo-pro-t2v`, `kling-v2.6-pro-t2v`, I2V variants |
| 9 | Seedream v3/v4 | `bytedance-seedream-v3`, `bytedance-seedream-v4` |
| 10 | Original Flux | `flux-dev`, `flux-schnell`, `flux-pulid`, `flux-redux` |
| 11 | Pixverse v5.x | `pixverse-v5-t2v`, `pixverse-v5.5-t2v`, I2V and V2V variants |
| 12 | SDXL | `sdxl-image`, `sdxl-image-editing` |

**Batch 3: Verify Current Models (Low Priority)**
| Priority | Model Category | Models to Test |
|----------|---------------|----------------|
| 13 | Wan 2.7 | All newly added 2.7 variants (should be available) |
| 14 | Seedance 2.0 | All 2.0 variants including Omni Reference |
| 15 | Kling O1 | All O1 series (should be available) |
| 16 | Kling v3.0 | All v3.0 variants (should be available) |
| 17 | Veo 3.1 | All 3.1 variants including 4K (should be available) |
| 18 | Pixverse v6 | All v6 variants (should be available) |
| 19 | Flux 2.x | `flux-2-dev`, `flux-2-flex`, `flux-2-pro`, `flux-2-klein-*` |
| 20 | Flux Kontext | All Kontext variants (should be available) |

### Step 4: Response Analysis

**Check for these deprecation indicators:**

```javascript
const deprecationIndicators = {
  // HTTP Status Codes
  statusCodes: [404, 410, 400],
  
  // Error message patterns in response body
  errorPatterns: [
    /model not found/i,
    /endpoint not found/i,
    /deprecated/i,
    /no longer available/i,
    /discontinued/i,
    /removed/i,
    /invalid model/i,
    /unsupported model/i,
    /model.*deprecated/i,
    /please use.*instead/i  // Suggests replacement model
  ],
  
  // Deprecation headers to check
  headers: [
    'deprecation',
    'sunset',
    'x-api-status',
    'x-deprecated',
    'x-replacement-model'
  ]
};
```

### Step 5: Output Format

**Generate JSON report:**

```json
{
  "testDate": "2026-04-09",
  "totalModelsTested": 200,
  "results": {
    "available": [
      {"id": "flux-2-pro", "status": 200, "responseTime": 450}
    ],
    "deprecated": [
      {
        "id": "wan2.1-text-to-image",
        "status": 404,
        "error": "Model not found",
        "recommendation": "Remove from models.js"
      }
    ],
    "rateLimited": [
      {"id": "kling-o1-text-to-video", "status": 429, "retryAfter": 60}
    ],
    "serverError": [
      {"id": "veo3.1-4k-video", "status": 503, "message": "Service temporarily unavailable"}
    ],
    "unknownError": [
      {"id": "some-model", "status": 500, "error": "Internal server error"}
    ]
  },
  "summary": {
    "available": 150,
    "deprecated": 30,
    "needsInvestigation": 20
  }
}
```

**Generate Markdown report:**
- List of confirmed deprecated models with removal recommendations
- List of models needing manual verification
- Summary statistics

---

## Testing Script Implementation

### Option A: Lightweight Test (Recommended)
Send minimal requests without waiting for full generation:

```javascript
// Just test if endpoint accepts the request
// Don't wait for generation completion
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(minimalPayload)
});

// If we get a request_id, model is available
// If we get 404/400 with "model not found", model is deprecated
```

### Option B: Full Generation Test (More Expensive)
Actually generate content and verify it works. **Not recommended** for bulk testing due to cost.

---

## Cost Considerations

**Estimated Costs for Lightweight Testing:**
- ~200 models tested
- Each test sends minimal request (no actual generation)
- Should only incur API call overhead, not full generation cost
- Estimated total: <$1 USD if MuAPI charges for failed calls, $0 if not

**To Minimize Costs:**
1. Test during off-peak hours
2. Use minimal payloads
3. Don't poll for results (just check initial response)
4. Group tests to avoid rapid-fire requests

---

## Safety Measures

1. **Rate Limiting:** Add delays between requests (e.g., 100-500ms)
2. **Error Handling:** Catch all errors to prevent script crashes
3. **Resume Capability:** Save progress after each batch
4. **API Key Protection:** Never log the full API key

---

## Next Steps After Testing

1. **Remove Confirmed Deprecated Models:** Delete from `models.js` and `models_dump.json`
2. **Update Documentation:** Remove deprecated models from README
3. **Verify Replacements:** Ensure newer model versions are available
4. **Test UI:** Verify app works correctly with removed models

---

## Files to Create

1. `scripts/test-model-endpoints.js` - Main test script
2. `scripts/test-results/` - Directory for output reports
3. `scripts/test-results/deprecated-models.json` - Machine-readable results
4. `scripts/test-results/deprecated-models.md` - Human-readable report

## Estimated Timeline

- **Script Development:** 30 minutes
- **Batch 1 Testing:** 15 minutes (~30 models)
- **Batch 2 Testing:** 20 minutes (~50 models)
- **Batch 3 Testing:** 15 minutes (~40 models)
- **Analysis & Reporting:** 20 minutes
- **Total:** ~1.5 hours
