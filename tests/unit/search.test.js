import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digitsOf, findCranes } from '../../src/js/domain/search.js';

const ids = ['Q1', 'Q45', 'Q145', 'Q450', 'Q8'];

test('digitsOf ignores letters and leading zeros', () => {
  assert.equal(digitsOf('q045'), '45');
  assert.equal(digitsOf('abc'), '');
});

test('findCranes lists numbers that start with the digits first, then the rest', () => {
  assert.deepEqual(findCranes(ids, '45', 10), ['Q45', 'Q450', 'Q145']);
  assert.deepEqual(findCranes(ids, 'q045', 1), ['Q45']);
  assert.deepEqual(findCranes(ids, 'zzz', 10), []);
});
