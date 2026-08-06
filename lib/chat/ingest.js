const { execute, withTransaction } = require('../db.js');
const { normalizeUserInput, decidePersistenceMode } = require('../food-ai/normalize.js');
const { buildMealInsert, buildWorkoutInsert } = require('./persist.js');
const { buildDraftConfirmationPlan, buildSavedDraftMetadata } = require('./confirm.js');
const { buildAssistantReplyText } = require('./presentation.js');
const { getDashboardData } = require('../repositories/dashboard.js');
const { appendAuditEvent } = require('../repositories/audit.js');
const {
  createMessage,
  attachUploadsToMessage,
  createParseRun,
  linkRecord,
} = require('./store.js');

function mealItemsForResult(result) {
  return Array.isArray(result?.meal_items) && result.meal_items.length
    ? result.meal_items
    : [result];
}

function recordFromLinks(links = []) {
  const created = links.filter((link) => link.link_type === 'created');
  if (!created.length) return null;
  return {
    recordType: created[0].record_type,
    recordId: created[0].record_id,
    records: created.map((link) => ({ recordType: link.record_type, recordId: link.record_id })),
  };
}

async function saveParsedAction({ messageId, result, profileId, dbExecute = execute }) {
  if (result.action === 'log_meal') {
    const records = [];
    for (const item of mealItemsForResult(result)) {
      const payload = {
        ...result,
        ...item,
        description: item.description || item.name || result.description,
      };
      const insert = buildMealInsert(payload, profileId);
      const created = await dbExecute(`${insert.sql} RETURNING id`, insert.args);
      const recordId = created.rows[0]?.id;
      await linkRecord({ messageId, recordType: 'meal', recordId, linkType: 'created', dbExecute });
      await appendAuditEvent({ profileId, entityType: 'meal', entityId: recordId, action: 'create', after: payload, source: 'public_dashboard', dbExecute });
      records.push({ recordType: 'meal', recordId });
    }
    return { recordType: 'meal', recordId: records[0]?.recordId || null, records };
  }

  if (result.action === 'log_workout') {
    const insert = buildWorkoutInsert(result, profileId);
    const created = await dbExecute(`${insert.sql} RETURNING id`, insert.args);
    const recordId = created.rows[0]?.id;
    await linkRecord({ messageId, recordType: 'workout', recordId, linkType: 'created', dbExecute });
    await appendAuditEvent({ profileId, entityType: 'workout', entityId: recordId, action: 'create', after: result, source: 'public_dashboard', dbExecute });
    return { recordType: 'workout', recordId, records: [{ recordType: 'workout', recordId }] };
  }

  return null;
}

async function ingestUserMessage({ threadId, profileId, text = '', attachmentIds = [] }) {
  const userMessage = await createMessage({
    threadId,
    role: 'user',
    messageType: attachmentIds.length ? 'image' : 'text',
    text,
    status: 'received',
  });

  await attachUploadsToMessage({ messageId: userMessage.id, profileId, attachmentIds });

  const attachmentsRes = attachmentIds.length
    ? await execute(`SELECT * FROM chat_attachments WHERE id IN (${attachmentIds.map(() => '?').join(', ')}) ORDER BY id ASC`, attachmentIds)
    : { rows: [] };

  const normalized = await normalizeUserInput({
    text,
    attachments: attachmentsRes.rows,
    profileId,
  });

  const parseRun = await createParseRun({ messageId: userMessage.id, result: normalized });
  const decision = decidePersistenceMode(normalized);
  const metadata = { normalized, parseRunId: parseRun.id, decision, ownerProfileId: profileId };

  await execute(
    `UPDATE chat_messages SET status = ?, confidence = ?, metadata_json = ? WHERE id = ?`,
    [decision.mode, normalized.confidence || null, JSON.stringify(metadata), userMessage.id]
  );

  if (decision.mode === 'auto_save') {
    const record = await withTransaction((transaction) => saveParsedAction({
      messageId: userMessage.id,
      result: normalized,
      profileId,
      dbExecute: (sql, args = []) => transaction.execute({ sql, args }),
    }));
    const summary = await getDashboardData(profileId, 'now');
    const assistantMessage = await createMessage({
      threadId,
      role: 'assistant',
      messageType: 'result',
      text: buildAssistantReplyText(normalized, 'auto_save', { summary }),
      status: 'saved',
      confidence: normalized.confidence || null,
      metadata: { ...metadata, summary, record },
    });
    return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id, decision, normalized, record, summary };
  }

  if (decision.mode === 'draft') {
    const draftMessage = await createMessage({
      threadId,
      role: 'assistant',
      messageType: 'draft',
      text: buildAssistantReplyText(normalized, 'draft'),
      status: 'needs_confirmation',
      confidence: normalized.confidence || null,
      metadata,
    });
    return { userMessageId: userMessage.id, assistantMessageId: draftMessage.id, decision, normalized };
  }

  const clarifyMessage = await createMessage({
    threadId,
    role: 'assistant',
    messageType: 'clarification',
    text: buildAssistantReplyText(normalized, 'clarify'),
    status: 'needs_confirmation',
    confidence: normalized.confidence || null,
    metadata,
  });
  return { userMessageId: userMessage.id, assistantMessageId: clarifyMessage.id, decision, normalized };
}

async function confirmDraftMessage(messageId, confirmerProfileId) {
  const draftRes = await execute(`
    SELECT m.*, t.profile_id AS owner_profile_id FROM chat_messages m
    JOIN chat_threads t ON t.id = m.thread_id
    WHERE m.id = ? LIMIT 1
  `, [messageId]);
  const draft = draftRes.rows[0];
  if (!draft) throw new Error('Draft message not found');

  const metadata = draft.metadata_json ? JSON.parse(draft.metadata_json) : null;
  const normalized = metadata?.normalized;
  if (!['log_meal', 'log_workout'].includes(normalized?.action)) {
    throw new Error('Só é possível confirmar uma prévia de refeição ou treino.');
  }
  const ownerProfileId = Number(metadata?.ownerProfileId || draft.owner_profile_id);
  if (!ownerProfileId) throw new Error('Draft message has no owner profile');
  const sourceMessageId = metadata?.sourceMessageId || messageId;
  const existingLinksRes = await execute(
    `SELECT record_type, record_id, link_type FROM message_record_links WHERE message_id = ? ORDER BY id ASC`,
    [sourceMessageId]
  );
  const plan = buildDraftConfirmationPlan({ status: draft.status, normalized, existingLinks: existingLinksRes.rows });

  let record = recordFromLinks(existingLinksRes.rows);

  if (plan.shouldPersistRecord) {
    const transactionResult = await withTransaction(async (transaction) => {
      const txExecute = (sql, args = []) => transaction.execute({ sql, args });
      const lockResult = await txExecute(
        `UPDATE chat_messages SET status = ? WHERE id = ? AND status = ?`,
        ['saving', messageId, 'needs_confirmation']
      );

      if (!lockResult.rowsAffected) {
        const latestDraftRes = await execute(`SELECT status FROM chat_messages WHERE id = ? LIMIT 1`, [messageId]);
        if (latestDraftRes.rows[0]?.status === 'saved') return { alreadySaved: true };
        throw new Error('Esse rascunho já está sendo salvo. Atualiza a conversa em alguns segundos.');
      }

      record = await saveParsedAction({ messageId: sourceMessageId, result: normalized, profileId: ownerProfileId, dbExecute: txExecute });
      await txExecute(`UPDATE chat_messages SET status = ? WHERE id = ?`, [plan.nextStatus, messageId]);
      return { alreadySaved: false };
    });
    if (transactionResult.alreadySaved) {
      const linksAfterSaveRes = await execute(`SELECT record_type, record_id, link_type FROM message_record_links WHERE message_id = ? ORDER BY id ASC`, [sourceMessageId]);
      record = recordFromLinks(linksAfterSaveRes.rows) || record;
    }
  } else {
    await execute(`UPDATE chat_messages SET status = ?, metadata_json = ? WHERE id = ?`, [plan.nextStatus, JSON.stringify(buildSavedDraftMetadata(metadata, record)), messageId]);
  }

  const summary = await getDashboardData(ownerProfileId, 'now');
  const savedMetadata = { ...buildSavedDraftMetadata(metadata, record), summary, confirmedByProfileId: confirmerProfileId };
  await execute(`UPDATE chat_messages SET status = ?, message_type = ?, text = ?, metadata_json = ? WHERE id = ?`, [
    'saved',
    'result',
    buildAssistantReplyText(normalized, 'auto_save', { summary }),
    JSON.stringify(savedMetadata),
    messageId,
  ]);

  return { normalized, record, summary, ownerProfileId };
}

module.exports = { ingestUserMessage, confirmDraftMessage, saveParsedAction, mealItemsForResult };
