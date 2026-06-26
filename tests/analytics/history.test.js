const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDenseHistory } = require('../../lib/analytics/history.js');

test('buildDenseHistory inserts zero days that are missing', () => {
  const result = buildDenseHistory([
    { day: '2026-06-26', kcal: 1800, protein: 140, workouts_kcal: 200, net_kcal: 1600 },
    { day: '2026-06-24', kcal: 2200, protein: 170, workouts_kcal: 0, net_kcal: 2200 },
  ], {
    endDate: '2026-06-26',
    days: 3,
  });

  assert.deepEqual(result, [
    { day: '2026-06-26', kcal: 1800, protein: 140, workouts_kcal: 200, net_kcal: 1600 },
    { day: '2026-06-25', kcal: 0, protein: 0, workouts_kcal: 0, net_kcal: 0 },
    { day: '2026-06-24', kcal: 2200, protein: 170, workouts_kcal: 0, net_kcal: 2200 },
  ]);
});

test('buildDenseHistory returns all-zero range when there is no source data', () => {
  const result = buildDenseHistory([], {
    endDate: '2026-06-26',
    days: 2,
  });

  assert.deepEqual(result, [
    { day: '2026-06-26', kcal: 0, protein: 0, workouts_kcal: 0, net_kcal: 0 },
    { day: '2026-06-25', kcal: 0, protein: 0, workouts_kcal: 0, net_kcal: 0 },
  ]);
});
