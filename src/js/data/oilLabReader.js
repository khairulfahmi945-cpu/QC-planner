/**
 * Turns the QC Oil Analysis workbook into an OilLab (see domain/oilLab.js).
 *   "Result <year>"       one row per oil sample sent to the lab
 *   Hoist, Trolley, ...   the plan: per crane, oil change and sampling status, with the sampling history
 *   "Work Order"          oil sampling work orders
 *   Properties Limit, QC Mini Chart, SANY   reference tables, kept as they are laid out
 */
import { cellText, craneIdFromCell, headerText } from './cells.js';
import { COMPONENTS } from '../domain/oilLab.js';
import { parseNumber } from '../lib/format.js';
import { now } from '../lib/clock.js';
import { todayIso } from '../lib/dates.js';

export const OIL_LAB_VERSION = 2;
const HEADER_SEARCH_ROWS = 6;
const MAX_TEXT = 400;

const RESULT_SHEET = /^result\s*(\d{4})$/i;

/** Column names in the sheet, in capitals, mapped to the field they fill. */
const COLUMNS = {
  'EQ ID': 'id',
  SYSTEM: 'sys',
  'OIL TYPE': 'oil',
  'SAMPLING DATE': 'd',
  'REPORT RECEIVED': 'rd',
  'BATCH NO.': 'batch',
  'SAMPLE ID': 'sid',
  RESULT: 'res',
  REMARKS: 'rem',
  'FAILURE MODE': 'fm',
  RECOMMENDATION: 'rec',
  ACTION: 'act',
  'WORK REQUEST': 'wr',
  FLEET: 'fleet',
  'OIL USAGE (MONTHS)': 'use',
};

/** The result sheets of the workbook, newest year first. */
export const findResultSheets = (names) =>
  names
    .map((name) => ({ name, year: RESULT_SHEET.exec(String(name).trim())?.[1] }))
    .filter((sheet) => sheet.year)
    .sort((a, b) => b.year - a.year)
    .map((sheet) => sheet.name);

/** "SPREADER CABLE REEL" -> "SCR", "GANTRY GB 7" -> "Gantry", "TROLLEY LS" -> "Trolley". */
export function componentGroup(system) {
  const text = String(system || '').toUpperCase();
  if (/SPREADER|^SCR/.test(text)) return 'SCR';
  if (/^GANTRY/.test(text)) return 'Gantry';
  if (/^TROLLEY/.test(text)) return 'Trolley';
  if (/CATENARY/.test(text)) return 'Catenary';
  if (/^(MCR|TLS)$/.test(text.trim())) return text.trim();
  if (/^(HOIST|BOOM)$/.test(text.trim())) return text.trim().charAt(0) + text.trim().slice(1).toLowerCase();
  return 'Other';
}

export function normalizeResult(text) {
  if (/crit/i.test(text)) return 'Critical';
  if (/caut/i.test(text)) return 'Caution';
  return /norm/i.test(text) ? 'Normal' : '';
}

/** "Change Oil", "Monitor" and "Resample" are kept; "N/A", "None" and blanks mean no action. */
const actionOf = (text) => (/^(n\/?a|none|nil|-)?$/i.test(text) ? '' : text);

const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

function columnMap(rows) {
  for (const row of rows.slice(0, HEADER_SEARCH_ROWS)) {
    const map = {};
    row.forEach((cell, index) => {
      const field = COLUMNS[headerText(cell)];
      if (field && !(field in map)) map[field] = index;
    });
    if ('id' in map && 'd' in map && 'res' in map) return { map, headerAt: rows.indexOf(row) };
  }
  return null;
}

function readSample(row, map) {
  const text = (field) => (field in map ? cellText(row[map[field]]) : '');
  const id = craneIdFromCell(row[map.id]);
  const sampled = text('d');
  if (!id || !sampled) return null;
  const system = text('sys');
  return {
    id,
    sys: system,
    grp: componentGroup(system),
    oil: text('oil'),
    d: sampled,
    rd: text('rd'),
    batch: text('batch'),
    sid: text('sid'),
    res: normalizeResult(text('res')),
    rem: clip(text('rem')),
    fm: /^(normal|none)?$/i.test(text('fm')) ? '' : text('fm'),
    rec: clip(text('rec')),
    act: actionOf(text('act')),
    wr: /^(n\/?a|none)?$/i.test(text('wr')) ? '' : text('wr'),
    fleet: text('fleet'),
    use: /^(nil|n\/?a)?$/i.test(text('use')) ? '' : text('use'),
  };
}

const componentOf = (name) => COMPONENTS.find((c) => c.toUpperCase() === String(name).trim().toUpperCase());

const PLAN_COLUMNS = {
  FLEET: 'fleet',
  'EQ. ID': 'id',
  'LAST OIL CHANGE': 'lastChange',
  'OIL CHANGE STATUS': 'changeStatus',
  'OIL USAGE (MONTH)': 'usage',
  'SAMPLING PRIORITY': 'priority',
  'NEXT SAMPLING SCHEDULE': 'next',
  'SAMPLING STATUS': 'sampleStatus',
  'LAST ANALYSIS RESULT': 'last',
  'ACTION REQUIRE': 'action',
};

const number = (value, digits) => {
  const n = parseNumber(cellText(value).replace(/\s/g, ''));
  return n === null ? null : Math.round(n * 10 ** digits) / 10 ** digits;
};
const noneAsEmpty = (text) => (/^(none|n\/?a|-)?$/i.test(text) ? '' : text);

/** Sampling history: groups of five columns (date, viscosity, TAN, oxidation, water) after the status columns. */
function readCycles(row, header) {
  const cycles = [];
  header.forEach((cell, index) => {
    if (headerText(cell) !== 'SAMPLING DATE' || index < 8) return;
    const d = cellText(row[index]);
    if (!d) return;
    cycles.push({ d, v: number(row[index + 1], 1), t: number(row[index + 2], 2), o: number(row[index + 3], 2), w: number(row[index + 4], 0) });
  });
  return cycles;
}

/** One plan sheet (one component): a row per crane. */
function readPlanSheet(rows, component) {
  const headerAt = rows.findIndex((row, index) => index < HEADER_SEARCH_ROWS + 4 && row.some((cell) => headerText(cell) === 'EQ. ID'));
  if (headerAt < 0) return [];
  const header = rows[headerAt];
  const map = {};
  header.forEach((cell, index) => {
    const field = PLAN_COLUMNS[headerText(cell)];
    if (field && !(field in map)) map[field] = index;
  });
  const out = [];
  for (const row of rows.slice(headerAt + 1)) {
    const id = craneIdFromCell(row[map.id]);
    if (!id) continue;
    const text = (field) => (field in map ? noneAsEmpty(cellText(row[map[field]])) : '');
    out.push({
      id,
      comp: component,
      fleet: text('fleet'),
      lastChange: text('lastChange'),
      changeStatus: text('changeStatus'),
      usage: number(row[map.usage], 1),
      priority: text('priority'),
      next: text('next'),
      sampleStatus: text('sampleStatus'),
      last: normalizeResult(text('last')),
      action: text('action'),
      cycles: readCycles(row, header),
    });
  }
  return out;
}

/** Oil sampling work orders: which components are planned on each crane, and the order's status. */
function readWorkOrders(rows) {
  const headerAt = rows.findIndex((row) => row.some((cell) => headerText(cell) === 'WORK ORDER STATUS'));
  if (headerAt < 0) return [];
  const header = rows[headerAt];
  const at = (title) => header.findIndex((cell) => headerText(cell) === title);
  const idAt = at('EQ. ID');
  const labels = rows[headerAt + 1] || [];
  const columns = labels.map((cell, index) => [componentOf(cell), index]).filter(([name]) => name);
  const out = [];
  for (const row of rows.slice(headerAt + 2)) {
    const id = craneIdFromCell(row[idAt]);
    if (!id) continue;
    out.push({
      id,
      fleet: cellText(row[at('FLEET')]),
      parts: columns.filter(([, index]) => /plan/i.test(cellText(row[index]))).map(([name]) => name),
      wo: cellText(row[at('WORK ORDER')]),
      d: cellText(row[at('DATE')]),
      st: cellText(row[at('WORK ORDER STATUS')]),
    });
  }
  return out;
}

/** A reference sheet as a plain grid of text: empty rows dropped, empty leading and trailing columns trimmed. */
function readGrid(rows) {
  const grid = rows.map((row) => row.map((cell) => cellText(cell))).filter((row) => row.some(Boolean));
  const used = grid.flatMap((row) => row.map((cell, index) => (cell ? index : -1))).filter((index) => index >= 0);
  if (!used.length) return [];
  const [first, last] = [Math.min(...used), Math.max(...used)];
  return grid.map((row) => row.slice(first, last + 1));
}

const REFERENCE_SHEETS = [
  ['limits', /^properties limit/i],
  ['lube', /mini chart|lube chart/i],
  ['sany', /^sany$/i],
];

/**
 * @param {object} XLSX the SheetJS library
 * @param {ArrayBuffer|Uint8Array} buffer the file contents
 * @param {string} fileName shown on the Data page
 * @returns {import('../domain/oilLab.js').OilLab}
 */
export function parseOilWorkbook(XLSX, buffer, fileName) {
  const names = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames;
  const sheets = findResultSheets(names);
  if (!sheets.length) throw new Error('no "Result <year>" sheets were found. Is this the QC Oil Analysis file?');

  const planSheets = names.filter((name) => componentOf(name));
  const orderSheet = names.find((name) => /^work order/i.test(name.trim()));
  const references = REFERENCE_SHEETS.map(([key, pattern]) => [key, names.find((name) => pattern.test(name.trim()))]).filter(([, name]) => name);
  const wanted = [...sheets, ...planSheets, orderSheet, ...references.map(([, name]) => name)].filter(Boolean);

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, sheets: wanted });
  const rowsOf = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' });
  const samples = [];
  const perSheet = {};
  const seen = new Set();
  for (const name of sheets) {
    const rows = rowsOf(name);
    const columns = columnMap(rows);
    if (!columns) throw new Error(`the "${name}" sheet has no Eq ID / Sampling Date / Result columns.`);
    perSheet[name] = 0;
    for (const row of rows.slice(columns.headerAt + 1)) {
      const sample = readSample(row, columns.map);
      if (!sample) continue;
      // The same sample can appear on two year sheets around New Year; keep it once.
      const key = `${sample.sid}|${sample.id}|${sample.sys}|${sample.d}`;
      if (sample.sid && seen.has(key)) continue;
      seen.add(key);
      samples.push(sample);
      perSheet[name] += 1;
    }
  }
  samples.sort((a, b) => b.d.localeCompare(a.d) || a.id.localeCompare(b.id));

  return {
    kind: 'oil-lab',
    v: OIL_LAB_VERSION,
    built: todayIso(),
    at: now().getTime(),
    src: fileName,
    sheets: perSheet,
    samples,
    plan: planSheets.flatMap((name) => readPlanSheet(rowsOf(name), componentOf(name))),
    wo: orderSheet ? readWorkOrders(rowsOf(orderSheet)) : [],
    refs: Object.fromEntries(references.map(([key, name]) => [key, readGrid(rowsOf(name))])),
  };
}
