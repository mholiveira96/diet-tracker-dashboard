function describeResult(result) {
  if (!result?.decision?.mode) return null;

  if (result.decision.mode === 'auto_save') {
    return result.normalized?.action === 'log_workout'
      ? 'Treino registrado. Vou atualizar seus números agora.'
      : 'Refeição registrada. Vou atualizar seus números agora.';
  }

  if (result.decision.mode === 'draft') {
    return 'Achei um registro provável. Confirma abaixo para salvar.';
  }

  return 'Preciso só de um detalhe para registrar certo.';
}

function buildAssistantReplyText(normalized, mode) {
  const isWorkout = normalized?.action === 'log_workout' || Boolean(normalized?.modality);

  if (mode === 'auto_save') {
    return isWorkout
      ? `Treino registrado: ${normalized.modality}`
      : `Refeição registrada: ${normalized.description}`;
  }

  if (mode === 'draft') {
    return isWorkout
      ? `Encontrei este treino: ${normalized.modality}. Se estiver certo, salva abaixo.`
      : `Encontrei esta refeição: ${normalized.description}. Se estiver certo, salva abaixo.`;
  }

  return `Quase certo. Me confirma só isto: ${normalized?.question || 'o que faltou nesse registro?'}`;
}

function buildPendingMessages({ text = '', attachments = [] }) {
  const now = new Date().toISOString();
  return {
    userMessage: {
      id: `pending-user-${Date.now()}`,
      role: 'user',
      message_type: attachments.length ? 'image' : 'text',
      text,
      status: 'enviando',
      created_at: now,
      attachments,
      metadata: { optimistic: true },
    },
    waitingMessage: {
      id: `pending-assistant-${Date.now()}`,
      role: 'assistant',
      message_type: 'pending',
      text: 'Analisando e registrando...',
      status: 'processando',
      created_at: now,
      metadata: { optimistic: true, waiting: true },
    },
  };
}

module.exports = {
  describeResult,
  buildAssistantReplyText,
  buildPendingMessages,
};
