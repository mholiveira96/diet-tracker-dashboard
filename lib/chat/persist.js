function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
function buildMealInsert(payload, profileId) {
  return {
    sql: `INSERT INTO meals (description, amount, unit, calories, protein, carbs, fat, profile_id, logged_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))`,
    args: [payload.description, toNumber(payload.amount, 1), payload.unit || 'porção', toNumber(payload.calories), toNumber(payload.protein), toNumber(payload.carbs), toNumber(payload.fat), profileId],
  };
}
function buildWorkoutInsert(payload, profileId) {
  return {
    sql: `INSERT INTO workouts (modality, duration_min, calories, profile_id, logged_at)
          VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))`,
    args: [payload.modality, toNumber(payload.duration_min), toNumber(payload.calories), profileId],
  };
}
module.exports = { buildMealInsert, buildWorkoutInsert, toNumber };
