const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../../migrations/003_add_profiles_and_audit.sql');

test('multi-profile migration defines ownership, legacy backfill, and recoverable audit data', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS profiles/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_events/i);
  assert.match(sql, /ALTER TABLE meals ADD COLUMN profile_id/i);
  assert.match(sql, /ALTER TABLE workouts ADD COLUMN profile_id/i);
  assert.match(sql, /ALTER TABLE chat_threads ADD COLUMN profile_id/i);
  assert.match(sql, /ALTER TABLE meals ADD COLUMN deleted_at/i);
  assert.match(sql, /INSERT OR IGNORE INTO profiles \(slug, display_name, status\)/i);
  assert.match(sql, /UPDATE meals\s+SET profile_id/i);
  assert.match(sql, /idx_meals_profile_logged_at/i);
});
