function toNumber(value) {
  return Number(value || 0);
}

function buildDeficitLeaderboard(rows) {
  return (rows || [])
    .map((row) => {
      const goalCalories = toNumber(row.goal_calories);
      const calories = toNumber(row.kcal);
      const workoutCalories = toNumber(row.workout_kcal);
      const netCalories = calories - workoutCalories;
      const sevenDayGoal = goalCalories * 7;
      const deficitCalories = sevenDayGoal - netCalories;
      const deficitPercent = sevenDayGoal > 0 ? (deficitCalories / sevenDayGoal) * 100 : null;

      return {
        id: Number(row.id),
        slug: row.slug,
        display_name: row.display_name,
        active_days: toNumber(row.active_days),
        goal_calories: goalCalories,
        kcal: calories,
        workout_kcal: workoutCalories,
        net_calories: netCalories,
        seven_day_goal: sevenDayGoal,
        deficit_calories: deficitCalories,
        deficit_percent: deficitPercent,
      };
    })
    .filter((row) => row.active_days > 0 && row.deficit_percent !== null)
    .sort((a, b) => b.deficit_percent - a.deficit_percent || b.deficit_calories - a.deficit_calories || a.display_name.localeCompare(b.display_name));
}

module.exports = { buildDeficitLeaderboard };
