const TAB_STORAGE_KEY = 'diet-tracker:active-tab';
const VALID_TABS = new Set(['chat', 'analytics', 'profile']);

function normalizeTab(value) {
  return VALID_TABS.has(value) ? value : 'chat';
}

function getStoredTab(storage) {
  if (!storage || typeof storage.getItem !== 'function') return 'chat';
  return normalizeTab(storage.getItem(TAB_STORAGE_KEY));
}

module.exports = {
  TAB_STORAGE_KEY,
  normalizeTab,
  getStoredTab,
};
