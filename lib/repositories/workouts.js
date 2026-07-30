const { execute } = require('../db.js');
const { appendAuditEvent } = require('./audit.js');

let workoutColumnsPromise = null;
async function getWorkoutColumns() {
  if (!workoutColumnsPromise) workoutColumnsPromise = execute('PRAGMA table_info(workouts)').then((result) => new Set((result.rows || []).map((row) => row.name)));
  return workoutColumnsPromise;
}
function buildWorkoutSelectList(columns) {
  return ['id', 'modality', 'duration_min', 'calories', columns.has('workout_type') ? 'workout_type' : 'NULL as workout_type', columns.has('intensity') ? 'intensity' : 'NULL as intensity', columns.has('notes') ? 'notes' : 'NULL as notes', 'logged_at'].join(', ');
}
async function getWorkoutById(id, profileId, { includeDeleted = false } = {}) {
  const columns = await getWorkoutColumns();
  const result = await execute(`SELECT ${buildWorkoutSelectList(columns)}, profile_id, deleted_at FROM workouts WHERE id = ? AND profile_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'} LIMIT 1`, [id, profileId]);
  return result.rows[0] || null;
}
async function getWorkoutExercisesByWorkoutId(workoutId) {
  try { const result = await execute('SELECT id, exercise_name, sets, reps, weight_kg, notes, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC', [workoutId]); return result.rows || []; } catch { return []; }
}
async function updateWorkoutById(id, profileId, payload, source = 'public_dashboard') {
  const before = await getWorkoutById(id, profileId);
  if (!before) return 0;
  const columns = await getWorkoutColumns();
  const fields = ['modality = ?', 'duration_min = ?', 'calories = ?']; const values = [payload.modality, payload.duration_min, payload.calories];
  for (const key of ['workout_type', 'intensity', 'notes']) if (payload[key] !== undefined && columns.has(key)) { fields.push(`${key} = ?`); values.push(payload[key]); }
  if (payload.logged_at) { fields.push('logged_at = ?'); values.push(payload.logged_at); }
  values.push(id, profileId);
  const result = await execute(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ? AND profile_id = ? AND deleted_at IS NULL`, values);
  if (result.rowsAffected) await appendAuditEvent({ profileId, entityType: 'workout', entityId: id, action: 'update', before, after: await getWorkoutById(id, profileId), source });
  return result.rowsAffected || 0;
}
async function deleteWorkoutById(id, profileId, source = 'public_dashboard') {
  const before = await getWorkoutById(id, profileId); if (!before) return 0;
  const result = await execute(`UPDATE workouts SET deleted_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = ? AND profile_id = ? AND deleted_at IS NULL`, [id, profileId]);
  if (result.rowsAffected) await appendAuditEvent({ profileId, entityType: 'workout', entityId: id, action: 'delete', before, after: { ...before, deleted_at: new Date().toISOString() }, source });
  return result.rowsAffected || 0;
}
async function restoreWorkoutById(id, profileId, auditEventId) {
  const before = await getWorkoutById(id, profileId, { includeDeleted: true }); if (!before || !before.deleted_at) return 0;
  const result = await execute('UPDATE workouts SET deleted_at = NULL WHERE id = ? AND profile_id = ?', [id, profileId]);
  if (result.rowsAffected) await appendAuditEvent({ profileId, entityType: 'workout', entityId: id, action: 'restore', before, after: await getWorkoutById(id, profileId), source: 'public_dashboard', revertedAuditEventId: auditEventId });
  return result.rowsAffected || 0;
}
module.exports = { getWorkoutById, getWorkoutExercisesByWorkoutId, updateWorkoutById, deleteWorkoutById, restoreWorkoutById, getWorkoutColumns, buildWorkoutSelectList };
