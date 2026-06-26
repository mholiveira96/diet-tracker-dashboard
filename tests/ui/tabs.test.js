const test = require('node:test');
const assert = require('node:assert/strict');

const { getStoredTab, normalizeTab } = require('../../lib/ui/tabs.js');

test('normalizeTab accepts only known tabs', () => {
  assert.equal(normalizeTab('chat'), 'chat');
  assert.equal(normalizeTab('analytics'), 'analytics');
  assert.equal(normalizeTab('profile'), 'profile');
  assert.equal(normalizeTab('weird'), 'chat');
  assert.equal(normalizeTab(undefined), 'chat');
});

test('getStoredTab reads the last tab from storage and falls back to chat', () => {
  const storage = {
    getItem(key) {
      return key === 'diet-tracker:active-tab' ? 'analytics' : null;
    },
  };

  assert.equal(getStoredTab(storage), 'analytics');
  assert.equal(getStoredTab({ getItem: () => 'unknown' }), 'chat');
  assert.equal(getStoredTab(null), 'chat');
});
