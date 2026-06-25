function getFoodAiConfig() {
  const baseUrl = process.env.FOOD_AI_BASE_URL || process.env.XIAOMI_TOKEN_PLAN_BASE_URL;
  const apiKey = process.env.FOOD_AI_API_KEY || process.env.XIAOMI_TOKEN_PLAN_API_KEY;
  const model = process.env.FOOD_AI_MODEL || process.env.XIAOMI_TOKEN_PLAN_MODEL || 'mimo-v2.5';
  const timeoutMs = Number(process.env.FOOD_AI_TIMEOUT_MS || 45000);

  return {
    baseUrl,
    apiKey,
    model,
    timeoutMs,
    configured: Boolean(baseUrl && apiKey && model),
  };
}

module.exports = { getFoodAiConfig };
