/** Number and text formatting. Pure functions, no DOM. */

export const pad2 = (n) => String(Math.trunc(+n)).padStart(2, '0');

/** Reads "1,234" or "-5.5" as a number. Anything else gives null. */
export function parseNumber(value) {
  const text = String(value ?? '').trim();
  return /^-?[\d,]+(\.\d+)?$/.test(text) ? parseFloat(text.replace(/,/g, '')) : null;
}

export const formatNumber = (n) => Number(n).toLocaleString('en-US');

/** 12900000 -> "12.9M", 4300 -> "4k", 950 -> "950". */
export function compactNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(Math.round(n));
}

export const formatMoney = (n) => `MYR ${compactNumber(n)}`;

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const KEEP_UPPER = /\b(po|pr|wo|wr|grn|pm|qc|ohc|mcs|scr|mcr|tls|sos|sany|hpu)\b/g;

/** "WAITING PO" -> "Waiting PO". Sheet values come in capitals; common abbreviations stay that way. */
export function sentenceCase(text) {
  const lower = String(text ?? '').toLowerCase().replace(KEEP_UPPER, (m) => m.toUpperCase());
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Shortens text to a length, adding an ellipsis. */
export const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Percent of a total, rounded, safe for a total of zero. */
export const percentOf = (part, total) => Math.round((part / Math.max(1, total)) * 100);
