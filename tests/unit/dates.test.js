import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { setNow } from '../../src/js/lib/clock.js';
import { daysFromToday, isIsoDate, lastMonthKeys, nextMonthKey, toIso } from '../../src/js/lib/dates.js';

afterEach(() => setNow(null));

test('isIsoDate accepts only YYYY-MM-DD', () => {
  assert.ok(isIsoDate('2026-11-05'));
  assert.ok(!isIsoDate('05/11/2026'));
  assert.ok(!isIsoDate(''));
});

test('daysFromToday counts whole calendar days from the pinned today', () => {
  setNow('2026-11-16T12:00:00');
  assert.equal(daysFromToday('2026-11-16'), 0);
  assert.equal(daysFromToday('2026-11-19'), 3);
  assert.equal(daysFromToday('2026-11-10'), -6);
  assert.equal(toIso(new Date(2026, 0, 5)), '2026-01-05');
});

test('month keys roll over the year', () => {
  assert.equal(nextMonthKey('2026-12'), '2027-01');
  setNow('2026-02-10T12:00:00');
  assert.deepEqual(lastMonthKeys(3), ['2025-12', '2026-01', '2026-02']);
});
