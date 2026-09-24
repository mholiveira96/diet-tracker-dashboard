const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../../migrations/004_add_andreia_marcelo.sql');

test('new profile migration adds Andreia and Marcelo idempotently', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /INSERT OR IGNORE INTO profiles \(slug, display_name, status\)/i);
  assert.match(sql, /\('andreia',\s*'Andreia',\s*'pending'\)/i);
  assert.match(sql, /\('marcelo',\s*'Marcelo',\s*'pending'\)/i);
});
