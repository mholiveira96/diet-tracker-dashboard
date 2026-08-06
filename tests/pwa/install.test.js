const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DISMISSAL_COOLDOWN_MS,
  canShowInstallToast,
  hasRecentDismissal,
  isIosDevice,
  isMobileViewport,
  isStandaloneWindow,
} = require('../../lib/pwa/install.js');

test('PWA install visibility supports native prompts and mobile fallback instructions', () => {
  assert.equal(canShowInstallToast({ standalone: false, mobile: true, dismissed: false, hasDeferredPrompt: true, ios: false }), true);
  assert.equal(canShowInstallToast({ standalone: true, mobile: true, dismissed: false, hasDeferredPrompt: true, ios: false }), false);
  assert.equal(canShowInstallToast({ standalone: false, mobile: false, dismissed: false, hasDeferredPrompt: true, ios: false }), true);
  assert.equal(canShowInstallToast({ standalone: false, mobile: false, dismissed: false, hasDeferredPrompt: false, ios: false }), false);
  assert.equal(canShowInstallToast({ standalone: false, mobile: true, dismissed: false, hasDeferredPrompt: false, ios: true }), true);
  assert.equal(canShowInstallToast({ standalone: false, mobile: true, dismissed: false, hasDeferredPrompt: false, ios: false }), true);
});

test('PWA dismissal expires after the cooldown', () => {
  const now = 1_000_000;
  assert.equal(hasRecentDismissal(String(now - 1_000), now), true);
  assert.equal(hasRecentDismissal(String(now - DISMISSAL_COOLDOWN_MS - 1), now), false);
  assert.equal(hasRecentDismissal(null, now), false);
});

test('PWA helpers detect standalone and iOS devices', () => {
  assert.equal(isStandaloneWindow({ matchMedia: () => ({ matches: true }), navigator: {} }), true);
  assert.equal(isStandaloneWindow({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone', maxTouchPoints: 5 }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux', maxTouchPoints: 0 }), false);
});

test('PWA mobile detection supports embedded mobile browsers', () => {
  assert.equal(isMobileViewport({ matchMedia: () => ({ matches: false }), navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)' } }), true);
  assert.equal(isMobileViewport({ matchMedia: () => ({ matches: false }), navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } }), false);
});
