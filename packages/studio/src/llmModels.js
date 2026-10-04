/**
 * Hand-maintained Director LLM catalog. P1 frontier slugs only.
 * Not generated from models_dump.json — do not add these rows to models.js.
 * transport "slug" posts /api/v1/{endpoint} with prompt + system_prompt.
 * List `cost` is not a token price and is not stored.
 */

export const LLM_FAMILY_PRIORITY = [
  "gpt-6",
  "gpt-5.6",
  "gpt-5.5",
  "claude-fable",
  "claude-opus",
  "claude-sonnet",
  "gemini-3.8",
  "gemini-3-pro",
  "grok-4",
  "kimi",
  "deepseek-v4",
];

/** First mode when the user picks a family. Director's initial state is still no id. */
export const LLM_FAMILY_DEFAULT_ID = {
  "gpt-6": "gpt-6-astra",
  "gpt-5.6": "gpt-5-6-sol",
  "gpt-5.5": "gpt-5-5",
  "claude-fable": "claude-fable-5-1",
  "claude-opus": "claude-opus-5-5",
  "claude-sonnet": "claude-sonnet-5-5",
  "gemini-3.8": "gemini-3-8-flash",
  "gemini-3-pro": "gemini-3-1-pro",
  "grok-4": "grok-4-7",
  kimi: "kimi-k3",
  "deepseek-v4": "deepseek-v4-pro",
};

const DEFAULT_SYSTEM_PROMPT = "You are a helpful creative AI assistant.";

function llmEntry(name, family, modeKey, modeLabel, slug) {
  return {
    id: slug,
    name,
    family,
    modeKey,
    modeLabel,
    transport: "slug",
    endpoint: slug,
  };
}

export const llmModels = [
  llmEntry("GPT-6", "gpt-6", "astra", "Astra", "gpt-6-astra"),
  llmEntry("GPT-6", "gpt-6", "1-sol", "1 Sol", "gpt-6-1-sol"),
  llmEntry("GPT-6", "gpt-6", "sol", "Sol", "gpt-6-sol"),
  llmEntry("GPT-6", "gpt-6", "luna", "Luna", "gpt-6-luna"),
  llmEntry("GPT-5.6", "gpt-5.6", "sol", "Sol", "gpt-5-6-sol"),
  llmEntry("GPT-5.6", "gpt-5.6", "terra", "Terra", "gpt-5-6-terra"),
  llmEntry("GPT-5.6", "gpt-5.6", "luna", "Luna", "gpt-5-6-luna"),
  llmEntry("GPT-5.5", "gpt-5.5", "standard", "Standard", "gpt-5-5"),
  llmEntry("Claude Fable", "claude-fable", "5", "5", "claude-fable-5"),
  llmEntry("Claude Fable", "claude-fable", "5-1", "5.1", "claude-fable-5-1"),
  llmEntry("Claude Opus", "claude-opus", "5-5", "5.5", "claude-opus-5-5"),
  llmEntry("Claude Opus", "claude-opus", "5", "5", "claude-opus-5"),
  llmEntry("Claude Sonnet", "claude-sonnet", "5-5", "5.5", "claude-sonnet-5-5"),
  llmEntry("Claude Sonnet", "claude-sonnet", "5", "5", "claude-sonnet-5"),
  llmEntry("Gemini 3.8 Flash", "gemini-3.8", "flash", "Flash", "gemini-3-8-flash"),
  llmEntry("Gemini 3 Pro", "gemini-3-pro", "pro", "Pro", "gemini-3-pro"),
  llmEntry("Gemini 3 Pro", "gemini-3-pro", "3-1-pro", "3.1 Pro", "gemini-3-1-pro"),
  llmEntry("Grok 4.7", "grok-4", "4-7", "4.7", "grok-4-7"),
  llmEntry("Kimi K3", "kimi", "k3", "K3", "kimi-k3"),
  llmEntry("DeepSeek V4", "deepseek-v4", "pro", "Pro", "deepseek-v4-pro"),
  llmEntry("DeepSeek V4", "deepseek-v4", "1-flash", "1 Flash", "deepseek-v4-1-flash"),
  llmEntry("DeepSeek V4", "deepseek-v4", "flash", "Flash", "deepseek-v4-flash"),
];

export function getLlmModelById(id) {
  if (!id) return null;
  return llmModels.find((model) => model.id === id) || null;
}

/**
 * Resolve a text call to either the current any-llm gateway or a named slug.
 * Slug bodies are prompt + system_prompt only (no model, no messages).
 */
export function buildLlmCall({
  baseUrl = "",
  prompt,
  systemPrompt,
  model,
  modelId,
} = {}) {
  const entry = modelId ? getLlmModelById(modelId) : null;
  const slugTransport = !!(entry && entry.transport === "slug" && entry.endpoint);
  const endpoint = slugTransport ? entry.endpoint : "any-llm";
  const body = {
    prompt,
    system_prompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  };
  if (!slugTransport && model) body.model = model;
  return {
    url: `${baseUrl}/api/v1/${endpoint}`,
    body,
    transport: slugTransport ? "slug" : "any-llm",
    endpoint,
  };
}
