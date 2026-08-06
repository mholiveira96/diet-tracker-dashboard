const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMealInsert,
  buildWorkoutInsert,
} = require('../../lib/chat/persist.js');
const { mealItemsForResult } = require('../../lib/chat/ingest.js');

test('buildMealInsert normalizes numbers and defaults amount/unit', () => {
  const insert = buildMealInsert({
    description: 'Banana',
    calories: '105',
    protein: '1.3',
    carbs: '27',
    fat: '0.4',
  }, 7);

  assert.equal(insert.sql.includes('profile_id'), true);
  assert.deepEqual(insert.args, ['Banana', 1, 'porção', 105, 1.3, 27, 0.4, 7]);
});

test('buildWorkoutInsert normalizes workout writes', () => {
  const insert = buildWorkoutInsert({
    modality: 'corrida',
    duration_min: '32',
    calories: '280',
  }, 7);

  assert.equal(insert.sql.includes('profile_id'), true);
  assert.deepEqual(insert.args, ['corrida', 32, 280, 7]);
});

test('mealItemsForResult preserves item-level composite meals', () => {
  const items = mealItemsForResult({
    action: 'log_meal',
    description: 'Almoço',
    meal_items: [
      { description: 'Arroz', amount: 150, unit: 'g', calories: 195 },
      { description: 'Frango', amount: 120, unit: 'g', calories: 198 },
    ],
  });

  assert.deepEqual(items.map((item) => item.description), ['Arroz', 'Frango']);
});
