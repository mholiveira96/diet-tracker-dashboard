const test = require('node:test');
const assert = require('node:assert/strict');

const { getStoredTab, normalizeTab } = require('../../lib/ui/tabs.js');

test('normalizeTab accepts only the remaining dashboard tabs', () => {
  assert.equal(normalizeTab('chat'), 'analytics');
  assert.equal(normalizeTab('analytics'), 'analytics');
  assert.equal(normalizeTab('profile'), 'profile');
  assert.equal(normalizeTab('weird'), 'analytics');
  assert.equal(normalizeTab(undefined), 'analytics');
});

test('getStoredTab reads the last tab from storage and falls back to analytics', () => {
  const storage = {
    getItem(key) {
      return key === 'diet-tracker:active-tab' ? 'analytics' : null;
    },
  };

  assert.equal(getStoredTab(storage), 'analytics');
  assert.equal(getStoredTab({ getItem: () => 'unknown' }), 'analytics');
  assert.equal(getStoredTab(null), 'analytics');
});
