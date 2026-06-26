const test = require('node:test');
const assert = require('node:assert/strict');

const {
  describeResult,
  buildPendingMessages,
  buildAssistantReplyText,
} = require('../../lib/chat/presentation.js');

test('describeResult uses assertive success copy', () => {
  assert.equal(
    describeResult({ decision: { mode: 'auto_save' }, normalized: { action: 'log_meal' } }),
    'Refeição registrada. Vou atualizar seus números agora.'
  );

  assert.equal(
    describeResult({ decision: { mode: 'auto_save' }, normalized: { action: 'log_workout' } }),
    'Treino registrado. Vou atualizar seus números agora.'
  );
});

test('buildAssistantReplyText uses assertive draft and clarify copy', () => {
  assert.equal(
    buildAssistantReplyText({ action: 'log_meal', description: 'Almoço completo' }, 'draft'),
    'Encontrei esta refeição: Almoço completo. Se estiver certo, salva abaixo.'
  );

  assert.equal(
    buildAssistantReplyText({ modality: 'Corrida 5km' }, 'draft'),
    'Encontrei este treino: Corrida 5km. Se estiver certo, salva abaixo.'
  );

  assert.equal(
    buildAssistantReplyText({ question: 'Quantos gramas?' }, 'clarify'),
    'Quase certo. Me confirma só isto: Quantos gramas?'
  );
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
  assert.equal(result.waitingMessage.text, 'Analisando e registrando...');
  assert.equal(result.waitingMessage.status, 'processando');
});
