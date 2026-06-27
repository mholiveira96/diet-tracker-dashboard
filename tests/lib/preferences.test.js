const test = require('node:test');
const assert = require('node:assert/strict');

const { mergePreferencesUpdate } = require('../../lib/repositories/preferences.js');

test('mergePreferencesUpdate preserves existing values on partial updates', () => {
  const merged = mergePreferencesUpdate(
    { parserMode: 'balanced', imageRetentionDays: 180 },
    { parserMode: 'aggressive' }
  );

  assert.deepEqual(merged, { parserMode: 'aggressive', imageRetentionDays: 180 });
});

test('mergePreferencesUpdate can update imageRetentionDays without touching parserMode', () => {
  const merged = mergePreferencesUpdate(
    { parserMode: 'conservative', imageRetentionDays: 90 },
    { imageRetentionDays: 365 }
  );

  assert.deepEqual(merged, { parserMode: 'conservative', imageRetentionDays: 365 });
});
