const test = require('node:test');
const assert = require('node:assert/strict');

const { CLAIMABLE_PROFILE_SLUGS, normalizeClaimText } = require('../../lib/repositories/profiles.js');

test('only the closed roster can be claimed from WhatsApp text', () => {
  assert.deepEqual(CLAIMABLE_PROFILE_SLUGS, ['matheus', 'joyce', 'allan', 'musi']);
  assert.equal(normalizeClaimText('sou Joyce'), 'joyce');
  assert.equal(normalizeClaimText('  SOU   allan '), 'allan');
  assert.equal(normalizeClaimText('sou Legacy'), null);
  assert.equal(normalizeClaimText('sou outra pessoa'), null);
});
