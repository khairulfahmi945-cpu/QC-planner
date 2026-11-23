/**
 * Turns the QC Oil Analysis workbook into an OilLab (see domain/oilLab.js).
 * Only the "Result <year>" sheets are read: one row per oil sample sent to the lab.
 */
import { cellText, craneIdFromCell, headerText } from './cells.js';
import { now } from '../lib/clock.js';
import { todayIso } from '../lib/dates.js';

export const OIL_LAB_VERSION = 1;
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

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, sheets });
  const samples = [];
  const perSheet = {};
  const seen = new Set();
  for (const name of sheets) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' });
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
  };
}
