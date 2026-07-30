-- Multi-profile ownership, recoverable public edits, and legacy preservation.
-- This migration is additive. Existing records are assigned to the Legacy profile.

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  whatsapp_lid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  age INTEGER,
  sex TEXT,
  height_cm REAL,
  weight_kg REAL,
  activity_level TEXT,
  goal_type TEXT,
  goal_pace TEXT,
  onboarding_step TEXT,
  onboarding_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);

INSERT OR IGNORE INTO profiles (slug, display_name, status) VALUES
  ('matheus', 'Matheus', 'pending'),
  ('joyce', 'Joyce', 'pending'),
  ('allan', 'Allan', 'pending'),
  ('musi', 'Musi', 'pending'),
  ('legacy', 'Legacy', 'legacy');

ALTER TABLE meals ADD COLUMN profile_id INTEGER;
ALTER TABLE meals ADD COLUMN deleted_at TEXT;
ALTER TABLE workouts ADD COLUMN profile_id INTEGER;
ALTER TABLE workouts ADD COLUMN deleted_at TEXT;
ALTER TABLE goals ADD COLUMN profile_id INTEGER;
ALTER TABLE favorites ADD COLUMN profile_id INTEGER;
ALTER TABLE activity ADD COLUMN profile_id INTEGER;
ALTER TABLE chat_threads ADD COLUMN profile_id INTEGER;

CREATE TABLE IF NOT EXISTS profile_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  base_amount REAL NOT NULL,
  unit TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  UNIQUE(profile_id, name),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  source TEXT NOT NULL,
  reverted_audit_event_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id),
  FOREIGN KEY (reverted_audit_event_id) REFERENCES audit_events(id)
);

UPDATE meals
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

UPDATE workouts
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

UPDATE goals
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

UPDATE favorites
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

INSERT OR IGNORE INTO profile_favorites (profile_id, name, calories, protein, carbs, fat, base_amount, unit, use_count, last_used_at)
SELECT profile_id, name, calories, protein, carbs, fat, base_amount, unit, COALESCE(use_count, 0), last_used_at
FROM favorites
WHERE profile_id IS NOT NULL;

UPDATE activity
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

UPDATE chat_threads
SET profile_id = (SELECT id FROM profiles WHERE slug = 'legacy')
WHERE profile_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_meals_profile_logged_at ON meals(profile_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_workouts_profile_logged_at ON workouts(profile_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_goals_profile_updated_at ON goals(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_activity_profile_logged_at ON activity(profile_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_chat_threads_profile_updated_at ON chat_threads(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_profile_favorites_profile_name ON profile_favorites(profile_id, name);
CREATE INDEX IF NOT EXISTS idx_audit_events_profile_created_at ON audit_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
