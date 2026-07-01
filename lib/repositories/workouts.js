const { execute } = require('../db.js');

let workoutColumnsPromise = null;

async function getWorkoutColumns() {
  if (!workoutColumnsPromise) {
    workoutColumnsPromise = execute(`PRAGMA table_info(workouts)`).then((result) => new Set((result.rows || []).map((row) => row.name)));
  }
  return workoutColumnsPromise;
}

function buildWorkoutSelectList(columns) {
  return [
    'id',
    'modality',
    'duration_min',
    'calories',
    columns.has('workout_type') ? 'workout_type' : 'NULL as workout_type',
    columns.has('intensity') ? 'intensity' : 'NULL as intensity',
    columns.has('notes') ? 'notes' : 'NULL as notes',
    'logged_at',
  ].join(', ');
}

async function getWorkoutById(id) {
  const columns = await getWorkoutColumns();
  const result = await execute(
    `SELECT ${buildWorkoutSelectList(columns)} FROM workouts WHERE id = ? LIMIT 1`,
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
  const columns = await getWorkoutColumns();
  const fields = ['modality = ?', 'duration_min = ?', 'calories = ?'];
  const values = [payload.modality, payload.duration_min, payload.calories];

  if (payload.workout_type !== undefined && columns.has('workout_type')) {
    fields.push('workout_type = ?');
    values.push(payload.workout_type);
  }
  if (payload.intensity !== undefined && columns.has('intensity')) {
    fields.push('intensity = ?');
    values.push(payload.intensity);
  }
  if (payload.notes !== undefined && columns.has('notes')) {
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
  getWorkoutColumns,
  buildWorkoutSelectList,
};
