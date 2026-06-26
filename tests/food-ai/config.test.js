const test = require('node:test');
const assert = require('node:assert/strict');

const { getFoodAiConfigs } = require('../../lib/food-ai/config.js');

test('getFoodAiConfigs returns primary and OpenRouter fallback when configured', () => {
  const saved = {
    FOOD_AI_PROVIDER: process.env.FOOD_AI_PROVIDER,
    FOOD_AI_BASE_URL: process.env.FOOD_AI_BASE_URL,
    FOOD_AI_API_KEY: process.env.FOOD_AI_API_KEY,
    FOOD_AI_MODEL: process.env.FOOD_AI_MODEL,
    FOOD_AI_TIMEOUT_MS: process.env.FOOD_AI_TIMEOUT_MS,
    DIETA_OPENROUTER_API_KEY: process.env.DIETA_OPENROUTER_API_KEY,
    DIETA_OPENROUTER_MODEL: process.env.DIETA_OPENROUTER_MODEL,
    DIETA_OPENROUTER_BASE_URL: process.env.DIETA_OPENROUTER_BASE_URL,
  };

  Object.assign(process.env, {
    FOOD_AI_PROVIDER: 'xiaomi-token-plan',
    FOOD_AI_BASE_URL: 'https://primary.example/v1',
    FOOD_AI_API_KEY: 'primary-key',
    FOOD_AI_MODEL: 'mimo-v2.5',
    FOOD_AI_TIMEOUT_MS: '12345',
    DIETA_OPENROUTER_API_KEY: 'openrouter-key',
    DIETA_OPENROUTER_MODEL: 'mimo-v2.5',
    DIETA_OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  });

  try {
    const configs = getFoodAiConfigs();
    assert.equal(configs.length, 2);
    assert.deepEqual(configs.map((config) => config.provider), ['xiaomi-token-plan', 'openrouter']);
    assert.equal(configs[0].model, 'mimo-v2.5');
    assert.equal(configs[1].model, 'mimo-v2.5');
    assert.equal(configs[1].apiKey, 'openrouter-key');
    assert.equal(configs[0].timeoutMs, 12345);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
