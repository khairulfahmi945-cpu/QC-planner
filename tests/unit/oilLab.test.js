import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { componentGroup, findResultSheets, normalizeResult, parseOilWorkbook } from '../../src/js/data/oilLabReader.js';
import { setNow } from '../../src/js/lib/clock.js';
import { getOilLabSummary, latestSamples, needsAction, samplesOfCrane, setOilLab } from '../../src/js/domain/oilLab.js';
import { syntheticOilLab } from '../fixtures/oilLab.js';

afterEach(() => {
  setNow(null);
  setOilLab(null);
});

test('only "Result <year>" sheets are read, newest year first', () => {
  assert.deepEqual(findResultSheets(['Hoist', 'Result 2025', 'Result 2026', 'Result 2024', 'Graph']), ['Result 2026', 'Result 2025', 'Result 2024']);
});

test('components are grouped and results normalised', () => {
  assert.equal(componentGroup('SPREADER CABLE REEL'), 'SCR');
  assert.equal(componentGroup('GANTRY GB 7'), 'Gantry');
  assert.equal(componentGroup('TROLLEY LS'), 'Trolley');
  assert.equal(componentGroup('HOIST'), 'Hoist');
  assert.equal(componentGroup('MCR'), 'MCR');
  assert.equal(componentGroup('something'), 'Other');
  assert.equal(normalizeResult('critical'), 'Critical');
  assert.equal(normalizeResult('N/A'), '');
});

test('parseOilWorkbook reads rows by header name and keeps each sample once', () => {
  const header = ['EQ Type', 'Eq ID', 'System', 'Oil Type', 'Sampling Date', 'Batch No.', 'Sample ID', 'PR Number', 'Report Received', 'Result', 'Remarks', 'Failure Mode', 'Recommendation', 'Action', 'Work Request', 'Fleet'];
  const row = ['QC', 'Q07', 'HOIST', 'GEAR OIL', new Date(2026, 10, 3), 'K', 'K1', 'Internal lab', new Date(2026, 10, 6), 'critical', 'ISO high', 'Oil Cleanliness', 'Resample', 'Change Oil', 'N/A', 'Fleet A'];
  const fake = {
    read: (_buffer, options) => (options.bookSheets ? { SheetNames: ['Result 2026'] } : { Sheets: { 'Result 2026': [[], header, row, row, ['QC', 'bad id']] } }),
    utils: { sheet_to_json: (rows) => rows },
  };
  const lab = parseOilWorkbook(fake, new ArrayBuffer(0), 'oil.xlsx');
  assert.equal(lab.samples.length, 1);
  assert.deepEqual([lab.samples[0].id, lab.samples[0].res, lab.samples[0].act, lab.samples[0].wr], ['Q07', 'Critical', 'Change Oil', '']);
  assert.throws(() => parseOilWorkbook({ read: () => ({ SheetNames: ['Hoist'] }) }, new ArrayBuffer(0), 'x.xlsx'), /Result/);
});

test('the newest result of each component decides what needs action', () => {
  setNow('2026-11-16T12:00:00');
  setOilLab(syntheticOilLab);
  assert.equal(latestSamples(syntheticOilLab.samples).length, 3);
  assert.equal(samplesOfCrane('Q2').length, 3);
  const summary = getOilLabSummary();
  assert.equal(summary.criticalNow, 1);
  assert.equal(summary.cautionNow, 1);
  assert.equal(summary.changeOil, 1);
  assert.deepEqual(summary.attention.map((s) => s.sys), ['HOIST']);
  assert.ok(needsAction(summary.attention[0]));
});
