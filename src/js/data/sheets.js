/** Finding the sheets that matter in the workbook, whatever the year or spelling in their names. */
import { MONTHS } from '../config.js';
import { now } from '../lib/clock.js';

const MONTH_SHEET =
  /^(PM\s+)?(JANUARI|JANUARY|JAN|FEBRUARY|FEB|MARCH|MAR|APRIL|APR|MAY|JUNE|JUN|JULY|JUL|AUGUST|AUG|SEPTEMBER|SEPT|SEP|OCTOBER|OCT|NOVEMBER|NOV|DECEMBER|DEC)(?:\s*'?\s*(20\d\d|\d\d))?\s*$/i;

const upper = (name) => name.trim().toUpperCase();

/** 0 to 11 for a monthly sheet name ("NOVEMBER 2026 ", "PM NOV"), -1 when it is not one. */
export const monthIndexOfSheet = (name) =>
  MONTHS.findIndex((m) => m.toUpperCase() === name.trim().replace(/^PM\s+/i, '').slice(0, 3).toUpperCase());

function yearOfSheet(name) {
  const match = MONTH_SHEET.exec(name.trim());
  if (!match?.[3]) return 0;
  return +match[3] < 100 ? 2000 + +match[3] : +match[3];
}

/**
 * @param {string[]} names all sheet names in the workbook
 * @returns {{fyk: string, pm: string[], pr: string, wr: string, sany: string, sos: string,
 *   oil: string, wq: string, year: number}} sheet names (undefined when a sheet is missing);
 *   pm is in month order. Sheets with a year in their name use the newest year.
 */
export function findSheets(names) {
  const startsWith = (prefix) => names.find((name) => upper(name).startsWith(prefix));
  const newestWithYear = (pattern) => {
    let best = { name: undefined, year: -1 };
    for (const name of names) {
      const match = pattern.exec(upper(name));
      if (match && +match[1] > best.year) best = { name, year: +match[1] };
    }
    return best;
  };

  const pr = newestWithYear(/^PR\s*(20\d\d)\b/);
  const wirerope = newestWithYear(/^WIREROPE\s*(20\d\d)\b/);

  const monthly = names.filter((name) => MONTH_SHEET.test(name.trim()));
  const year = Math.max(0, ...monthly.map(yearOfSheet)) || (pr.year > 0 ? pr.year : 0) || now().getFullYear();

  // One sheet per month; a sheet that names the year wins over one that does not.
  const byMonth = {};
  for (const name of monthly) {
    const sheetYear = yearOfSheet(name);
    const index = monthIndexOfSheet(name);
    if (index < 0 || (sheetYear && sheetYear !== year)) continue;
    if (!byMonth[index] || (sheetYear && !yearOfSheet(byMonth[index]))) byMonth[index] = name;
  }

  return {
    year,
    pm: Object.keys(byMonth).map(Number).sort((a, b) => a - b).map((index) => byMonth[index]),
    fyk: startsWith('FYK INS'),
    pr: pr.name || startsWith('PR 20'),
    wr: wirerope.name || startsWith('WIREROPE 20'),
    sany: startsWith('SHEET1'),
    sos: names.find((name) => /^SOS COUPLING SERV/i.test(name.trim())) || startsWith('SOS COUPLING'),
    oil: startsWith('OIL SAMPLING'),
    wq: startsWith('WORK REQUEST'),
  };
}

export const monthKeyOfSheet = (name) => MONTHS[monthIndexOfSheet(name)];
