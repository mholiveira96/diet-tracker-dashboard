const TAB_STORAGE_KEY = 'diet-tracker:active-tab';
const VALID_TABS = new Set(['analytics', 'profile']);

function normalizeTab(value) {
  return VALID_TABS.has(value) ? value : 'analytics';
}

function getStoredTab(storage) {
  if (!storage || typeof storage.getItem !== 'function') return 'analytics';
  return normalizeTab(storage.getItem(TAB_STORAGE_KEY));
}

module.exports = {
  TAB_STORAGE_KEY,
  normalizeTab,
  getStoredTab,
};
