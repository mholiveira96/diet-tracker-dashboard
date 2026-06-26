const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldCacheRequest } = require('../../lib/pwa/cache.js');

test('shouldCacheRequest skips api GET requests', () => {
  assert.equal(shouldCacheRequest('GET', 'https://dieta-matheusinho.vercel.app/api/chat/thread'), false);
  assert.equal(shouldCacheRequest('GET', 'https://dieta-matheusinho.vercel.app/api/data?date=2026-06-26'), false);
});

test('shouldCacheRequest caches same-origin static assets', () => {
  assert.equal(shouldCacheRequest('GET', 'https://dieta-matheusinho.vercel.app/chat-bg.svg'), true);
  assert.equal(shouldCacheRequest('POST', 'https://dieta-matheusinho.vercel.app/chat-bg.svg'), false);
});
