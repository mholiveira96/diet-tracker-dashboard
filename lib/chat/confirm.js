function buildDraftConfirmationPlan({ status, normalized, existingLinks = [] }) {
  if (!normalized) {
    throw new Error('Draft message has no normalized payload');
  }

  const existingRecordLink = existingLinks.find((link) => link.link_type === 'created');
  const alreadySaved = status === 'saved' || Boolean(existingRecordLink);

  return {
    alreadySaved,
    shouldPersistRecord: !alreadySaved,
    nextStatus: 'saved',
    recordLink: existingRecordLink || null,
  };
}

function buildSavedDraftMetadata(metadata = {}, record = null) {
  return {
    ...metadata,
    decision: { mode: 'auto_save' },
    ...(record ? { record } : {}),
  };
}

module.exports = {
  buildDraftConfirmationPlan,
  buildSavedDraftMetadata,
};
