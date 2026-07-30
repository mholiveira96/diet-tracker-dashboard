const { execute } = require('../db.js');

async function appendAuditEvent({ profileId, entityType, entityId, action, before = null, after = null, source = 'public_dashboard', revertedAuditEventId = null, dbExecute = execute }) {
  const result = await dbExecute(
    `INSERT INTO audit_events (profile_id, entity_type, entity_id, action, before_json, after_json, source, reverted_audit_event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [profileId, entityType, String(entityId), action, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, source, revertedAuditEventId]
  );
  return result.lastInsertRowid;
}

async function listAuditEvents(profileId, limit = 40) {
  const result = await execute(
    `SELECT id, profile_id, entity_type, entity_id, action, before_json, after_json, source, reverted_audit_event_id, created_at
     FROM audit_events WHERE profile_id = ? ORDER BY id DESC LIMIT ?`,
    [profileId, Math.min(Math.max(Number(limit) || 40, 1), 100)]
  );
  return (result.rows || []).map((row) => ({
    ...row,
    before: row.before_json ? JSON.parse(row.before_json) : null,
    after: row.after_json ? JSON.parse(row.after_json) : null,
    before_json: undefined,
    after_json: undefined,
  }));
}

module.exports = { appendAuditEvent, listAuditEvents };
