function buildProviderConfig({ provider, baseUrl, apiKey, model, timeoutMs }) {
  return {
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs,
    configured: Boolean(baseUrl && apiKey && model),
  };
}

function getFoodAiConfigs() {
  const timeoutMs = Number(process.env.FOOD_AI_TIMEOUT_MS || 45000);

  const primary = buildProviderConfig({
    provider: process.env.FOOD_AI_PROVIDER || 'xiaomi-token-plan',
    baseUrl: process.env.FOOD_AI_BASE_URL || process.env.XIAOMI_TOKEN_PLAN_BASE_URL,
    apiKey: process.env.FOOD_AI_API_KEY || process.env.XIAOMI_TOKEN_PLAN_API_KEY,
    model: process.env.FOOD_AI_MODEL || process.env.XIAOMI_TOKEN_PLAN_MODEL || 'mimo-v2.5',
    timeoutMs,
  });

  const fallback = buildProviderConfig({
    provider: 'openrouter',
    baseUrl: process.env.DIETA_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.DIETA_OPENROUTER_API_KEY,
    model: process.env.DIETA_OPENROUTER_MODEL || 'mimo-v2.5',
    timeoutMs,
  });

  return [primary, fallback].filter((config, index, list) => {
    if (!config.configured) return false;
    return list.findIndex((item) => item.provider === config.provider && item.baseUrl === config.baseUrl && item.model === config.model) === index;
  });
}

module.exports = { getFoodAiConfigs };
