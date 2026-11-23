/**
 * The oil analysis (lab) results: a second file, separate from the LIVE UPDATE workbook.
 *
 * @typedef {object} OilLab
 * @property {'oil-lab'} kind
 * @property {number} v        Shape version
 * @property {string} built    Upload day, "2026-11-23"
 * @property {number} at       Upload time in milliseconds
 * @property {string} src      Name of the Excel file
 * @property {Object<string, number>} sheets   Samples read from each result sheet
 * @property {Sample[]} samples   Newest sampling date first
 *
 * @typedef {{id: string, sys: string, grp: string, oil: string, d: string, rd: string, batch: string,
 *   sid: string, res: 'Normal'|'Caution'|'Critical'|'', rem: string, fm: string, rec: string,
 *   act: string, wr: string, fleet: string, use: string}} Sample
 *   id crane, sys component as written, grp component group, d sampling date, rd report received,
 *   res lab result, fm failure mode, rec lab recommendation, act action taken, wr work request
 */
import { lastMonthKeys, todayIso } from '../lib/dates.js';

export const RESULTS = ['Normal', 'Caution', 'Critical'];
export const RESULT_TONE = { Normal: 'ok', Caution: 'warn', Critical: 'bad' };
export const MONTHS_SHOWN = 12;

export function normalizeOilLab(data) {
  return data && data.kind === 'oil-lab' && Array.isArray(data.samples) ? data : null;
}

let current = null;
let byCrane = new Map();
const listeners = new Set();

export const onOilLabChange = (listener) => listeners.add(listener);

export function setOilLab(data) {
  current = normalizeOilLab(data);
  byCrane = new Map();
  for (const sample of current?.samples ?? []) {
    if (!byCrane.has(sample.id)) byCrane.set(sample.id, []);
    byCrane.get(sample.id).push(sample);
  }
  listeners.forEach((listener) => listener(current));
  return current;
}

export const getOilLab = () => current;
export const hasOilLab = () => current !== null;
/** One crane's samples, newest first. */
export const samplesOfCrane = (id) => byCrane.get(id) ?? [];

/** The newest sample of each crane and component: what the oil is like now. */
export function latestSamples(samples) {
  const newest = new Map();
  for (const sample of samples) {
    const key = `${sample.id}|${sample.sys}`;
    const known = newest.get(key);
    if (!known || sample.d > known.d) newest.set(key, sample);
  }
  return [...newest.values()];
}

/** Worst first, then newest first. */
const bySeverity = (a, b) =>
  RESULTS.indexOf(b.res) - RESULTS.indexOf(a.res) || b.d.localeCompare(a.d) || a.id.localeCompare(b.id);

/** A latest sample that still needs someone: critical, or caution with an oil change advised. */
export const needsAction = (sample) =>
  sample.res === 'Critical' || (sample.res === 'Caution' && /change/i.test(sample.act));

const tally = () => ({ Normal: 0, Caution: 0, Critical: 0 });

let cache = { lab: null, day: '', summary: null };

function summarize(lab) {
  const months = lastMonthKeys(MONTHS_SHOWN);
  const inWindow = lab.samples.filter((sample) => months.includes(sample.d.slice(0, 7)));
  const byMonth = Object.fromEntries(months.map((key) => [key, tally()]));
  const byGroup = {};
  const modes = {};
  for (const sample of inWindow) {
    if (!sample.res) continue;
    byMonth[sample.d.slice(0, 7)][sample.res] += 1;
    (byGroup[sample.grp] ||= tally())[sample.res] += 1;
    if (sample.fm && sample.res !== 'Normal') modes[sample.fm] = (modes[sample.fm] || 0) + 1;
  }
  // "Now" means the newest result of each component, as long as it is from the last 12 months.
  const latest = latestSamples(lab.samples.filter((sample) => sample.res)).filter((sample) => months.includes(sample.d.slice(0, 7)));
  const attention = latest.filter(needsAction).sort(bySeverity);
  const criticalByCrane = {};
  for (const sample of latest) if (sample.res === 'Critical') criticalByCrane[sample.id] = (criticalByCrane[sample.id] || 0) + 1;
  return {
    months,
    windowCount: inWindow.length,
    byMonth,
    byGroup,
    modes,
    latest,
    attention,
    criticalNow: latest.filter((s) => s.res === 'Critical').length,
    cautionNow: latest.filter((s) => s.res === 'Caution').length,
    changeOil: latest.filter((s) => s.res !== 'Normal' && /change/i.test(s.act)).length,
    criticalByCrane: Object.entries(criticalByCrane).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    newest: lab.samples[0]?.d ?? '',
  };
}

/** Fleet-wide figures for the lab results, worked out once per upload and day. */
export function getOilLabSummary() {
  const day = todayIso();
  if (!current) return null;
  if (cache.lab !== current || cache.day !== day) cache = { lab: current, day, summary: summarize(current) };
  return cache.summary;
}

export { bySeverity };
