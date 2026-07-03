#!/usr/bin/env node
/**
 * Test MuAPI Model Endpoints for Deprecation
 * 
 * This script tests all model endpoints to identify which models are deprecated.
 * It sends minimal requests and checks for 404 errors, "model not found" messages,
 * and deprecation headers.
 * 
 * Usage:
 *   node scripts/test-model-endpoints.js
 *   MUAPI_KEY=your_key node scripts/test-model-endpoints.js
 * 
 * Output:
 *   - scripts/test-results/deprecated-models.json (machine-readable)
 *   - scripts/test-results/deprecated-models.md (human-readable)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import model definitions
const modelsPath = path.join(__dirname, '..', 'src', 'lib', 'models.js');

// Configuration
const BASE_URL = 'https://api.muapi.ai';
const API_KEY = process.env.MUAPI_KEY || process.env.VITE_MUAPI_KEY || null;
const DELAY_MS = 200; // Delay between requests to avoid rate limiting
const TIMEOUT_MS = 10000; // 10 second timeout per request

// Results storage
const results = {
  testDate: new Date().toISOString(),
  totalModelsTested: 0,
  categories: {
    available: [],
    deprecated: [],
    rateLimited: [],
    serverError: [],
    clientError: [],
    unknownError: [],
    skipped: []
  }
};

// Deprecation indicators
const deprecationPatterns = [
  /model not found/i,
  /endpoint not found/i,
  /deprecated/i,
  /no longer available/i,
  /discontinued/i,
  /removed/i,
  /invalid model/i,
  /unsupported model/i,
  /model.*deprecated/i,
  /please use.*instead/i,
  /not available/i,
  /deprecated.*model/i,
  /model.*removed/i
];

const deprecationHeaders = [
  'deprecation',
  'sunset',
  'x-api-status',
  'x-deprecated',
  'x-replacement-model',
  'x-model-status'
];

// Minimal test payloads by model type
const testPayloads = {
  t2i: {
    prompt: "test image",
    aspect_ratio: "1:1",
    num_images: 1
  },
  t2v: {
    prompt: "test video",
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "480p"
  },
  i2i: {
    prompt: "edit test",
    aspect_ratio: "1:1",
    image_url: "https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test"
  },
  i2v: {
    prompt: "animate test",
    image_url: "https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test",
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "480p"
  },
  v2v: {
    video_url: "https://via.placeholder.com/test.mp4",
    prompt: "extend"
  },
  lipsync: {
    image_url: "https://via.placeholder.com/512x512.png/000000/FFFFFF?text=test",
    audio_url: "https://via.placeholder.com/test.mp3"
  },
  audio: {
    prompt: "test audio",
    duration: 5
  }
};

// Helper: Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Extract endpoint from model
function getEndpoint(model, category) {
  // Use explicit endpoint if defined
  if (model.endpoint) {
    return `${BASE_URL}/api/v1/${model.endpoint}`;
  }
  
  // Derive endpoint from model ID
  const id = model.id;
  
  // Map common patterns
  const endpointMap = {
    't2i': '-image',
    't2v': '-text-to-video',
    'i2i': '-edit',
    'i2v': '-image-to-video',
    'v2v': '-video-to-video',
    'lipsync': '-lipsync'
  };
  
  // Default mapping
  return `${BASE_URL}/api/v1/${id}`;
}

// Helper: Get payload for model type
function getPayload(model, category) {
  // Try to determine appropriate payload based on category
  if (category.includes('t2i')) return testPayloads.t2i;
  if (category.includes('t2v')) return testPayloads.t2v;
  if (category.includes('i2i')) return testPayloads.i2i;
  if (category.includes('i2v')) return testPayloads.i2v;
  if (category.includes('v2v')) return testPayloads.v2v;
  if (category.includes('lipsync')) return testPayloads.lipsync;
  if (category.includes('audio') || category.includes('tts') || category.includes('music') || category.includes('sfx')) {
    return testPayloads.audio;
  }
  
  // Default to t2i if unclear
  return testPayloads.t2i;
}

// Helper: Test single model
async function testModel(model, category) {
  const endpoint = getEndpoint(model, category);
  const payload = getPayload(model, category);
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;
    
    // Check for deprecation headers
    const headers = {};
    deprecationHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) headers[header] = value;
    });
    
    // Get response body for error analysis
    let body = null;
    let bodyText = '';
    try {
      bodyText = await response.text();
      body = JSON.parse(bodyText);
    } catch (e) {
      // Not JSON, keep text
    }
    
    const result = {
      id: model.id,
      name: model.name,
      category,
      endpoint,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body || bodyText.substring(0, 500)
    };
    
    // Categorize result
    if (response.status === 404) {
      // Definitely deprecated
      result.deprecated = true;
      result.reason = '404 - Endpoint not found';
      results.categories.deprecated.push(result);
    } else if (response.status === 429) {
      // Rate limited
      result.retryAfter = response.headers.get('retry-after');
      results.categories.rateLimited.push(result);
    } else if (response.status >= 500) {
      // Server error - may be temporarily unavailable
      results.categories.serverError.push(result);
    } else if (response.status >= 400 && response.status < 500) {
      // Client error - check if it's "model not found"
      const responseText = JSON.stringify(body || bodyText).toLowerCase();
      const isDeprecated = deprecationPatterns.some(pattern => pattern.test(responseText));
      
      if (isDeprecated) {
        result.deprecated = true;
        result.reason = 'Model deprecated or not available';
        results.categories.deprecated.push(result);
      } else {
        // Other client error (e.g., invalid payload)
        result.reason = 'Client error - may need different payload';
        results.categories.clientError.push(result);
      }
    } else if (response.status >= 200 && response.status < 300) {
      // Success - model is available
      result.available = true;
      results.categories.available.push(result);
    } else {
      // Unknown status
      results.categories.unknownError.push(result);
    }
    
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const result = {
      id: model.id,
      name: model.name,
      category,
      endpoint,
      error: error.name,
      errorMessage: error.message,
      responseTime,
      deprecated: error.name === 'AbortError' ? undefined : false
    };
    
    if (error.name === 'AbortError') {
      result.reason = 'Request timeout - endpoint may be slow or unavailable';
      results.categories.unknownError.push(result);
    } else {
      result.reason = `Network error: ${error.message}`;
      results.categories.unknownError.push(result);
    }
    
    return result;
  }
}

// Helper: Import models dynamically
async function loadModels() {
  try {
    // Read the models.js file and extract model arrays
    const modelsContent = fs.readFileSync(modelsPath, 'utf8');
    
    // Create a module from the content
    const modulePath = `file://${modelsPath}`;
    const modelsModule = await import(modulePath);
    
    const allModels = [];
    
    // Extract all model categories
    const categories = {
      't2iModels': modelsModule.t2iModels || [],
      't2vModels': modelsModule.t2vModels || [],
      'i2iModels': modelsModule.i2iModels || [],
      'i2vModels': modelsModule.i2vModels || [],
      'v2vModels': modelsModule.v2vModels || [],
      'lipsyncModels': modelsModule.lipsyncModels || [],
      'ttsModels': modelsModule.ttsModels || [],
      'musicModels': modelsModule.musicModels || [],
      'sfxModels': modelsModule.sfxModels || []
    };
    
    for (const [category, models] of Object.entries(categories)) {
      if (Array.isArray(models)) {
        models.forEach(model => {
          allModels.push({ ...model, _category: category });
        });
      }
    }
    
    return allModels;
  } catch (error) {
    console.error('❌ Error loading models:', error.message);
    process.exit(1);
  }
}

// Helper: Print progress
function printProgress(current, total, model) {
  const percent = Math.round((current / total) * 100);
  process.stdout.write(`\r[${percent}%] Testing ${current}/${total}: ${model.id.padEnd(40)}`);
}

// Helper: Print results summary
function printSummary() {
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS SUMMARY                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const { available, deprecated, rateLimited, serverError, clientError, unknownError, skipped } = results.categories;
  const total = results.totalModelsTested;
  
  console.log(`Total Models Tested: ${total}`);
  console.log('');
  console.log(`✅ Available:           ${available.length} models`);
  console.log(`❌ Deprecated:          ${deprecated.length} models`);
  console.log(`⚠️  Rate Limited:       ${rateLimited.length} models`);
  console.log(`🔥 Server Error:        ${serverError.length} models`);
  console.log(`📝 Client Error:        ${clientError.length} models`);
  console.log(`❓ Unknown Error:       ${unknownError.length} models`);
  console.log(`⏭️  Skipped:            ${skipped.length} models`);
  console.log('');
  
  if (deprecated.length > 0) {
    console.log('─────────────────────────────────────────────────────────────');
    console.log('CONFIRMED DEPRECATED MODELS (should be removed):');
    console.log('─────────────────────────────────────────────────────────────');
    deprecated.forEach((r, i) => {
      console.log(`${i + 1}. ${r.id} (${r.category})`);
      console.log(`   Status: ${r.status} | ${r.reason || 'Model not found'}`);
    });
  }
  
  if (clientError.length > 0) {
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('CLIENT ERRORS (may need payload adjustment):');
    console.log('─────────────────────────────────────────────────────────────');
    clientError.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.id} (${r.category})`);
      console.log(`   Status: ${r.status} | ${r.body || 'No details'}`);
    });
    if (clientError.length > 10) {
      console.log(`   ... and ${clientError.length - 10} more`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
}

// Helper: Save results to files
function saveResults() {
  const resultsDir = path.join(__dirname, 'test-results');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Save JSON results
  const jsonPath = path.join(resultsDir, 'deprecated-models.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`📄 JSON results saved to: ${jsonPath}`);
  
  // Generate Markdown report
  const mdLines = [
    '# Model Endpoint Test Results',
    '',
    `**Test Date:** ${results.testDate}`,
    `**Total Models Tested:** ${results.totalModelsTested}`,
    '',
    '## Summary',
    '',
    `| Category | Count |`,
    `|----------|-------|`,
    `| ✅ Available | ${results.categories.available.length} |`,
    `| ❌ Deprecated | ${results.categories.deprecated.length} |`,
    `| ⚠️ Rate Limited | ${results.categories.rateLimited.length} |`,
    `| 🔥 Server Error | ${results.categories.serverError.length} |`,
    `| 📝 Client Error | ${results.categories.clientError.length} |`,
    `| ❓ Unknown Error | ${results.categories.unknownError.length} |`,
    `| ⏭️ Skipped | ${results.categories.skipped.length} |`,
    '',
    '## Deprecated Models (Recommended for Removal)',
    '',
    'These models returned 404 or explicit deprecation errors:',
    ''
  ];
  
  if (results.categories.deprecated.length === 0) {
    mdLines.push('*No deprecated models detected.*', '');
  } else {
    results.categories.deprecated.forEach((r, i) => {
      mdLines.push(`${i + 1}. **${r.id}** (${r.name})`);
      mdLines.push(`   - Category: ${r.category}`);
      mdLines.push(`   - Status: ${r.status}`);
      mdLines.push(`   - Reason: ${r.reason || 'Model not found'}`);
      mdLines.push(`   - Response: \`${JSON.stringify(r.body).substring(0, 100)}\``);
      mdLines.push('');
    });
  }
  
  mdLines.push(
    '## Models Needing Investigation',
    '',
    'These models returned client errors (400-range) and may need different payloads:',
    ''
  );
  
  if (results.categories.clientError.length === 0) {
    mdLines.push('*No models need investigation.*', '');
  } else {
    results.categories.clientError.forEach((r, i) => {
      mdLines.push(`${i + 1}. **${r.id}** (${r.name})`);
      mdLines.push(`   - Category: ${r.category}`);
      mdLines.push(`   - Status: ${r.status}`);
      mdLines.push(`   - Response: ${JSON.stringify(r.body).substring(0, 200)}`);
      mdLines.push('');
    });
  }
  
  mdLines.push(
    '## Available Models',
    '',
    'These models are confirmed working:',
    ''
  );
  
  if (results.categories.available.length === 0) {
    mdLines.push('*No available models confirmed.*', '');
  } else {
    mdLines.push(`**Total:** ${results.categories.available.length} models available`, '');
    mdLines.push('<details>');
    mdLines.push('<summary>Click to see full list</summary>');
    mdLines.push('');
    results.categories.available.forEach((r, i) => {
      mdLines.push(`${i + 1}. ${r.id} (${r.category}) - ${r.status} (${r.responseTime}ms)`);
    });
    mdLines.push('</details>');
    mdLines.push('');
  }
  
  // Save Markdown report
  const mdPath = path.join(resultsDir, 'deprecated-models.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  console.log(`📄 Markdown report saved to: ${mdPath}`);
}

// Main function
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         MuAPI Model Deprecation Testing Tool                   ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Check for API key
  if (!API_KEY) {
    console.error('❌ Error: No API key found.');
    console.error('Set MUAPI_KEY or VITE_MUAPI_KEY environment variable.');
    console.error('\nExample: MUAPI_KEY=your_key node scripts/test-model-endpoints.js');
    process.exit(1);
  }
  
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`⏱️  Request Delay: ${DELAY_MS}ms`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);
  
  // Load models
  console.log('📦 Loading model definitions...');
  const models = await loadModels();
  console.log(`✅ Loaded ${models.length} models from src/lib/models.js\n`);
  
  // Test each model
  console.log('🧪 Testing endpoints...\n');
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    printProgress(i + 1, models.length, model);
    
    const result = await testModel(model, model._category);
    results.totalModelsTested++;
    
    // Add delay between requests (except for last one)
    if (i < models.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  // Print summary
  printSummary();
  
  // Save results
  saveResults();
  
  console.log('\n✅ Testing complete!');
  
  // Exit with error code if deprecated models found
  if (results.categories.deprecated.length > 0) {
    console.log(`\n⚠️  Found ${results.categories.deprecated.length} deprecated models.`);
    console.log('   Review the results and consider removing them from models.js');
    process.exit(0); // Don't fail, just warn
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
