function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildMealInsert(payload) {
  return {
    sql: `INSERT INTO meals (description, amount, unit, calories, protein, carbs, fat, logged_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))`,
    args: [
      payload.description,
      toNumber(payload.amount, 1),
      payload.unit || 'porção',
      toNumber(payload.calories),
      toNumber(payload.protein),
      toNumber(payload.carbs),
      toNumber(payload.fat),
    ],
  };
}

function buildWorkoutInsert(payload) {
  return {
    sql: `INSERT INTO workouts (modality, duration_min, calories, logged_at)
          VALUES (?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))`,
    args: [
      payload.modality,
      toNumber(payload.duration_min),
      toNumber(payload.calories),
    ],
  };
}

module.exports = {
  buildMealInsert,
  buildWorkoutInsert,
  toNumber,
};
