function formatNumber(value, decimals = 0) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toFixed(decimals).replace('.', ',');
}

function normalizedItems(normalized) {
  if (Array.isArray(normalized?.meal_items) && normalized.meal_items.length) return normalized.meal_items;
  if (normalized?.action === 'log_meal' || normalized?.description) return [normalized];
  if (normalized?.action === 'log_workout' || normalized?.modality) return [{
    description: normalized.modality,
    amount: normalized.duration_min,
    unit: 'min',
    calories: normalized.calories,
    workout: true,
  }];
  return [];
}

function formatItemLine(item) {
  const label = item.description || item.name || item.modality || 'Item';
  const portion = item.amount !== undefined && item.unit ? ` (${formatNumber(item.amount, 0)} ${item.unit})` : '';
  if (item.workout || item.modality) return `- ${label}${portion}: ${formatNumber(item.calories)} kcal`;
  return `- ${label}${portion}: ${formatNumber(item.calories)} kcal | ${formatNumber(item.protein, 1)}g P | ${formatNumber(item.carbs, 1)}g C | ${formatNumber(item.fat, 1)}g G`;
}

function sumMealItems(items) {
  return items.reduce((totals, item) => {
    totals.calories += Number(item.calories || 0);
    totals.protein += Number(item.protein || 0);
    totals.carbs += Number(item.carbs || 0);
    totals.fat += Number(item.fat || 0);
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function formatStandardSummary(summary) {
  if (!summary) return '';
  const consumed = summary.summary || summary.consumed || {};
  const goals = Array.isArray(summary.goals)
    ? { calories: summary.goals[0], protein: summary.goals[1], carbs: summary.goals[2], fat: summary.goals[3] }
    : (summary.goals || {});
  const workout = Number(summary.workouts?.total ?? summary.workout_kcal ?? 0);
  const net = Number(consumed.kcal || 0) - workout;
  return [
    '',
    '📊 Resumo do dia',
    `- Consumo: ${formatNumber(consumed.kcal)} / ${formatNumber(goals.calories)} kcal`,
    `- Treino ativo: -${formatNumber(workout)} kcal`,
    `- Saldo líquido: ${formatNumber(net)} kcal`,
    `- Proteína: ${formatNumber(consumed.protein, 1)} / ${formatNumber(goals.protein, 1)}g`,
    `- Carboidratos: ${formatNumber(consumed.carbs, 1)} / ${formatNumber(goals.carbs, 1)}g`,
    `- Gorduras: ${formatNumber(consumed.fat, 1)} / ${formatNumber(goals.fat, 1)}g`,
    '',
    `🎯 Restante: ${formatNumber(Number(goals.calories || 0) - net)} kcal | ${formatNumber(Number(goals.protein || 0) - Number(consumed.protein || 0), 1)}g P | ${formatNumber(Number(goals.carbs || 0) - Number(consumed.carbs || 0), 1)}g C | ${formatNumber(Number(goals.fat || 0) - Number(consumed.fat || 0), 1)}g G`,
    '🔗 Dashboard: https://dieta-matheusinho.vercel.app/',
  ].join('\n');
}

function buildStandardLaunchReply(normalized, summary, { draft = false } = {}) {
  const items = normalizedItems(normalized);
  const totals = sumMealItems(items);
  const isWorkout = normalized?.action === 'log_workout' || normalized?.modality;
  const totalLine = isWorkout
    ? `Total do treino: ${formatNumber(totals.calories)} kcal`
    : `Total da refeição: ${formatNumber(totals.calories)} kcal | ${formatNumber(totals.protein, 1)}g P | ${formatNumber(totals.carbs, 1)}g C | ${formatNumber(totals.fat, 1)}g G`;
  const assumption = normalized?.notes || normalized?.assumption || normalized?.ambiguities?.length
    ? `\nℹ️ Premissas: ${(normalized.notes || normalized.assumption || normalized.ambiguities || []).toString()}`
    : '';
  const heading = draft ? '📝 Prévia do lançamento' : '🍽️ Itens lançados';
  const confirmation = draft ? '\n\nPosso lançar assim?' : '';
  return [heading, ...items.map(formatItemLine), '', totalLine, assumption, draft ? confirmation : formatStandardSummary(summary)].join('\n').replace(/\n{3,}/g, '\n\n');
}

function describeResult(result) {
  if (!result?.decision?.mode) return null;
  if (result.decision.mode === 'auto_save') return result.normalized?.action === 'log_workout' ? 'Treino registrado. Números atualizados.' : 'Refeição registrada. Números atualizados.';
  if (result.decision.mode === 'draft') return 'Registro montado. Toque em salvar para confirmar.';
  return 'Falta um detalhe para eu registrar agora.';
}

function buildAssistantReplyText(normalized, mode, options = {}) {
  if (mode === 'auto_save') return buildStandardLaunchReply(normalized, options.summary);
  if (mode === 'draft') return buildStandardLaunchReply(normalized, null, { draft: true });
  return `Responda isto para eu registrar: ${normalized?.question || 'o que faltou nesse registro?'}`;
}

function buildPendingMessages({ text = '', attachments = [] }) {
  const now = new Date().toISOString();
  return {
    userMessage: { id: `pending-user-${Date.now()}`, role: 'user', message_type: attachments.length ? 'image' : 'text', text, status: 'enviando', created_at: now, attachments, metadata: { optimistic: true } },
    waitingMessage: { id: `pending-assistant-${Date.now()}`, role: 'assistant', message_type: 'pending', text: 'Registrando agora...', status: 'processando', created_at: now, metadata: { optimistic: true, waiting: true } },
  };
}

module.exports = { describeResult, buildAssistantReplyText, buildPendingMessages, buildStandardLaunchReply, normalizedItems, formatStandardSummary };
