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
  samples: [
    sample('Q2', 'HOIST', 'Hoist', '2026-11-10', 'Critical', { act: 'Change Oil', rec: 'Change the oil now', wr: 'WR2611000001' }),
    sample('Q2', 'BOOM', 'Boom', '2026-11-10', 'Caution', { act: 'Monitor' }),
    sample('Q1', 'TROLLEY', 'Trolley', '2026-10-05', 'Normal'),
    sample('Q2', 'HOIST', 'Hoist', '2026-09-01', 'Caution', { act: 'Resample' }),
  ],
};
