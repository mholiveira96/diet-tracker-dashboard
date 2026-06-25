const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMealInsert,
  buildWorkoutInsert,
} = require('../../lib/chat/persist.js');

test('buildMealInsert normalizes numbers and defaults amount/unit', () => {
  const insert = buildMealInsert({
    description: 'Banana',
    calories: '105',
    protein: '1.3',
    carbs: '27',
    fat: '0.4',
  });

  assert.equal(insert.sql.includes('INSERT INTO meals'), true);
  assert.deepEqual(insert.args.slice(0, 7), ['Banana', 1, 'porção', 105, 1.3, 27, 0.4]);
});

test('buildWorkoutInsert normalizes workout writes', () => {
  const insert = buildWorkoutInsert({
    modality: 'corrida',
    duration_min: '32',
    calories: '280',
  });

  assert.equal(insert.sql.includes('INSERT INTO workouts'), true);
  assert.deepEqual(insert.args.slice(0, 3), ['corrida', 32, 280]);
});
