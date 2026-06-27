const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDraftConfirmationPlan, buildSavedDraftMetadata } = require('../../lib/chat/confirm.js');

test('buildDraftConfirmationPlan saves a pending draft exactly once', () => {
  const plan = buildDraftConfirmationPlan({
    status: 'needs_confirmation',
    normalized: { action: 'log_meal', description: 'Almoço', calories: 600 },
    existingLinks: [],
  });

  assert.equal(plan.shouldPersistRecord, true);
  assert.equal(plan.nextStatus, 'saved');
});

test('buildDraftConfirmationPlan is idempotent for already-saved drafts', () => {
  const plan = buildDraftConfirmationPlan({
    status: 'saved',
    normalized: { action: 'log_meal', description: 'Almoço', calories: 600 },
    existingLinks: [{ record_type: 'meal', record_id: '867', link_type: 'created' }],
  });

  assert.equal(plan.shouldPersistRecord, false);
  assert.equal(plan.nextStatus, 'saved');
  assert.deepEqual(plan.recordLink, { record_type: 'meal', record_id: '867', link_type: 'created' });
});

test('buildSavedDraftMetadata marks idempotent draft confirmations as saved', () => {
  const metadata = buildSavedDraftMetadata(
    { normalized: { action: 'log_meal', description: 'Almoço' }, sourceMessageId: 14 },
    { recordType: 'meal', recordId: '867' }
  );

  assert.deepEqual(metadata, {
    normalized: { action: 'log_meal', description: 'Almoço' },
    sourceMessageId: 14,
    decision: { mode: 'auto_save' },
    record: { recordType: 'meal', recordId: '867' },
  });
});
