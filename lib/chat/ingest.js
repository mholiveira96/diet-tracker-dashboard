const { execute } = require('../db.js');
const { normalizeUserInput, decidePersistenceMode } = require('../food-ai/normalize.js');
const { buildMealInsert, buildWorkoutInsert } = require('./persist.js');
const {
  createMessage,
  attachUploadsToMessage,
  createParseRun,
  linkRecord,
} = require('./store.js');

async function saveParsedAction({ messageId, result }) {
  if (result.action === 'log_meal') {
    const insert = buildMealInsert(result);
    const created = await execute(`${insert.sql} RETURNING id`, insert.args);
    const recordId = created.rows[0]?.id;
    await linkRecord({ messageId, recordType: 'meal', recordId, linkType: 'created' });
    return { recordType: 'meal', recordId };
  }

  if (result.action === 'log_workout') {
    const insert = buildWorkoutInsert(result);
    const created = await execute(`${insert.sql} RETURNING id`, insert.args);
    const recordId = created.rows[0]?.id;
    await linkRecord({ messageId, recordType: 'workout', recordId, linkType: 'created' });
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
      text: normalized.action === 'log_meal' ? `Refeição salva: ${normalized.description}` : `Treino salvo: ${normalized.modality}`,
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
      text: normalized.action === 'log_meal'
        ? `Rascunho de refeição: ${normalized.description}`
        : `Rascunho de treino: ${normalized.modality}`,
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
    text: normalized.question || 'Preciso de mais detalhes para registrar isso com segurança.',
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
  if (!normalized) {
    throw new Error('Draft message has no normalized payload');
  }

  const sourceMessageId = metadata?.sourceMessageId || messageId;
  const record = await saveParsedAction({ messageId: sourceMessageId, result: normalized });

  await execute(`UPDATE chat_messages SET status = ?, metadata_json = ? WHERE id = ?`, [
    'saved',
    JSON.stringify({ ...metadata, decision: { mode: 'auto_save' }, record }),
    messageId,
  ]);

  return { normalized, record };
}

module.exports = {
  ingestUserMessage,
  confirmDraftMessage,
};
