/**
 * Dates in the data model are ISO text ("2026-11-05") or empty. These helpers read and show them.
 * "Days" are whole calendar days counted from today, negative in the past.
 */
import { MONTHS, MONTH_NAMES } from '../config.js';
import { now, startOfToday } from './clock.js';
import { pad2 } from './format.js';

const ISO = /^(\d{4})-(\d\d)-(\d\d)$/;

export const isIsoDate = (text) => ISO.test(text || '');

export const toIso = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
export const todayIso = () => toIso(now());

/** "2026-11-05" -> "5 Nov 2026". Text that is not a date is returned as it is. */
export function formatDate(text) {
  const m = ISO.exec(text || '');
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : String(text ?? '');
}

/** "2026-11-05" -> "5 Nov". */
export function formatDayMonth(text) {
  const m = ISO.exec(text || '');
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]}` : String(text ?? '');
}

export function daysFromToday(text) {
  const m = ISO.exec(text || '');
  if (!m) return null;
  return Math.round((new Date(+m[1], +m[2] - 1, +m[3]) - startOfToday()) / 864e5);
}

/** "12 days ago", "today", "in 3 days". Empty for text that is not a date. */
export function describeDays(text) {
  const days = daysFromToday(text);
  if (days === null) return '';
  if (days < 0) return `${-days} days ago`;
  return days === 0 ? 'today' : `in ${days} days`;
}

/** Month keys are "2026-11". */
export const monthKey = (year, month) => `${year}-${pad2(month)}`;

export function nextMonthKey(key) {
  const year = +key.slice(0, 4);
  const month = +key.slice(5) + 1;
  return month > 12 ? monthKey(year + 1, 1) : monthKey(year, month);
}

/** The last n month keys ending with this month, oldest first. */
export function lastMonthKeys(count) {
  const today = now();
  const keys = [];
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  for (let i = 0; i < count; i += 1) {
    keys.unshift(monthKey(year, month));
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

export const monthShortFromKey = (key) => MONTHS[+key.slice(5) - 1];
export const monthLongFromKey = (key) => MONTH_NAMES[monthShortFromKey(key)];
export const yearFromKey = (key) => key.slice(0, 4);
