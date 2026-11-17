import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compactNumber, parseNumber, percentOf, plural, sentenceCase, truncate } from '../../src/js/lib/format.js';

test('parseNumber reads plain and comma numbers, and rejects anything else', () => {
  assert.equal(parseNumber('1,234'), 1234);
  assert.equal(parseNumber('-5.5'), -5.5);
  assert.equal(parseNumber('12 abc'), null);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber(undefined), null);
});

test('compactNumber shortens thousands and millions', () => {
  assert.equal(compactNumber(950), '950');
  assert.equal(compactNumber(4300), '4k');
  assert.equal(compactNumber(12_900_000), '12.9M');
});

test('plural, sentenceCase, truncate and percentOf', () => {
  assert.equal(plural(1, 'crane'), '1 crane');
  assert.equal(plural(3, 'crane'), '3 cranes');
  assert.equal(sentenceCase('WAITING PO'), 'Waiting PO');
  assert.equal(truncate('abcdef', 4), 'abc…');
  assert.equal(truncate('abc', 4), 'abc');
  assert.equal(percentOf(1, 4), 25);
  assert.equal(percentOf(1, 0), 100);
});
