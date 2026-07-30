const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROFILE_STORAGE_KEY,
  getStoredProfileId,
  profileRequestUrl,
  withProfileId,
} = require('../../lib/ui/profile-dashboard.js');

test('reads only a positive persisted profile id', () => {
  const storage = { getItem: () => '12' };
  assert.equal(getStoredProfileId(storage), 12);
  assert.equal(getStoredProfileId({ getItem: () => '0' }), null);
  assert.equal(getStoredProfileId({ getItem: () => 'not-a-number' }), null);
  assert.equal(getStoredProfileId(null), null);
  assert.equal(PROFILE_STORAGE_KEY, 'diet-tracker.active-profile-id');
});

test('builds profile-scoped request URLs without losing date parameters', () => {
  assert.equal(profileRequestUrl('/api/profiles', { date: '2026-07-30' }), '/api/profiles?date=2026-07-30');
  assert.equal(profileRequestUrl('/api/data', { profileId: 7, date: '2026-07-30' }), '/api/data?profileId=7&date=2026-07-30');
  assert.equal(profileRequestUrl('/api/meals/4', { profileId: 7 }), '/api/meals/4?profileId=7');
});

test('adds the active profile id to JSON mutation payloads', () => {
  assert.deepEqual(withProfileId({ calories: 2200, protein: 180 }, 7), { calories: 2200, protein: 180, profileId: 7 });
});
