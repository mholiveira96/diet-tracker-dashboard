const { execute } = require('../db.js');
const { appendAuditEvent } = require('./audit.js');

async function getLatestGoals(profileId) {
  const result = await execute(
    `SELECT id, calories, protein, carbs, fat, updated_at FROM goals WHERE profile_id = ? ORDER BY id DESC LIMIT 1`,
    [profileId]
  );
  return result.rows[0] || null;
}

async function insertGoals(profileId, { calories, protein, carbs, fat }, source = 'public_dashboard') {
  const before = await getLatestGoals(profileId);
  const result = await execute(
    `INSERT INTO goals (calories, protein, carbs, fat, profile_id) VALUES (?, ?, ?, ?, ?)`,
    [calories, protein, carbs, fat, profileId]
  );
  const after = await getLatestGoals(profileId);
  await appendAuditEvent({ profileId, entityType: 'goals', entityId: after?.id || result.lastInsertRowid, action: 'update', before, after, source });
  return after;
}

module.exports = { getLatestGoals, insertGoals };
