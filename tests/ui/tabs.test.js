const test = require('node:test');
const assert = require('node:assert/strict');

const { getStoredTab, normalizeTab } = require('../../lib/ui/tabs.js');

test('normalizeTab accepts the group and profile dashboard tabs', () => {
  assert.equal(normalizeTab('chat'), 'group');
  assert.equal(normalizeTab('group'), 'group');
  assert.equal(normalizeTab('analytics'), 'analytics');
  assert.equal(normalizeTab('profile'), 'profile');
  assert.equal(normalizeTab('weird'), 'group');
  assert.equal(normalizeTab(undefined), 'group');
});

test('getStoredTab reads the last tab from storage and falls back to group', () => {
  const storage = {
    getItem(key) {
      return key === 'diet-tracker:active-tab' ? 'analytics' : null;
    },
  };

  assert.equal(getStoredTab(storage), 'analytics');
  assert.equal(getStoredTab({ getItem: () => 'unknown' }), 'group');
  assert.equal(getStoredTab(null), 'group');
});
