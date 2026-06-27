const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ValidationError,
  normalizeLoggedAt,
  requireEnum,
  requireIntegerId,
  requireNumber,
  requireString,
  parseAttachmentIds,
  assertAtLeastOne,
} = require('../../lib/validation.js');

test('normalizeLoggedAt converts datetime-local inputs to sqlite shape', () => {
  assert.equal(normalizeLoggedAt('2026-06-27T08:45'), '2026-06-27 08:45:00');
  assert.equal(normalizeLoggedAt('2026-06-27 08:45:13'), '2026-06-27 08:45:00');
  assert.equal(normalizeLoggedAt(''), null);
});

test('normalizeLoggedAt rejects invalid values', () => {
  assert.throws(() => normalizeLoggedAt('27/06/2026 08:45'), ValidationError);
});

test('requireNumber enforces finite ranges', () => {
  assert.equal(requireNumber('42', 'calories', { min: 0, max: 100 }), 42);
  assert.throws(() => requireNumber(-1, 'calories', { min: 0 }), ValidationError);
  assert.throws(() => requireNumber('abc', 'calories'), ValidationError);
});

test('requireString and requireEnum validate text fields', () => {
  assert.equal(requireString('  almoço  ', 'description'), 'almoço');
  assert.equal(requireEnum('balanced', 'parserMode', ['conservative', 'balanced', 'aggressive']), 'balanced');
  assert.throws(() => requireEnum('wild', 'parserMode', ['conservative', 'balanced', 'aggressive']), ValidationError);
});

test('requireIntegerId validates positive numeric ids', () => {
  assert.equal(requireIntegerId('12', 'meal id'), 12);
  assert.throws(() => requireIntegerId('0', 'meal id'), ValidationError);
});

test('parseAttachmentIds keeps only valid unique ids', () => {
  assert.deepEqual(parseAttachmentIds([1, '2', 3]), [1, 2, 3]);
  assert.throws(() => parseAttachmentIds([1, 1]), ValidationError);
  assert.throws(() => parseAttachmentIds('1,2'), ValidationError);
});

test('assertAtLeastOne requires one meaningful input', () => {
  assert.doesNotThrow(() => assertAtLeastOne(['texto', []], 'erro'));
  assert.doesNotThrow(() => assertAtLeastOne(['', [3]], 'erro'));
  assert.throws(() => assertAtLeastOne(['', []], 'erro'), ValidationError);
});
