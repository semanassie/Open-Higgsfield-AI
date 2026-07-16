/**
 * Text LLM catalog for Assist + studio helpers.
 * Gateway models go through /api/v1/any-llm-models.
 * Dedicated flagships use their own /api/v1/{endpoint}.
 */

export const LLM_PREF_KEY = 'assist_llm_model';
export const LLM_DEFAULT_PREF_KEY = 'default_llm_model';

/** @typedef {'gateway'|'dedicated'} LlmRoute */

/**
 * @typedef {Object} LlmModel
 * @property {string} id - Stable app id (gateway: provider/model; dedicated: endpoint slug)
 * @property {string} name - UI label
 * @property {LlmRoute} route
 * @property {string} [gatewayModel] - any-llm-models `model` field (gateway only)
 * @property {string} [endpoint] - dedicated API path segment
 * @property {string} [badge]
 * @property {string} [group]
 */

/** Gateway models available via any-llm-models */
export const GATEWAY_LLM_MODELS = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    route: 'gateway',
    gatewayModel: 'google/gemini-2.5-flash',
    badge: 'Default',
    group: 'Gateway',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    route: 'gateway',
    gatewayModel: 'google/gemini-2.5-pro',
    group: 'Gateway',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    route: 'gateway',
    gatewayModel: 'google/gemini-2.0-flash-001',
    group: 'Gateway',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    route: 'gateway',
    gatewayModel: 'openai/gpt-4o',
    badge: 'Premium',
    group: 'Gateway',
  },
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    route: 'gateway',
    gatewayModel: 'openai/gpt-4.1',
    badge: 'Premium',
    group: 'Gateway',
  },
  {
    id: 'openai/gpt-5-chat',
    name: 'GPT-5 Chat',
    route: 'gateway',
    gatewayModel: 'openai/gpt-5-chat',
    badge: 'Premium',
    group: 'Gateway',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    route: 'gateway',
    gatewayModel: 'anthropic/claude-3.5-sonnet',
    badge: 'Premium',
    group: 'Gateway',
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    route: 'gateway',
    gatewayModel: 'anthropic/claude-3.7-sonnet',
    badge: 'Premium',
    group: 'Gateway',
  },
  {
    id: 'meta-llama/llama-4-scout',
    name: 'Llama 4 Scout',
    route: 'gateway',
    gatewayModel: 'meta-llama/llama-4-scout',
    group: 'Gateway',
  },
];

/** Dedicated MuAPI text endpoints (not any-llm gateway) */
export const DEDICATED_LLM_MODELS = [
  {
    id: 'gemini-3-5-flash',
    name: 'Gemini 3.5 Flash',
    route: 'dedicated',
    endpoint: 'gemini-3-5-flash',
    badge: 'Flagship',
    group: 'Dedicated',
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    route: 'dedicated',
    endpoint: 'gemini-3-flash',
    group: 'Dedicated',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    route: 'dedicated',
    endpoint: 'gemini-3-pro',
    group: 'Dedicated',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    route: 'dedicated',
    endpoint: 'claude-sonnet-5',
    badge: 'Flagship',
    group: 'Dedicated',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    route: 'dedicated',
    endpoint: 'claude-sonnet-4-6',
    group: 'Dedicated',
  },
  {
    id: 'gpt-5-6-terra',
    name: 'GPT 5.6 Terra',
    route: 'dedicated',
    endpoint: 'gpt-5-6-terra',
    badge: 'Flagship',
    group: 'Dedicated',
  },
  {
    id: 'gpt-5-6-sol',
    name: 'GPT 5.6 Sol',
    route: 'dedicated',
    endpoint: 'gpt-5-6-sol',
    group: 'Dedicated',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT 5 Mini',
    route: 'dedicated',
    endpoint: 'gpt-5-mini',
    group: 'Dedicated',
  },
];

/** Full catalog shown in Assist / Settings */
export const LLM_MODELS = [...DEDICATED_LLM_MODELS, ...GATEWAY_LLM_MODELS];

/** Per use-case defaults */
export const LLM_DEFAULTS = {
  assist: 'gemini-3-5-flash',
  enhance_prompt: 'google/gemini-2.5-flash',
  character_backstory: 'google/gemini-2.5-flash',
  explainer: 'gemini-3-5-flash',
  influencer: 'google/gemini-2.5-flash',
  global: 'google/gemini-2.5-flash',
};

export function getLlmModelById(id) {
  if (!id) return null;
  return LLM_MODELS.find((m) => m.id === id) || null;
}

/**
 * Resolve which model id to use for a use-case.
 * Preference order: explicit → Assist localStorage → Settings default → use-case default.
 */
export function resolveLlmModelId(useCase = 'global', explicit) {
  if (explicit && getLlmModelById(explicit)) return explicit;

  try {
    if (useCase === 'assist') {
      const assistPref = localStorage.getItem(LLM_PREF_KEY);
      if (assistPref && getLlmModelById(assistPref)) return assistPref;
    }
    const globalPref = localStorage.getItem(LLM_DEFAULT_PREF_KEY);
    if (globalPref && getLlmModelById(globalPref)) return globalPref;
  } catch {
    /* SSR / non-browser */
  }

  return LLM_DEFAULTS[useCase] || LLM_DEFAULTS.global;
}

export function getLlmRoute(modelId) {
  const model = getLlmModelById(modelId);
  if (!model) {
    // Unknown id: treat slash ids as gateway, others as dedicated endpoint slug
    if (typeof modelId === 'string' && modelId.includes('/')) {
      return { route: 'gateway', gatewayModel: modelId, endpoint: null, id: modelId };
    }
    return { route: 'dedicated', gatewayModel: null, endpoint: modelId, id: modelId };
  }
  return {
    route: model.route,
    gatewayModel: model.gatewayModel || null,
    endpoint: model.endpoint || null,
    id: model.id,
  };
}
