const test = require('node:test');
const assert = require('node:assert/strict');

const { getTodayInTimezone, shiftDate } = require('../../lib/date.js');

test('getTodayInTimezone returns the correct Sao Paulo date after midnight local time', () => {
  const iso = getTodayInTimezone('2026-06-26T05:11:54.000Z', 'America/Sao_Paulo');
  assert.equal(iso, '2026-06-26');
});

test('shiftDate moves an iso date by whole days', () => {
  assert.equal(shiftDate('2026-06-26', -1), '2026-06-25');
  assert.equal(shiftDate('2026-06-26', 1), '2026-06-27');
});
