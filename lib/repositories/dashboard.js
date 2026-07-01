const { execute } = require('../db.js');
const { getTodayInTimezone } = require('../date.js');
const { buildDenseHistory } = require('../analytics/history.js');
const { getWorkoutColumns, buildWorkoutSelectList } = require('./workouts.js');

function buildDateFilter(targetDate) {
  return targetDate === 'now'
    ? { sql: `date('now', '-3 hours')`, args: [] }
    : { sql: '?', args: [targetDate] };
}

async function getDashboardData(targetDate = 'now') {
  const dateFilter = buildDateFilter(targetDate);
  const workoutColumns = await getWorkoutColumns();
  const workoutSelectList = buildWorkoutSelectList(workoutColumns);

  const [summaryRes, goalsRes, itemsRes, historyRes, activityRes, workoutSummaryRes, workoutItemsRes] = await Promise.all([
    execute(
      `SELECT COALESCE(SUM(calories), 0) as kcal, COALESCE(SUM(protein), 0) as protein, COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter.sql}`,
      dateFilter.args
    ),
    execute(`SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1`),
    execute(
      `SELECT id, description, amount, unit, calories, protein, carbs, fat, logged_at FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`,
      dateFilter.args
    ),
    execute(
      `
        SELECT
          day,
          SUM(kcal) as kcal,
          SUM(protein) as protein,
          SUM(workouts_kcal) as workouts_kcal,
          SUM(kcal) - SUM(workouts_kcal) as net_kcal
        FROM (
          SELECT date(logged_at, '-3 hours') as day, SUM(calories) as kcal, SUM(protein) as protein, 0 as workouts_kcal
          FROM meals GROUP BY date(logged_at, '-3 hours')
          UNION ALL
          SELECT date(logged_at, '-3 hours') as day, 0 as kcal, 0 as protein, SUM(calories) as workouts_kcal
          FROM workouts GROUP BY date(logged_at, '-3 hours')
        )
        GROUP BY day
        ORDER BY day DESC
        LIMIT 30
      `,
      []
    ),
    execute(
      `SELECT type, value, unit, logged_at FROM activity WHERE date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`,
      dateFilter.args
    ),
    execute(
      `SELECT COALESCE(SUM(calories), 0) as workout_kcal, COALESCE(SUM(duration_min), 0) as duration_min, COUNT(*) as workout_count FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter.sql}`,
      dateFilter.args
    ),
    execute(
      `SELECT ${workoutSelectList} FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`,
      dateFilter.args
    ),
  ]);

  const mealItems = (itemsRes.rows || []).map((row) => ({ ...row, type: 'meal' }));
  const workoutItems = (workoutItemsRes.rows || []).map((row) => ({
    id: `w-${row.id}`,
    description: row.modality,
    amount: row.duration_min,
    unit: 'min',
    calories: row.calories,
    protein: 0,
    carbs: 0,
    fat: 0,
    logged_at: row.logged_at,
    type: 'workout',
    workout_type: row.workout_type || null,
    intensity: row.intensity || null,
    notes: row.notes || null,
  }));

  const combinedItems = [...mealItems, ...workoutItems].sort((a, b) => {
    const aTime = new Date(`${String(a.logged_at).replace(' ', 'T')}Z`).getTime();
    const bTime = new Date(`${String(b.logged_at).replace(' ', 'T')}Z`).getTime();
    return aTime - bTime;
  });

  const workoutSummary = workoutSummaryRes.rows[0] || { workout_kcal: 0, duration_min: 0, workout_count: 0 };
  const historyEndDate = targetDate === 'now'
    ? getTodayInTimezone(new Date(), 'America/Sao_Paulo')
    : targetDate;

  return {
    summary: summaryRes.rows[0],
    goals: goalsRes.rows[0] || { calories: 2200, protein: 180, carbs: 180, fat: 84 },
    items: combinedItems,
    history: buildDenseHistory(historyRes.rows || [], { endDate: historyEndDate, days: 30 }),
    activity: activityRes.rows || [],
    workouts: {
      total: workoutSummary.workout_kcal || 0,
      duration: workoutSummary.duration_min || 0,
      count: workoutSummary.workout_count || 0,
    },
  };
}

module.exports = {
  getDashboardData,
};
