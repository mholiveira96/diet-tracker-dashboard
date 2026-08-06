const test = require('node:test');
const assert = require('node:assert/strict');

const { buildConsistencyHeatmap } = require('../../lib/group/heatmap.js');

test('buildConsistencyHeatmap creates a year-like Sunday-to-Saturday grid', () => {
  const result = buildConsistencyHeatmap([
    { date: '2026-08-06', status: 'on_target', net_calories: 2000, goal_calories: 2200 },
  ], '2026-08-06', 365);

  assert.equal(result.startDate, '2025-08-07');
  assert.equal(result.endDate, '2026-08-06');
  assert.equal(result.weeks.length, 53);
  assert.equal(result.weeks.every((week) => week.cells.length === 7), true);
  assert.equal(result.weeks[0].cells[0].date, '2025-08-03');
  assert.equal(result.weeks.at(-1).cells.at(-1).date, '2026-08-08');
});

test('buildConsistencyHeatmap preserves recorded days and blanks out missing days', () => {
  const result = buildConsistencyHeatmap([
    { date: '2026-08-03', status: 'below', net_calories: 1800, goal_calories: 2200 },
  ], '2026-08-06', 7);
  const cells = result.weeks.flatMap((week) => week.cells).filter((cell) => cell.inRange);

  assert.equal(cells.length, 7);
  assert.equal(cells.find((cell) => cell.date === '2026-08-03').day.status, 'below');
  assert.equal(cells.filter((cell) => cell.day === null).length, 6);
});
