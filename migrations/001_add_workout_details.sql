-- Migration: Add detailed workout tracking
-- Date: 2026-06-13
-- Purpose: Add workout_exercises table for detailed exercise logging

-- Create workout_exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT, -- Can be "8-10" or "12" or "failure"
  weight_kg REAL,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id 
ON workout_exercises(workout_id);

-- Add columns to workouts table for more context
ALTER TABLE workouts ADD COLUMN notes TEXT;
ALTER TABLE workouts ADD COLUMN workout_type TEXT; -- e.g., "strength", "cardio", "flexibility"
ALTER TABLE workouts ADD COLUMN intensity TEXT; -- e.g., "low", "moderate", "high"

-- Create view for detailed workout summary
CREATE VIEW IF NOT EXISTS workout_details AS
SELECT 
  w.id as workout_id,
  w.modality,
  w.duration_min,
  w.calories,
  w.workout_type,
  w.intensity,
  w.notes as workout_notes,
  w.logged_at,
  COUNT(we.id) as exercise_count,
  GROUP_CONCAT(DISTINCT we.exercise_name) as exercises
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
GROUP BY w.id;
