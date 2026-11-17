/**
 * Turns the LIVE UPDATE workbook into a Dataset (see domain/dataset.js).
 * SheetJS is passed in so this runs in the browser and in Node tests alike.
 */
import { DATA_VERSION } from '../config.js';
import { now } from '../lib/clock.js';
import { todayIso } from '../lib/dates.js';
import {
  Book, readCouplings, readCranes, readJobs, readOil, readPmSheet, readSanyUpdate, readWirerope, readWorkRequests,
} from './readers.js';
import { findSheets, monthKeyOfSheet } from './sheets.js';

/**
 * @param {object} XLSX the SheetJS library
 * @param {ArrayBuffer|Uint8Array} buffer the file contents
 * @param {string} fileName shown on the Data page
 * @returns {import('../domain/dataset.js').Dataset}
 */
export function parseWorkbook(XLSX, buffer, fileName) {
  const names = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames;
  const sheet = findSheets(names);
  if (!sheet.fyk || !sheet.pm.length) throw new Error('FYK INS or the monthly sheets are missing.');

  const wanted = [...sheet.pm, sheet.fyk, sheet.pr, sheet.wr, sheet.sany, sheet.sos, sheet.oil, sheet.wq].filter(Boolean);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, sheets: wanted });
  const rowsOf = (name) =>
    name && workbook.Sheets[name] ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' }) : [];

  const book = new Book();
  readCranes(rowsOf(sheet.fyk), book);
  for (const name of sheet.pm) readPmSheet(rowsOf(name), monthKeyOfSheet(name), book);
  readJobs(rowsOf(sheet.pr), book);
  readWirerope(rowsOf(sheet.wr), book);
  readSanyUpdate(rowsOf(sheet.sany), book);
  readCouplings(rowsOf(sheet.sos), book);
  readOil(rowsOf(sheet.oil), book);
  readWorkRequests(rowsOf(sheet.wq), book);

  return {
    v: DATA_VERSION,
    built: todayIso(),
    at: now().getTime(),
    src: fileName,
    year: sheet.year,
    fix: book.fixes,
    sheets: { fyk: sheet.fyk, pm: sheet.pm, pr: sheet.pr, wr: sheet.wr, sany: sheet.sany, sos: sheet.sos, oil: sheet.oil, wq: sheet.wq },
    qcs: book.toRecord(),
  };
}
