const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getItemResource,
  buildEditPayload,
  buildDeleteCopy,
} = require('../../lib/analytics/item-actions.js');

test('getItemResource resolves meal endpoints', () => {
  assert.deepEqual(getItemResource({ id: 42, type: 'meal' }), {
    itemType: 'meal',
    recordId: 42,
    endpoint: '/api/meals/42',
  });
});

test('getItemResource resolves workout endpoints from prefixed ids', () => {
  assert.deepEqual(getItemResource({ id: 'w-18', type: 'workout' }), {
    itemType: 'workout',
    recordId: 18,
    endpoint: '/api/workouts/18',
  });
});

test('buildEditPayload keeps only editable meal fields', () => {
  assert.deepEqual(
    buildEditPayload({
      id: 42,
      type: 'meal',
      description: 'Almoço',
      amount: 250,
      unit: 'g',
      calories: 610,
      protein: 45,
      carbs: 62,
      fat: 18,
      logged_at: '2026-06-26 12:30:00',
      extra: 'ignored',
    }),
    {
      description: 'Almoço',
      amount: 250,
      unit: 'g',
      calories: 610,
      protein: 45,
      carbs: 62,
      fat: 18,
      logged_at: '2026-06-26T12:30',
    }
  );
});

test('buildEditPayload maps workout timeline items to workout api shape', () => {
  assert.deepEqual(
    buildEditPayload({
      id: 'w-18',
      type: 'workout',
      description: 'Corrida',
      amount: 32,
      calories: 280,
      logged_at: '2026-06-26 18:40:00',
      unit: 'min',
    }),
    {
      modality: 'Corrida',
      duration_min: 32,
      calories: 280,
      logged_at: '2026-06-26T18:40',
    }
  );
});

test('buildDeleteCopy is human for meal and workout', () => {
  assert.equal(buildDeleteCopy({ type: 'meal', description: 'Jantar' }), 'Apagar refeição “Jantar”?');
  assert.equal(buildDeleteCopy({ type: 'workout', description: 'Corrida' }), 'Apagar treino “Corrida”?');
});
