/** A small made-up oil analysis result set in the shape the oil reader produces. */
const sample = (id, sys, grp, d, res, extra = {}) => ({
  id, sys, grp, oil: 'GEAR OIL', d, rd: d, batch: 'A', sid: `${id}-${sys}-${d}`, res,
  rem: '', fm: res === 'Normal' ? '' : 'Oil Cleanliness', rec: '', act: '', wr: '', fleet: 'Fleet A', use: '', ...extra,
});

export const syntheticOilLab = {
  kind: 'oil-lab',
  v: 1,
  built: '2026-11-16',
  at: Date.UTC(2026, 10, 16, 5),
  src: 'oil-sample.xlsx',
  sheets: { 'Result 2026': 4 },
  plan: [
    {
      id: 'Q2', comp: 'Hoist', fleet: 'Fleet A', lastChange: '2025-01-10', changeStatus: 'Due', usage: 22.5, priority: 'P1',
      next: '2026-11-01', sampleStatus: 'OK', last: 'Critical', action: 'Change oil',
      cycles: [{ d: '2026-09-01', v: 310.2, t: 0.4, o: 1.5, w: 120 }, { d: '2026-11-10', v: 330, t: 0.9, o: 4.2, w: 760 }],
    },
    {
      id: 'Q2', comp: 'Boom', fleet: 'Fleet A', lastChange: '2026-01-10', changeStatus: 'OK', usage: 10, priority: 'P2',
      next: '2026-11-01', sampleStatus: 'Due', last: 'Caution', action: 'Monitor', cycles: [],
    },
    {
      id: 'Q1', comp: 'Hoist', fleet: 'Fleet A', lastChange: '2026-05-10', changeStatus: 'OK', usage: 6, priority: 'P3',
      next: '2027-05-01', sampleStatus: 'OK', last: 'Normal', action: '', cycles: [],
    },
    { id: 'Q1', comp: 'Boom', fleet: 'Fleet A', lastChange: '', changeStatus: '', usage: null, priority: '', next: '', sampleStatus: '', last: '', action: '', cycles: [] },
  ],
  wo: [{ id: 'Q2', fleet: 'Fleet A', parts: ['Hoist', 'Boom'], wo: '', d: '2026-11-12', st: 'Open' }],
  refs: { limits: [['Parameter', 'Abnormal', 'Severe'], ['Iron', '100', '150']] },
  samples: [
    sample('Q2', 'HOIST', 'Hoist', '2026-11-10', 'Critical', { act: 'Change Oil', rec: 'Change the oil now', wr: 'WR2611000001' }),
    sample('Q2', 'BOOM', 'Boom', '2026-11-10', 'Caution', { act: 'Monitor' }),
    sample('Q1', 'TROLLEY', 'Trolley', '2026-10-05', 'Normal'),
    sample('Q2', 'HOIST', 'Hoist', '2026-09-01', 'Caution', { act: 'Resample' }),
  ],
};
