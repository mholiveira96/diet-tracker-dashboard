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
    'Refeição registrada. Números atualizados.'
  );

  assert.equal(
    describeResult({ decision: { mode: 'auto_save' }, normalized: { action: 'log_workout' } }),
    'Treino registrado. Números atualizados.'
  );
});

test('buildAssistantReplyText uses assertive draft and clarify copy', () => {
  assert.equal(
    buildAssistantReplyText({ action: 'log_meal', description: 'Almoço completo' }, 'draft'),
    'Refeição pronta: Almoço completo. Salve para registrar.'
  );

  assert.equal(
    buildAssistantReplyText({ modality: 'Corrida 5km' }, 'draft'),
    'Treino pronto: Corrida 5km. Salve para registrar.'
  );

  assert.equal(
    buildAssistantReplyText({ question: 'Quantos gramas?' }, 'clarify'),
    'Responda isto para eu registrar: Quantos gramas?'
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
  assert.equal(result.waitingMessage.text, 'Registrando agora...');
  assert.equal(result.waitingMessage.status, 'processando');
});
