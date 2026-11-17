/** A small made-up dataset (no real port data) in the shape the Excel reader produces. */
const pm = (m, st, s) => ({ m, st, ls: '', a: [], s, r: '', p: {} });

const crane = (fleet, status, extra = {}) => ({
  fleet,
  desc: 'Quay Crane',
  pma: '',
  serial: '',
  pmaExp: '',
  pm: [pm('2026-10', status, 'DONE'), pm('2026-11', status, 'PLAN')],
  pr: [],
  wr: [],
  sany: [],
  oil: [],
  fyk: [],
  wq: [],
  ...extra,
});

export const syntheticDataset = {
  v: 2,
  built: '2026-11-16',
  at: Date.UTC(2026, 10, 16, 4),
  src: 'sample.xlsx',
  year: 2026,
  qcs: {
    Q1: crane('Fleet A', 'OPS'),
    Q2: crane('Fleet A', 'DOWN', {
      wq: [{ no: 'WR1', d: '2026-11-01', tm: '', ds: 'Spreader fault', pri: '1', st: 'OPEN', code: '', ty: '', wo: '', wos: '', rm: '' }],
    }),
    Q45: crane('Fleet B', 'OPS'),
  },
};
