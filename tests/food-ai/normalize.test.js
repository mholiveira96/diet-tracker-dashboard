const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeWithHeuristics,
  decidePersistenceMode,
} = require('../../lib/food-ai/normalize.js');

test('normalizeWithHeuristics parses structured workout text without AI', () => {
  const result = normalizeWithHeuristics({
    text: 'corrida 32min 280kcal',
    attachments: [],
  });

  assert.equal(result.action, 'log_workout');
  assert.equal(result.modality, 'corrida');
  assert.equal(result.duration_min, 32);
  assert.equal(result.calories, 280);
  assert.equal(result.confidence >= 0.9, true);
});

test('normalizeWithHeuristics asks for clarification on ambiguous text-only meal input', () => {
  const result = normalizeWithHeuristics({
    text: 'almoco normal',
    attachments: [],
  });

  assert.equal(result.action, 'clarify');
  assert.match(result.question, /refei/i);
});

test('decidePersistenceMode auto-saves high-confidence meal parses with macros', () => {
  const decision = decidePersistenceMode({
    action: 'log_meal',
    confidence: 0.95,
    description: 'Omelete com pão',
    calories: 420,
    protein: 24,
    carbs: 30,
    fat: 18,
  });

  assert.deepEqual(decision, { mode: 'auto_save' });
});

test('decidePersistenceMode drafts medium-confidence meal parses', () => {
  const decision = decidePersistenceMode({
    action: 'log_meal',
    confidence: 0.72,
    description: 'Prato de almoço',
    calories: 700,
    protein: 30,
    carbs: 80,
    fat: 20,
  });

  assert.deepEqual(decision, { mode: 'draft' });
});

test('decidePersistenceMode clarifies missing required macros even at high confidence', () => {
  const decision = decidePersistenceMode({
    action: 'log_meal',
    confidence: 0.96,
    description: 'Prato sem macros',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
  });

  assert.equal(decision.mode, 'clarify');
});
