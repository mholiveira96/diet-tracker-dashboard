const { execute } = require('../db.js');

async function getWorkoutById(id) {
  const result = await execute(
    `SELECT id, modality, duration_min, calories, workout_type, intensity, notes, logged_at FROM workouts WHERE id = ? LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function getWorkoutExercisesByWorkoutId(workoutId) {
  try {
    const result = await execute(
      `SELECT id, exercise_name, sets, reps, weight_kg, notes, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC`,
      [workoutId]
    );
    return result.rows || [];
  } catch (_error) {
    return [];
  }
}

async function updateWorkoutById(id, payload) {
  const fields = ['modality = ?', 'duration_min = ?', 'calories = ?'];
  const values = [payload.modality, payload.duration_min, payload.calories];

  if (payload.workout_type !== undefined) {
    fields.push('workout_type = ?');
    values.push(payload.workout_type);
  }
  if (payload.intensity !== undefined) {
    fields.push('intensity = ?');
    values.push(payload.intensity);
  }
  if (payload.notes !== undefined) {
    fields.push('notes = ?');
    values.push(payload.notes);
  }
  if (payload.logged_at) {
    fields.push('logged_at = ?');
    values.push(payload.logged_at);
  }

  values.push(id);
  const result = await execute(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`, values);
  return result.rowsAffected || 0;
}

async function deleteWorkoutById(id) {
  const result = await execute(`DELETE FROM workouts WHERE id = ?`, [id]);
  return result.rowsAffected || 0;
}

module.exports = {
  getWorkoutById,
  getWorkoutExercisesByWorkoutId,
  updateWorkoutById,
  deleteWorkoutById,
};
