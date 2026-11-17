/**
 * One reader per sheet. Each takes the sheet as rows of cells and adds what it finds to the
 * cranes in `book`. Layouts come from the LIVE UPDATE workbook; headers are found by name, not
 * by position, wherever the workbook has moved things before.
 */
import { pad2 } from '../lib/format.js';
import { cellText, craneIdFromCell, craneIdsInText, headerText, moneyText } from './cells.js';

const PARTS = ['HOIST', 'TROLLEY', 'BOOM', 'GANTRY', 'AUXILIARY'];
const OIL_JOBS_KEPT = 60;

/** The cranes being built up while the sheets are read. */
export class Book {
  constructor() {
    this.cranes = new Map();
    this.fixes = { wqDates: 0 };
  }

  crane(id) {
    if (!this.cranes.has(id)) this.cranes.set(id, { pm: [], pr: [], wr: [], oil: [], fyk: [], wq: [] });
    return this.cranes.get(id);
  }

  knows(id) {
    return this.cranes.has(id);
  }

  /** Cranes by id in numeric order, ready to store. */
  toRecord() {
    const record = {};
    [...this.cranes.keys()].sort((a, b) => +a.slice(1) - +b.slice(1)).forEach((id) => (record[id] = this.cranes.get(id)));
    return record;
  }
}

const cell = (row, index) => (index >= 0 ? cellText(row[index]) : '');

/* ---------- FYK INS: the crane list, certificate dates and quarterly inspections ---------- */
export function readCranes(rows, book) {
  for (const row of rows.slice(2)) {
    const id = craneIdFromCell(row[1]);
    if (!id) continue;
    Object.assign(book.crane(id), {
      fleet: cellText(row[2]),
      desc: cellText(row[3]),
      pma: cellText(row[4]),
      serial: cellText(row[5]),
      pmaExp: cellText(row[6]),
      fyk: [0, 1, 2, 3].map((q) => ({ q: `Q${q + 1}`, a: cellText(row[7 + 2 * q]), n: cellText(row[8 + 2 * q]) })),
    });
  }
}

/* ---------- Monthly PM sheets ---------- */

/** The crane-id column is the one (in the first 12) that holds the most crane ids. */
function findCraneColumn(rows) {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let best = { column: -1, count: 0 };
  for (let column = 0; column < Math.min(width, 12); column += 1) {
    const count = rows.filter((row) => craneIdFromCell(row[column])).length;
    if (count > best.count) best = { column, count };
  }
  return { ...best, width };
}

/** Works out which column holds what from the one or two header rows above the first crane. */
function locatePmColumns(rows, craneColumn, firstRow, width) {
  const headerRows = [];
  for (let i = firstRow - 1; i >= 0 && headerRows.length < 2; i -= 1) {
    if (rows[i].some((c) => cellText(c) !== '')) headerRows.unshift(rows[i]);
  }
  const combined = Array.from({ length: width }, (_, col) =>
    headerRows.map((row) => headerText(row[col])).filter(Boolean).join(' '),
  );
  const lowest = headerRows.length ? headerRows[headerRows.length - 1].map(headerText) : [];
  const liveInspection = combined.findIndex((text) => text.includes('LIVE INSPECTION'));
  const limit = liveInspection < 0 ? width : liveInspection;

  const find = (test) => {
    for (let col = 0; col < limit; col += 1) if (col !== craneColumn && test(combined[col] || '', lowest[col] || '')) return col;
    return -1;
  };
  const craneStatusText = /QC\s*STATUS|CRANE STATUS/;
  const actual = [];
  const parts = [];
  for (let col = 0; col < limit; col += 1) {
    if (col === craneColumn) continue;
    if (/ACTUAL/.test(combined[col] || '')) actual.push(col);
    const part = PARTS.find((name) => (lowest[col] || '') === name || (combined[col] || '') === name);
    if (part) parts.push([col, part]);
  }
  return {
    craneStatus: find((text) => /QC\s*STATUS|CRANE STATUS|QC CONDITION/.test(text)),
    lastMaintenance: find((text) => /LAST/.test(text) && /MAINT|PM|SERVIC/.test(text)),
    pmStatus: find((text, low) => (low === 'STATUS' || /PM STATUS|^STATUS$|JOB STATUS/.test(text)) && !craneStatusText.test(text)),
    remark: find((text) => /REMARK/.test(text)),
    actual,
    parts,
  };
}

export function readPmSheet(rows, month, book) {
  const { column: craneColumn, count, width } = findCraneColumn(rows);
  if (craneColumn < 0 || count < 1) return;
  const firstRow = rows.findIndex((row) => craneIdFromCell(row[craneColumn]));
  const col = locatePmColumns(rows, craneColumn, firstRow, width);

  for (const row of rows.slice(firstRow)) {
    const id = craneIdFromCell(row[craneColumn]);
    if (!id) continue;
    const parts = {};
    for (const [index, name] of col.parts) {
      const value = cellText(row[index]);
      if (value) parts[name.charAt(0) + name.slice(1).toLowerCase()] = value;
    }
    book.crane(id).pm.push({
      m: month,
      st: cell(row, col.craneStatus),
      ls: cell(row, col.lastMaintenance),
      a: col.actual.map((index) => cellText(row[index])).filter(Boolean),
      s: cell(row, col.pmStatus),
      r: cell(row, col.remark),
      p: parts,
    });
  }
}

/* ---------- PR sheet: purchase requests and work orders ---------- */
export function readJobs(rows, book) {
  for (const row of rows.slice(2)) {
    const ids = craneIdsInText(row[1], row[2]);
    if (!ids.length) continue;
    const job = {
      d: cellText(row[0]),
      j: cellText(row[2]).slice(0, 220),
      sc: cellText(row[3]),
      wo: cellText(row[4]),
      pr: cellText(row[5]),
      v: cellText(row[6]),
      rm: moneyText(row[7]),
      st: cellText(row[8]),
      ps: cellText(row[9]),
      po: cellText(row[10]),
      grn: cellText(row[11]),
      pu: cellText(row[12]).slice(0, 200),
    };
    for (const id of ids) if (book.knows(id)) book.crane(id).pr.push(job);
  }
}

/* ---------- WIREROPE sheet ---------- */
export function readWirerope(rows, book) {
  let group = '';
  for (const row of rows.slice(2)) {
    if (cellText(row[0])) group = cellText(row[0]);
    const id = craneIdFromCell(row[2]);
    if (!id || !book.knows(id)) continue;
    let pct = cellText(row[17]);
    if (pct !== '' && !Number.isNaN(Number(pct))) pct = Number(pct).toFixed(1);
    book.crane(id).wr.push({
      mo: group.charAt(0) + group.slice(1).toLowerCase(),
      j: cellText(row[3]).slice(0, 160),
      js: cellText(row[5]),
      item: cellText(row[6]),
      wo: cellText(row[9]),
      pr: cellText(row[10]),
      cwo: cellText(row[11]),
      pd: cellText(row[12]),
      loc: cellText(row[13]).slice(0, 80),
      rec: cellText(row[14]),
      cur: cellText(row[15]),
      over: cellText(row[16]),
      pct,
      pri: cellText(row[18]).slice(0, 20),
      av: cellText(row[19]),
      note: cellText(row[20]).slice(0, 80),
    });
  }
}

/* ---------- Sheet1: SANY wirerope update, one block per rope type with its own move limit ---------- */
const SANY_TITLE = /^(MAIN HOIST|HOIST|TROLLEY|BOOM|CATENARY)\b.*WIRE ?ROPE/;

export function readSanyUpdate(rows, book) {
  let type = '';
  let limit = null;
  let header = null;
  for (const row of rows) {
    const first = headerText(row[0]);
    const title = SANY_TITLE.exec(first);
    if (title) {
      const name = title[1].replace('MAIN ', '');
      type = name.charAt(0) + name.slice(1).toLowerCase();
      limit = null;
      header = null;
      continue;
    }
    if (first === 'QC ID') {
      header = row.slice(0, 12).map(headerText);
      continue;
    }
    if (!header) {
      const moves = row.slice(0, 8).find((value) => typeof value === 'number' && value >= 1000);
      if (moves && !craneIdFromCell(row[0])) limit = moves;
      continue;
    }
    const id = craneIdFromCell(row[0]);
    if (!id || !book.knows(id)) continue;
    const currentColumn = header.indexOf('CURRENT MOVES');
    const secondColumn = header.findIndex((text) => /^2ND/.test(text));
    const entry = {
      ty: type,
      lim: limit ? String(limit) : '',
      st: cellText(row[1]),
      d: cellText(row[2]),
      mv: cellText(row[3]),
      item: cellText(row[5]),
      cur: currentColumn >= 0 ? cellText(row[currentColumn]) : '',
    };
    if (secondColumn >= 0 && (cellText(row[secondColumn]) || cellText(row[secondColumn + 1]))) {
      entry.x2 = { d: cellText(row[secondColumn]), mv: cellText(row[secondColumn + 1]), item: cellText(row[secondColumn + 3]) };
    }
    (book.crane(id).sany ||= []).push(entry);
  }
}

/* ---------- SOS coupling service ---------- */
export function readCouplings(rows, book) {
  const headerRow = rows.findIndex((row) => row.some((c) => headerText(c) === 'QC ID'));
  const header = headerRow >= 0 ? rows[headerRow].map(headerText) : [];
  const column = (name, fallback) => (headerRow >= 0 && header.indexOf(name) >= 0 ? header.indexOf(name) : fallback);
  const idColumn = headerRow >= 0 ? header.indexOf('QC ID') : 1;
  const dateColumn = column('DATE', 2);
  const statusColumn = column('STATUS', 3);
  for (const row of rows.slice(headerRow >= 0 ? headerRow + 1 : 1)) {
    const id = craneIdFromCell(row[idColumn]);
    if (id && book.knows(id)) book.crane(id).sos = { d: cellText(row[dateColumn]), s: cellText(row[statusColumn]) };
  }
}

/* ---------- Oil sampling and replacement ---------- */
export function readOil(rows, book) {
  const byCrane = new Map();
  for (const row of rows.slice(1)) {
    const id = craneIdFromCell(row[1]);
    if (!id || !book.knows(id)) continue;
    if (!byCrane.has(id)) byCrane.set(id, []);
    byCrane.get(id).push({
      d: cellText(row[0]),
      ds: cellText(row[3]).slice(0, 140),
      wo: cellText(row[4]).slice(0, 60),
      s: cellText(row[5]),
      c: cellText(row[6]),
    });
  }
  for (const [id, jobs] of byCrane) {
    book.crane(id).oil = jobs.sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, OIL_JOBS_KEPT);
  }
}

/* ---------- Work requests ---------- */

const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function clockText(cellValue) {
  if (!(cellValue instanceof Date) || Number.isNaN(cellValue.getTime())) return null;
  const t = new Date(cellValue.getTime() + 500); // round a fraction of a second up
  const hours = t.getHours();
  return `${hours % 12 || 12}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}${hours < 12 ? ' AM' : ' PM'}`;
}

/**
 * Excel turns a typed 03/04/2026 into 4 March when the day is 12 or less. The request number begins
 * with year and month ("WR2604..."), so when the date's month disagrees but its day matches, the two
 * are swapped back.
 */
function requestDate(number, value, book) {
  const text = cellText(value);
  const prefix = /^WR(\d\d)(\d\d)/i.exec(number);
  const iso = /^(\d{4})-(\d\d)-(\d\d)$/.exec(text);
  if (value instanceof Date && prefix && iso && +iso[2] !== +prefix[2] && +iso[3] === +prefix[2]) {
    book.fixes.wqDates += 1;
    return `${iso[1]}-${iso[3]}-${iso[2]}`;
  }
  const typed = DAY_MONTH_YEAR.exec(text);
  return typed ? `${typed[3]}-${pad2(typed[2])}-${pad2(typed[1])}` : text;
}

export function readWorkRequests(rows, book) {
  const headerRow = rows.findIndex(
    (row) => row.some((c) => headerText(c) === 'WORK REQUEST') && row.some((c) => /PRIORITY|CRITICAL/.test(headerText(c))),
  );
  if (headerRow < 0) return;
  const header = rows[headerRow].map(headerText);
  const find = (pattern) => header.findIndex((text) => pattern.test(text));
  const col = {
    number: find(/^WORK REQUEST$/),
    date: find(/^DATE$/),
    time: find(/^TIME$/),
    description: find(/^DESC/),
    priority: find(/PRIORITY|CRITICAL/),
    status: find(/^STATUS$/),
    code: find(/^CODE$|EQUIP/),
    type: find(/^TYPE$/),
    order: find(/WORK ORDER|^WO$/),
    orderStatus: find(/WO STATUS/),
    remark: find(/REMARK/),
  };

  for (const row of rows.slice(headerRow + 1)) {
    const number = cell(row, col.number);
    if (!number) continue;
    const codeMatch = /^Q\s*C?\s*-?\s*(\d{1,3})(?!\d)/i.exec(cell(row, col.code));
    const id = codeMatch ? `Q${pad2(codeMatch[1])}` : craneIdsInText(cell(row, col.description))[0];
    if (!id || !book.knows(id)) continue;
    book.crane(id).wq.push({
      no: number,
      d: col.date >= 0 ? requestDate(number, row[col.date], book) : '',
      tm: clockText(row[col.time]) ?? cell(row, col.time),
      ds: cell(row, col.description).slice(0, 200),
      pri: cell(row, col.priority),
      st: cell(row, col.status),
      code: cell(row, col.code),
      ty: cell(row, col.type),
      wo: cell(row, col.order),
      wos: cell(row, col.orderStatus),
      rm: cell(row, col.remark).slice(0, 200),
    });
  }
}
