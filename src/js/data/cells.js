/** Reading single spreadsheet cells. */
import { pad2 } from '../lib/format.js';

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/**
 * A cell as trimmed text. Dates become ISO text. Excel stores a date at local midnight, so half a day
 * is added first; that keeps the day right in every time zone. Years before 2000 count as empty
 * (Excel's "0" date).
 */
export function cellText(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const d = new Date(value.getTime() + HALF_DAY_MS);
    return d.getFullYear() < 2000 ? '' : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return typeof value === 'number' ? String(value) : String(value).replace(/\s+/g, ' ').trim();
}

/** Header cells are compared in capitals with single spaces. */
export const headerText = (value) => cellText(value).toUpperCase().replace(/\s+/g, ' ').trim();

/** "Q45", "q 45", "QC-45" -> "Q45". Anything else gives null. */
export function craneIdFromCell(value) {
  const match = /^Q\s*C?\s*-?\s*(\d{1,3})$/i.exec(cellText(value));
  return match ? `Q${pad2(match[1])}` : null;
}

/** Crane ids mentioned in the first text that mentions any ("Q09 : trolley wheel" -> ["Q09"]). */
export function craneIdsInText(...texts) {
  for (const text of texts) {
    const found = [];
    for (const m of String(text || '').matchAll(/(^|[^A-Za-z0-9])Q(?:C)?\s*-?\s*(\d{1,3})(?!\d)/gi)) {
      const id = `Q${pad2(m[2])}`;
      if (!found.includes(id)) found.push(id);
    }
    if (found.length) return found;
  }
  return [];
}

/** A plain number cell becomes "MYR 1,234.00"; text is kept as it is. */
export function moneyText(value) {
  const text = cellText(value);
  if (!/^\d+(\.\d+)?$/.test(text)) return text;
  return `MYR ${Number(text).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
