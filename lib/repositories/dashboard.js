const { execute } = require('../db.js');
const { getTodayInTimezone } = require('../date.js');
const { buildDenseHistory } = require('../analytics/history.js');
const { buildDeficitLeaderboard } = require('../group/leaderboard.js');
const { getWorkoutColumns, buildWorkoutSelectList } = require('./workouts.js');

function buildDateFilter(targetDate) {
  return targetDate === 'now'
    ? { sql: `date('now', '-3 hours')`, args: [] }
    : { sql: '?', args: [targetDate] };
}

function profileDateArgs(profileId, dateFilter) {
  return [profileId, ...dateFilter.args];
}

async function getDashboardData(profileId, targetDate = 'now') {
  if (!Number.isInteger(Number(profileId)) || Number(profileId) < 1) throw new Error('profileId is required');
  const dateFilter = buildDateFilter(targetDate);
  const workoutColumns = await getWorkoutColumns();
  const workoutSelectList = buildWorkoutSelectList(workoutColumns);
  const args = profileDateArgs(profileId, dateFilter);

  const [summaryRes, goalsRes, itemsRes, historyRes, activityRes, workoutSummaryRes, workoutItemsRes] = await Promise.all([
    execute(`SELECT COALESCE(SUM(calories), 0) as kcal, COALESCE(SUM(protein), 0) as protein, COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat FROM meals WHERE profile_id = ? AND deleted_at IS NULL AND date(logged_at, '-3 hours') = ${dateFilter.sql}`, args),
    execute(`SELECT calories, protein, carbs, fat FROM goals WHERE profile_id = ? ORDER BY id DESC LIMIT 1`, [profileId]),
    execute(`SELECT id, description, amount, unit, calories, protein, carbs, fat, logged_at FROM meals WHERE profile_id = ? AND deleted_at IS NULL AND date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`, args),
    execute(`
      SELECT day, SUM(kcal) as kcal, SUM(protein) as protein, SUM(workouts_kcal) as workouts_kcal, SUM(kcal) - SUM(workouts_kcal) as net_kcal
      FROM (
        SELECT date(logged_at, '-3 hours') as day, SUM(calories) as kcal, SUM(protein) as protein, 0 as workouts_kcal
        FROM meals WHERE profile_id = ? AND deleted_at IS NULL GROUP BY date(logged_at, '-3 hours')
        UNION ALL
        SELECT date(logged_at, '-3 hours') as day, 0 as kcal, 0 as protein, SUM(calories) as workouts_kcal
        FROM workouts WHERE profile_id = ? AND deleted_at IS NULL GROUP BY date(logged_at, '-3 hours')
      ) GROUP BY day ORDER BY day DESC LIMIT 30
    `, [profileId, profileId]),
    execute(`SELECT type, value, unit, logged_at FROM activity WHERE profile_id = ? AND date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`, args),
    execute(`SELECT COALESCE(SUM(calories), 0) as workout_kcal, COALESCE(SUM(duration_min), 0) as duration_min, COUNT(*) as workout_count FROM workouts WHERE profile_id = ? AND deleted_at IS NULL AND date(logged_at, '-3 hours') = ${dateFilter.sql}`, args),
    execute(`SELECT ${workoutSelectList} FROM workouts WHERE profile_id = ? AND deleted_at IS NULL AND date(logged_at, '-3 hours') = ${dateFilter.sql} ORDER BY logged_at DESC`, args),
  ]);

  const mealItems = (itemsRes.rows || []).map((row) => ({ ...row, type: 'meal' }));
  const workoutItems = (workoutItemsRes.rows || []).map((row) => ({
    id: `w-${row.id}`, description: row.modality, amount: row.duration_min, unit: 'min', calories: row.calories,
    protein: 0, carbs: 0, fat: 0, logged_at: row.logged_at, type: 'workout',
    workout_type: row.workout_type || null, intensity: row.intensity || null, notes: row.notes || null,
  }));
  const combinedItems = [...mealItems, ...workoutItems].sort((a, b) => new Date(`${String(a.logged_at).replace(' ', 'T')}Z`).getTime() - new Date(`${String(b.logged_at).replace(' ', 'T')}Z`).getTime());
  const workoutSummary = workoutSummaryRes.rows[0] || { workout_kcal: 0, duration_min: 0, workout_count: 0 };
  const historyEndDate = targetDate === 'now' ? getTodayInTimezone(new Date(), 'America/Sao_Paulo') : targetDate;

  return {
    summary: summaryRes.rows[0],
    goals: goalsRes.rows[0] || { calories: 2200, protein: 180, carbs: 180, fat: 84 },
    items: combinedItems,
    history: buildDenseHistory(historyRes.rows || [], { endDate: historyEndDate, days: 30 }),
    activity: activityRes.rows || [],
    workouts: { total: workoutSummary.workout_kcal || 0, duration: workoutSummary.duration_min || 0, count: workoutSummary.workout_count || 0 },
  };
}

async function getGroupOverview(targetDate = 'now') {
  const dateFilter = buildDateFilter(targetDate);
  const result = await execute(`
    SELECT p.id, p.slug, p.display_name, p.status,
      COALESCE(g.calories, 0) AS goal_calories, COALESCE(g.protein, 0) AS goal_protein,
      COALESCE((SELECT SUM(m.calories) FROM meals m WHERE m.profile_id = p.id AND m.deleted_at IS NULL AND date(m.logged_at, '-3 hours') = ${dateFilter.sql}), 0) AS kcal,
      COALESCE((SELECT SUM(m.protein) FROM meals m WHERE m.profile_id = p.id AND m.deleted_at IS NULL AND date(m.logged_at, '-3 hours') = ${dateFilter.sql}), 0) AS protein,
      COALESCE((SELECT SUM(w.calories) FROM workouts w WHERE w.profile_id = p.id AND w.deleted_at IS NULL AND date(w.logged_at, '-3 hours') = ${dateFilter.sql}), 0) AS workout_kcal
    FROM profiles p
    LEFT JOIN goals g ON g.id = (SELECT id FROM goals WHERE profile_id = p.id ORDER BY id DESC LIMIT 1)
    WHERE p.slug <> 'legacy'
    ORDER BY CASE p.slug WHEN 'matheus' THEN 1 WHEN 'joyce' THEN 2 WHEN 'allan' THEN 3 WHEN 'musi' THEN 4 ELSE 5 END
  `, [...dateFilter.args, ...dateFilter.args, ...dateFilter.args]);
  return result.rows || [];
}

async function getSevenDayDeficitLeaderboard(targetDate = 'now') {
  const dateFilter = buildDateFilter(targetDate);
  const result = await execute(`
    WITH target AS (SELECT ${dateFilter.sql} AS end_day),
    records AS (
      SELECT profile_id, date(logged_at, '-3 hours') AS day, SUM(calories) AS kcal, 0 AS workout_kcal
      FROM meals
      WHERE deleted_at IS NULL
        AND date(logged_at, '-3 hours') BETWEEN date((SELECT end_day FROM target), '-6 days') AND (SELECT end_day FROM target)
      GROUP BY profile_id, date(logged_at, '-3 hours')
      UNION ALL
      SELECT profile_id, date(logged_at, '-3 hours') AS day, 0 AS kcal, SUM(calories) AS workout_kcal
      FROM workouts
      WHERE deleted_at IS NULL
        AND date(logged_at, '-3 hours') BETWEEN date((SELECT end_day FROM target), '-6 days') AND (SELECT end_day FROM target)
      GROUP BY profile_id, date(logged_at, '-3 hours')
    ),
    totals AS (
      SELECT profile_id, SUM(kcal) AS kcal, SUM(workout_kcal) AS workout_kcal, COUNT(DISTINCT day) AS active_days
      FROM records
      GROUP BY profile_id
    )
    SELECT p.id, p.slug, p.display_name,
      COALESCE(g.calories, 0) AS goal_calories,
      COALESCE(t.kcal, 0) AS kcal,
      COALESCE(t.workout_kcal, 0) AS workout_kcal,
      COALESCE(t.active_days, 0) AS active_days
    FROM profiles p
    LEFT JOIN goals g ON g.id = (SELECT id FROM goals WHERE profile_id = p.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN totals t ON t.profile_id = p.id
    WHERE p.slug <> 'legacy'
  `, dateFilter.args);
  return buildDeficitLeaderboard(result.rows || []);
}

async function getGroupAdherenceHistory(startDate = 'now', endDate = '2026-12-31') {
  const dateFilter = buildDateFilter(startDate);
  const result = await execute(`
    WITH RECURSIVE target AS (SELECT ${dateFilter.sql} AS start_day, date(?) AS end_day),
    calendar(day) AS (
      SELECT (SELECT start_day FROM target)
      UNION ALL
      SELECT date(day, '+1 day') FROM calendar WHERE day < (SELECT end_day FROM target)
    ),
    records AS (
      SELECT profile_id, date(logged_at, '-3 hours') AS day, SUM(calories) AS kcal, 0 AS workout_kcal
      FROM meals
      WHERE deleted_at IS NULL
        AND date(logged_at, '-3 hours') BETWEEN (SELECT MIN(day) FROM calendar) AND (SELECT MAX(day) FROM calendar)
      GROUP BY profile_id, date(logged_at, '-3 hours')
      UNION ALL
      SELECT profile_id, date(logged_at, '-3 hours') AS day, 0 AS kcal, SUM(calories) AS workout_kcal
      FROM workouts
      WHERE deleted_at IS NULL
        AND date(logged_at, '-3 hours') BETWEEN (SELECT MIN(day) FROM calendar) AND (SELECT MAX(day) FROM calendar)
      GROUP BY profile_id, date(logged_at, '-3 hours')
    ),
    daily AS (
      SELECT profile_id, day, SUM(kcal) AS kcal, SUM(workout_kcal) AS workout_kcal
      FROM records GROUP BY profile_id, day
    )
    SELECT p.id AS profile_id, p.slug, p.display_name, c.day,
      COALESCE(g.calories, 0) AS goal_calories,
      COALESCE(d.kcal, 0) AS kcal, COALESCE(d.workout_kcal, 0) AS workout_kcal,
      CASE WHEN d.profile_id IS NULL THEN 0 ELSE 1 END AS has_record
    FROM profiles p
    CROSS JOIN calendar c
    LEFT JOIN goals g ON g.id = (SELECT id FROM goals WHERE profile_id = p.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN daily d ON d.profile_id = p.id AND d.day = c.day
    WHERE p.slug <> 'legacy'
    ORDER BY CASE p.slug WHEN 'matheus' THEN 1 WHEN 'joyce' THEN 2 WHEN 'allan' THEN 3 WHEN 'musi' THEN 4 ELSE 5 END, c.day
  `, [...dateFilter.args, endDate]);

  const byProfile = new Map();
  for (const row of result.rows || []) {
    const netCalories = Number(row.kcal || 0) - Number(row.workout_kcal || 0);
    const goalCalories = Number(row.goal_calories || 0);
    const variance = goalCalories ? (netCalories - goalCalories) / goalCalories : 0;
    const status = !Number(row.has_record) ? 'no_record' : variance < -0.05 ? 'below' : variance > 0.05 ? 'above' : 'on_target';
    if (!byProfile.has(row.profile_id)) byProfile.set(row.profile_id, { id: row.profile_id, slug: row.slug, display_name: row.display_name, days: [] });
    byProfile.get(row.profile_id).days.push({ date: row.day, status, kcal: Number(row.kcal || 0), workout_kcal: Number(row.workout_kcal || 0), net_calories: netCalories, goal_calories: goalCalories });
  }
  return [...byProfile.values()];
}

module.exports = { getDashboardData, getGroupOverview, getSevenDayDeficitLeaderboard, getGroupAdherenceHistory };
