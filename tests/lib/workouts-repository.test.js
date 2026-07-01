const test = require('node:test');
const assert = require('node:assert/strict');

const { buildWorkoutSelectList } = require('../../lib/repositories/workouts.js');

test('buildWorkoutSelectList keeps optional workout columns when schema supports them', () => {
  const sql = buildWorkoutSelectList(new Set(['id', 'modality', 'duration_min', 'calories', 'workout_type', 'intensity', 'notes', 'logged_at']));

  assert.equal(
    sql,
    'id, modality, duration_min, calories, workout_type, intensity, notes, logged_at'
  );
});

test('buildWorkoutSelectList falls back to NULL aliases for missing optional workout columns', () => {
  const sql = buildWorkoutSelectList(new Set(['id', 'modality', 'duration_min', 'calories', 'logged_at', 'workout_type']));

  assert.equal(
    sql,
    'id, modality, duration_min, calories, workout_type, NULL as intensity, NULL as notes, logged_at'
  );
});
