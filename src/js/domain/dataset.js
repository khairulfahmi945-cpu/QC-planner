/**
 * The workbook model: what the Excel reader produces and what every page reads.
 *
 * @typedef {object} Dataset
 * @property {number} v          Shape version (see DATA_VERSION)
 * @property {string} built      Upload day, "2026-11-16"
 * @property {number} at         Upload time in milliseconds
 * @property {string} src        Name of the Excel file
 * @property {number} year       Year the monthly sheets belong to
 * @property {Object<string, Crane>} qcs   Cranes by id ("Q45"), in numeric order
 *
 * @typedef {object} Crane
 * @property {string} fleet      Batch, "ZPMC C"
 * @property {string} desc       Type, "Quay Crane"
 * @property {string} pma        PMA registration number
 * @property {string} serial
 * @property {string} pmaExp     PMA / CF expiry date, ISO or ""
 * @property {PmRecord[]} pm     One record per monthly sheet
 * @property {Job[]} pr          PR / WO jobs (a job shared by cranes appears on each)
 * @property {RopeJob[]} wr      Wirerope jobs
 * @property {SanyRope[]} sany   SANY wirerope update rows
 * @property {OilJob[]} oil      Oil jobs, newest first
 * @property {Inspection[]} fyk  Quarterly inspections Q1 to Q4
 * @property {WorkRequest[]} wq  Work requests
 * @property {{d: string, s: string}} [sos]   SOS coupling service
 *
 * @typedef {{m: string, st: string, ls: string, a: string[], s: string, r: string, p: object}} PmRecord
 *   m month key, st crane status, ls last maintenance, a PM dates, s PM status, r remark, p parts
 * @typedef {{d: string, j: string, sc: string, wo: string, pr: string, v: string, rm: string,
 *   st: string, ps: string, po: string, grn: string, pu: string}} Job
 * @typedef {{mo: string, j: string, js: string, item: string, wo: string, pr: string, cwo: string,
 *   pd: string, loc: string, rec: string, cur: string, over: string, pct: string, pri: string,
 *   av: string, note: string}} RopeJob
 * @typedef {{ty: string, lim: string, st: string, d: string, mv: string, item: string, cur: string,
 *   x2?: {d: string, mv: string, item: string}}} SanyRope
 * @typedef {{d: string, ds: string, wo: string, s: string, c: string}} OilJob
 * @typedef {{q: string, a: string, n: string}} Inspection
 * @typedef {{no: string, d: string, tm: string, ds: string, pri: string, st: string, code: string,
 *   ty: string, wo: string, wos: string, rm: string}} WorkRequest
 */
import { now } from '../lib/clock.js';
import { formatDate } from '../lib/dates.js';
import { parseNumber } from '../lib/format.js';

const LIST_FIELDS = ['pm', 'pr', 'wr', 'oil', 'fyk', 'wq'];

/** Older saved files kept a single SANY object. It is now a list. */
function toSanyList(sany) {
  if (Array.isArray(sany)) return sany;
  if (!sany) return [];
  const moves = parseNumber(sany.cur) !== null ? sany.cur : '';
  return [{ ty: '', lim: '', st: sany.st, d: '', mv: '', item: sany.item, cur: moves }];
}

/**
 * Checks that data looks like a dataset and fills in anything a crane is missing, so the rest of the
 * code can rely on every list being there. Returns null when the data cannot be used.
 */
export function normalizeDataset(data) {
  if (!data || typeof data !== 'object' || !data.qcs || typeof data.qcs !== 'object') return null;
  for (const crane of Object.values(data.qcs)) {
    for (const field of LIST_FIELDS) if (!Array.isArray(crane[field])) crane[field] = [];
    for (const record of crane.pm) {
      if (!Array.isArray(record.a)) record.a = [];
      if (!record.p) record.p = {};
    }
    crane.sany = toSanyList(crane.sany);
  }
  return data;
}

let current = null;
let ids = [];
const listeners = new Set();

/** Calls listener() whenever the dataset is replaced or cleared. */
export function onDatasetChange(listener) {
  listeners.add(listener);
}

/** Makes data the dataset every page shows. Pass null to clear. Returns what was stored. */
export function setDataset(data) {
  current = normalizeDataset(data);
  ids = current ? Object.keys(current.qcs) : [];
  listeners.forEach((listener) => listener(current));
  return current;
}

export const getDataset = () => current;
export const hasDataset = () => current !== null;
export const craneIds = () => ids;
export const getCrane = (id) => (current ? current.qcs[id] : undefined);

/** The year the data is for. */
export const dataYear = () =>
  String(current?.year || String(current?.built || '').slice(0, 4) || now().getFullYear());

/** How many records a dataset holds in one list across all cranes ("pm", "wq", ...). */
export const countRecords = (data, field) =>
  Object.values(data.qcs).reduce((total, crane) => total + (crane[field]?.length ?? 0), 0);

/** "16 Nov 2026, 05:03": the day the file was uploaded and the time of day. */
export function describeUpload() {
  if (!current) return '';
  const time = current.at
    ? new Date(current.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  return formatDate(current.built) + (time ? `, ${time}` : '');
}
