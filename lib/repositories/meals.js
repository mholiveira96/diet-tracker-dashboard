const { execute } = require('../db.js');
const { appendAuditEvent } = require('./audit.js');

async function getMealById(id, profileId, { includeDeleted = false } = {}) {
  const result = await execute(
    `SELECT id, profile_id, description, amount, unit, calories, protein, carbs, fat, logged_at, deleted_at
     FROM meals WHERE id = ? AND profile_id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'} LIMIT 1`,
    [id, profileId]
  );
  return result.rows[0] || null;
}

async function updateMealById(id, profileId, payload, source = 'public_dashboard') {
  const before = await getMealById(id, profileId);
  if (!before) return 0;
  const fields = ['description = ?', 'amount = ?', 'unit = ?', 'calories = ?', 'protein = ?', 'carbs = ?', 'fat = ?'];
  const values = [payload.description, payload.amount, payload.unit, payload.calories, payload.protein, payload.carbs, payload.fat];
  if (payload.logged_at) {
    fields.push('logged_at = ?');
    values.push(payload.logged_at);
  }
  values.push(id, profileId);
  const result = await execute(`UPDATE meals SET ${fields.join(', ')} WHERE id = ? AND profile_id = ? AND deleted_at IS NULL`, values);
  if (result.rowsAffected) {
    const after = await getMealById(id, profileId);
    await appendAuditEvent({ profileId, entityType: 'meal', entityId: id, action: 'update', before, after, source });
  }
  return result.rowsAffected || 0;
}

async function insertMeal(profileId, payload) {
  const result = await execute(
    `INSERT INTO meals (description, amount, unit, calories, protein, carbs, fat, profile_id, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%d %H:%M:%S', 'now')))` ,
    [payload.description, payload.amount, payload.unit, payload.calories, payload.protein, payload.carbs, payload.fat, profileId, payload.logged_at || null]
  );
  return getMealById(Number(result.lastInsertRowid), profileId);
}

async function deleteMealById(id, profileId, source = 'public_dashboard') {
  const before = await getMealById(id, profileId);
  if (!before) return 0;
  const result = await execute(
    `UPDATE meals SET deleted_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = ? AND profile_id = ? AND deleted_at IS NULL`,
    [id, profileId]
  );
  if (result.rowsAffected) {
    await appendAuditEvent({ profileId, entityType: 'meal', entityId: id, action: 'delete', before, after: { ...before, deleted_at: new Date().toISOString() }, source });
  }
  return result.rowsAffected || 0;
}

async function restoreMealById(id, profileId, auditEventId) {
  const before = await getMealById(id, profileId, { includeDeleted: true });
  if (!before || !before.deleted_at) return 0;
  const result = await execute('UPDATE meals SET deleted_at = NULL WHERE id = ? AND profile_id = ?', [id, profileId]);
  if (result.rowsAffected) {
    const after = await getMealById(id, profileId);
    await appendAuditEvent({ profileId, entityType: 'meal', entityId: id, action: 'restore', before, after, source: 'public_dashboard', revertedAuditEventId: auditEventId });
  }
  return result.rowsAffected || 0;
}

module.exports = { getMealById, insertMeal, updateMealById, deleteMealById, restoreMealById };
