function describeResult(result) {
  if (!result?.decision?.mode) return null;

  if (result.decision.mode === 'auto_save') {
    return result.normalized?.action === 'log_workout'
      ? 'Treino registrado. Números atualizados.'
      : 'Refeição registrada. Números atualizados.';
  }

  if (result.decision.mode === 'draft') {
    return 'Registro montado. Toque em salvar para confirmar.';
  }

  return 'Falta um detalhe para eu registrar agora.';
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
      ? `Treino pronto: ${normalized.modality}. Salve para registrar.`
      : `Refeição pronta: ${normalized.description}. Salve para registrar.`;
  }

  return `Responda isto para eu registrar: ${normalized?.question || 'o que faltou nesse registro?'}`;
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
      text: 'Registrando agora...',
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
