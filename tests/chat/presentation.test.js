const test = require('node:test');
const assert = require('node:assert/strict');

const {
  describeResult,
  buildPendingMessages,
  buildAssistantReplyText,
  buildStandardLaunchReply,
} = require('../../lib/chat/presentation.js');

test('describeResult uses assertive success copy', () => {
  assert.equal(
    describeResult({ decision: { mode: 'auto_save' }, normalized: { action: 'log_meal' } }),
    'Refeição registrada. Números atualizados.'
  );

  assert.equal(
    describeResult({ decision: { mode: 'auto_save' }, normalized: { action: 'log_workout' } }),
    'Treino registrado. Números atualizados.'
  );
});

test('buildAssistantReplyText uses itemized preview and clarify copy', () => {
  assert.equal(
    buildAssistantReplyText({ action: 'log_meal', description: 'Almoço completo', calories: 600, protein: 30, carbs: 50, fat: 20 }, 'draft'),
    '📝 Prévia do lançamento\n- Almoço completo: 600 kcal | 30,0g P | 50,0g C | 20,0g G\n\nTotal da refeição: 600 kcal | 30,0g P | 50,0g C | 20,0g G\n\nPosso lançar assim?'
  );

  assert.equal(
    buildAssistantReplyText({ action: 'log_workout', modality: 'Corrida 5km', duration_min: 30, calories: 250 }, 'draft'),
    '📝 Prévia do lançamento\n- Corrida 5km (30 min): 250 kcal\n\nTotal do treino: 250 kcal\n\nPosso lançar assim?'
  );

  assert.equal(
    buildAssistantReplyText({ question: 'Quantos gramas?' }, 'clarify'),
    'Responda isto para eu registrar: Quantos gramas?'
  );
});

test('buildStandardLaunchReply itemizes a composite meal and includes profile summary', () => {
  const reply = buildStandardLaunchReply({
    action: 'log_meal',
    meal_items: [
      { description: 'Arroz', amount: 150, unit: 'g', calories: 195, protein: 4, carbs: 42, fat: 0.5 },
      { description: 'Frango', amount: 120, unit: 'g', calories: 198, protein: 37, carbs: 0, fat: 4 },
    ],
  }, {
    summary: { kcal: 1200, protein: 100, carbs: 130, fat: 35 },
    workouts: { total: 300 },
    goals: { calories: 2200, protein: 180, carbs: 240, fat: 70 },
  });

  assert.match(reply, /- Arroz \(150 g\): 195 kcal/);
  assert.match(reply, /- Frango \(120 g\): 198 kcal/);
  assert.match(reply, /Total da refeição: 393 kcal/);
  assert.match(reply, /Saldo líquido: 900 kcal/);
  assert.match(reply, /Dashboard: https:\/\/dieta-matheusinho\.vercel\.app\//);
});

test('buildPendingMessages creates instant outgoing and waiting bubbles', () => {
  const result = buildPendingMessages({
    text: '200g frango com arroz',
    attachments: [{ id: 1, url: '/uploads/chat/test.jpg' }],
  });

  assert.equal(result.userMessage.role, 'user');
  assert.equal(result.userMessage.text, '200g frango com arroz');
  assert.equal(result.userMessage.status, 'enviando');
  assert.equal(result.userMessage.attachments.length, 1);

  assert.equal(result.waitingMessage.role, 'assistant');
  assert.equal(result.waitingMessage.message_type, 'pending');
  assert.equal(result.waitingMessage.text, 'Registrando agora...');
  assert.equal(result.waitingMessage.status, 'processando');
});
