import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ropeLifeUsed, ropeTone, ropeType } from '../../src/js/domain/wirerope.js';

test('ropeType names the rope from the job text', () => {
  assert.equal(ropeType('Replace Main HOIST rope'), 'Main hoist');
  assert.equal(ropeType('catenary rope change'), 'Catenary');
  assert.equal(ropeType('grease'), 'Other');
});

test('ropeLifeUsed is a percent, or null when a number is missing', () => {
  assert.equal(ropeLifeUsed('50,000', '100,000'), 50);
  assert.equal(ropeLifeUsed('', '100'), null);
});

test('ropeTone escalates with wear', () => {
  assert.equal(ropeTone(10), 'normal');
  assert.equal(ropeTone(100), 'bad');
});
