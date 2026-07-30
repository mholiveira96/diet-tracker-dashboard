const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDeficitLeaderboard } = require('../../lib/group/leaderboard.js');

test('buildDeficitLeaderboard ranks only profiles with seven-day activity by deficit percentage', () => {
  const result = buildDeficitLeaderboard([
    { id: 1, slug: 'matheus', display_name: 'Matheus', goal_calories: 2000, kcal: 11200, workout_kcal: 1400, active_days: 7 },
    { id: 2, slug: 'joyce', display_name: 'Joyce', goal_calories: 1800, kcal: 9900, workout_kcal: 0, active_days: 6 },
    { id: 3, slug: 'allan', display_name: 'Allan', goal_calories: 2200, kcal: 0, workout_kcal: 0, active_days: 0 },
  ]);

  assert.deepEqual(result.map((item) => item.slug), ['matheus', 'joyce']);
  assert.equal(result[0].seven_day_goal, 14000);
  assert.equal(result[0].net_calories, 9800);
  assert.equal(result[0].deficit_calories, 4200);
  assert.equal(result[0].deficit_percent, 30);
  assert.equal(result[1].deficit_percent, 21.428571428571427);
});
