const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatLoggedAtForInput,
  getHistoryCaloriesBar,
  formatTimelineTime,
} = require('../../lib/analytics/presentation.js');

test('formatLoggedAtForInput normalizes db timestamp for datetime-local fields', () => {
  assert.equal(formatLoggedAtForInput('2026-06-26 12:34:56'), '2026-06-26T12:34');
  assert.equal(formatLoggedAtForInput('2026-06-26T06:07:08Z'), '2026-06-26T06:07');
  assert.equal(formatLoggedAtForInput(null), '');
});

test('formatTimelineTime returns local hour and minute', () => {
  assert.equal(formatTimelineTime('2026-06-26 12:34:56'), '12:34');
  assert.equal(formatTimelineTime(undefined), '--:--');
});

test('getHistoryCaloriesBar leaves zero-calorie days truly empty', () => {
  assert.deepEqual(getHistoryCaloriesBar({ kcal: 0 }, 2500), {
    width: '0%',
    background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
    tone: 'emerald',
  });
});

test('getHistoryCaloriesBar gets warmer as calories approach and exceed goal', () => {
  const mid = getHistoryCaloriesBar({ kcal: 1800 }, 2500);
  const over = getHistoryCaloriesBar({ kcal: 3200 }, 2500);

  assert.equal(mid.width, '72%');
  assert.equal(mid.tone, 'amber');
  assert.match(mid.background, /f59e0b|f97316/i);

  assert.equal(over.width, '100%');
  assert.equal(over.tone, 'red');
  assert.match(over.background, /ef4444|dc2626/i);
});
