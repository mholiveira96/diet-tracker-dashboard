const { execute, withTransaction } = require('../db.js');
const { normalizeUserInput, decidePersistenceMode } = require('../food-ai/normalize.js');
const { buildMealInsert, buildWorkoutInsert } = require('./persist.js');
const { buildDraftConfirmationPlan, buildSavedDraftMetadata } = require('./confirm.js');
const { buildAssistantReplyText } = require('./presentation.js');
const {
  createMessage,
  attachUploadsToMessage,
  createParseRun,
  linkRecord,
} = require('./store.js');

async function saveParsedAction({ messageId, result, dbExecute = execute }) {
  if (result.action === 'log_meal') {
    const insert = buildMealInsert(result);
    const created = await dbExecute(`${insert.sql} RETURNING id`, insert.args);
    const recordId = created.rows[0]?.id;
    await linkRecord({ messageId, recordType: 'meal', recordId, linkType: 'created', dbExecute });
    return { recordType: 'meal', recordId };
  }

  if (result.action === 'log_workout') {
    const insert = buildWorkoutInsert(result);
    const created = await dbExecute(`${insert.sql} RETURNING id`, insert.args);
    const recordId = created.rows[0]?.id;
    await linkRecord({ messageId, recordType: 'workout', recordId, linkType: 'created', dbExecute });
    return { recordType: 'workout', recordId };
  }

  return null;
}

async function ingestUserMessage({ threadId, text = '', attachmentIds = [] }) {
  const userMessage = await createMessage({
    threadId,
    role: 'user',
    messageType: attachmentIds.length ? 'image' : 'text',
    text,
    status: 'received',
  });

  await attachUploadsToMessage({ messageId: userMessage.id, attachmentIds });

  const attachmentsRes = attachmentIds.length
    ? await execute(`SELECT * FROM chat_attachments WHERE id IN (${attachmentIds.map(() => '?').join(', ')}) ORDER BY id ASC`, attachmentIds)
    : { rows: [] };

  const normalized = await normalizeUserInput({
    text,
    attachments: attachmentsRes.rows,
  });

  const parseRun = await createParseRun({ messageId: userMessage.id, result: normalized });
  const decision = decidePersistenceMode(normalized);

  await execute(
    `UPDATE chat_messages SET status = ?, confidence = ?, metadata_json = ? WHERE id = ?`,
    [decision.mode, normalized.confidence || null, JSON.stringify({ normalized, parseRunId: parseRun.id, decision }), userMessage.id]
  );

  if (decision.mode === 'auto_save') {
    const record = await saveParsedAction({ messageId: userMessage.id, result: normalized });
    const assistantMessage = await createMessage({
      threadId,
      role: 'assistant',
      messageType: 'result',
      text: buildAssistantReplyText(normalized, 'auto_save'),
      status: 'saved',
      confidence: normalized.confidence || null,
      metadata: { normalized, decision, record },
    });
    return { userMessageId: userMessage.id, assistantMessageId: assistantMessage.id, decision, normalized, record };
  }

  if (decision.mode === 'draft') {
    const draftMessage = await createMessage({
      threadId,
      role: 'assistant',
      messageType: 'draft',
      text: buildAssistantReplyText(normalized, 'draft'),
      status: 'needs_confirmation',
      confidence: normalized.confidence || null,
      metadata: { normalized, decision, sourceMessageId: userMessage.id },
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
    metadata: { normalized, decision, sourceMessageId: userMessage.id },
  });
  return { userMessageId: userMessage.id, assistantMessageId: clarifyMessage.id, decision, normalized };
}

async function confirmDraftMessage(messageId) {
  const draftRes = await execute(`SELECT * FROM chat_messages WHERE id = ? LIMIT 1`, [messageId]);
  const draft = draftRes.rows[0];
  if (!draft) {
    throw new Error('Draft message not found');
  }

  const metadata = draft.metadata_json ? JSON.parse(draft.metadata_json) : null;
  const normalized = metadata?.normalized;
  const sourceMessageId = metadata?.sourceMessageId || messageId;
  const existingLinksRes = await execute(
    `SELECT record_type, record_id, link_type FROM message_record_links WHERE message_id = ? ORDER BY id ASC`,
    [sourceMessageId]
  );
  const plan = buildDraftConfirmationPlan({
    status: draft.status,
    normalized,
    existingLinks: existingLinksRes.rows,
  });

  let record = plan.recordLink
    ? { recordType: plan.recordLink.record_type, recordId: plan.recordLink.record_id }
    : null;

  if (!plan.shouldPersistRecord) {
    await execute(`UPDATE chat_messages SET status = ?, metadata_json = ? WHERE id = ?`, [
      plan.nextStatus,
      JSON.stringify(buildSavedDraftMetadata(metadata, record)),
      messageId,
    ]);
    return { normalized, record };
  }

  return withTransaction(async (transaction) => {
    const txExecute = (sql, args = []) => transaction.execute({ sql, args });
    const lockResult = await txExecute(
      `UPDATE chat_messages SET status = ? WHERE id = ? AND status = ?`,
      ['saving', messageId, 'needs_confirmation']
    );

    if (!lockResult.rowsAffected) {
      const latestDraftRes = await execute(`SELECT status FROM chat_messages WHERE id = ? LIMIT 1`, [messageId]);
      const latestStatus = latestDraftRes.rows[0]?.status;

      if (latestStatus === 'saved') {
        const linksAfterSaveRes = await execute(
          `SELECT record_type, record_id, link_type FROM message_record_links WHERE message_id = ? ORDER BY id ASC`,
          [sourceMessageId]
        );
        const savedLink = linksAfterSaveRes.rows.find((link) => link.link_type === 'created');
        return {
          normalized,
          record: savedLink ? { recordType: savedLink.record_type, recordId: savedLink.record_id } : null,
        };
      }

      throw new Error('Esse rascunho já está sendo salvo. Atualiza a conversa em alguns segundos.');
    }

    record = await saveParsedAction({ messageId: sourceMessageId, result: normalized, dbExecute: txExecute });

    await txExecute(`UPDATE chat_messages SET status = ?, metadata_json = ? WHERE id = ?`, [
      plan.nextStatus,
      JSON.stringify(buildSavedDraftMetadata(metadata, record)),
      messageId,
    ]);

    return { normalized, record };
  });
}

module.exports = {
  ingestUserMessage,
  confirmDraftMessage,
};
