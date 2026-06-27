const { getSetting, setSetting } = require('../chat/store.js');

function mergePreferencesUpdate(current, patch) {
  return {
    parserMode: patch.parserMode ?? current.parserMode,
    imageRetentionDays: patch.imageRetentionDays ?? current.imageRetentionDays,
  };
}

async function getPreferences() {
  const parserMode = (await getSetting('parser_mode')) || 'balanced';
  const imageRetentionDays = Number((await getSetting('image_retention_days')) || '180');
  return { parserMode, imageRetentionDays };
}

async function savePreferences({ parserMode, imageRetentionDays }) {
  await Promise.all([
    setSetting('parser_mode', parserMode),
    setSetting('image_retention_days', imageRetentionDays),
  ]);

  return { parserMode, imageRetentionDays };
}

module.exports = {
  mergePreferencesUpdate,
  getPreferences,
  savePreferences,
};
