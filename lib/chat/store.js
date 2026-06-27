const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { execute } = require('../db.js');

async function ensureRollingThread() {
  const existing = await execute(`SELECT id, title, created_at, updated_at FROM chat_threads ORDER BY id ASC LIMIT 1`);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await execute(
    `INSERT INTO chat_threads (title, updated_at) VALUES (?, strftime('%Y-%m-%d %H:%M:%S', 'now')) RETURNING id, title, created_at, updated_at`,
    ['Diet Tracker']
  );
  return created.rows[0];
}

async function createMessage({ threadId, role, messageType = 'text', text = '', status = 'received', confidence = null, metadata = null }) {
  const result = await execute(
    `INSERT INTO chat_messages (thread_id, role, message_type, text, status, confidence, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))
     RETURNING id, thread_id, role, message_type, text, status, confidence, metadata_json, created_at`,
    [threadId, role, messageType, text, status, confidence, metadata ? JSON.stringify(metadata) : null]
  );
  return hydrateMessage(result.rows[0]);
}

function uploadsDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'chat');
}

async function saveAttachment({ threadId, filename, mimeType, buffer }) {
  await fs.mkdir(uploadsDir(), { recursive: true });
  const ext = path.extname(filename || '') || (mimeType.includes('png') ? '.png' : '.jpg');
  const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(uploadsDir(), safeName);
  await fs.writeFile(absolutePath, buffer);

  const retentionDays = Number((await getSetting('image_retention_days')) || 180);
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const result = await execute(
    `INSERT INTO chat_attachments (thread_id, storage_path, mime_type, original_name, size_bytes, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))
     RETURNING id, thread_id, message_id, storage_path, mime_type, original_name, size_bytes, created_at, expires_at`,
    [threadId, absolutePath, mimeType, filename || safeName, buffer.length, expiresAt]
  );

  return hydrateAttachment(result.rows[0]);
}

async function attachUploadsToMessage({ messageId, attachmentIds = [] }) {
  for (const id of attachmentIds) {
    await execute(`UPDATE chat_attachments SET message_id = ? WHERE id = ?`, [messageId, id]);
  }
}

async function createParseRun({ messageId, result }) {
  const parseRun = await execute(
    `INSERT INTO parse_runs (message_id, provider, model, normalized_action, raw_response_json, confidence, ambiguities_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))
     RETURNING id, message_id, provider, model, normalized_action, confidence, ambiguities_json, created_at`,
    [
      messageId,
      result.provider || result.source || 'heuristic',
      result.model || null,
      result.action,
      JSON.stringify(result.raw || result),
      result.confidence || null,
      JSON.stringify(result.ambiguities || []),
    ]
  );
  return {
    ...parseRun.rows[0],
    ambiguities: JSON.parse(parseRun.rows[0].ambiguities_json || '[]'),
  };
}

async function linkRecord({ messageId, recordType, recordId, linkType = 'created', dbExecute = execute }) {
  await dbExecute(
    `INSERT INTO message_record_links (message_id, record_type, record_id, link_type, created_at)
     VALUES (?, ?, ?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))`,
    [messageId, recordType, String(recordId), linkType]
  );
}

async function getSetting(key) {
  const result = await execute(`SELECT value FROM app_settings WHERE key = ? LIMIT 1`, [key]);
  return result.rows[0]?.value || null;
}

async function setSetting(key, value) {
  await execute(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%d %H:%M:%S', 'now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value)]
  );
}

function hydrateAttachment(row) {
  return row
    ? {
        ...row,
        url: row.storage_path.includes('/public/')
          ? row.storage_path.split('/public')[1]
          : `/uploads/chat/${path.basename(row.storage_path)}`,
      }
    : null;
}

function hydrateMessage(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  };
}

async function getThreadMessages(threadId) {
  const [messagesRes, attachmentsRes, linksRes] = await Promise.all([
    execute(`SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC, id ASC`, [threadId]),
    execute(`SELECT * FROM chat_attachments WHERE thread_id = ? ORDER BY created_at ASC, id ASC`, [threadId]),
    execute(`SELECT * FROM message_record_links WHERE message_id IN (SELECT id FROM chat_messages WHERE thread_id = ?) ORDER BY id ASC`, [threadId]),
  ]);

  const attachmentsByMessage = new Map();
  for (const row of attachmentsRes.rows) {
    if (!row.message_id) continue;
    const list = attachmentsByMessage.get(row.message_id) || [];
    list.push(hydrateAttachment(row));
    attachmentsByMessage.set(row.message_id, list);
  }

  const linksByMessage = new Map();
  for (const row of linksRes.rows) {
    const list = linksByMessage.get(row.message_id) || [];
    list.push(row);
    linksByMessage.set(row.message_id, list);
  }

  return messagesRes.rows.map((row) => ({
    ...hydrateMessage(row),
    attachments: attachmentsByMessage.get(row.id) || [],
    linked_records: linksByMessage.get(row.id) || [],
  }));
}

module.exports = {
  ensureRollingThread,
  createMessage,
  saveAttachment,
  attachUploadsToMessage,
  createParseRun,
  linkRecord,
  getThreadMessages,
  getSetting,
  setSetting,
};
