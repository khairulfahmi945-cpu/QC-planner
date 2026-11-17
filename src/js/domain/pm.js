/** Fleet-wide PM figures. */
import { MONTHS } from '../config.js';
import { now } from '../lib/clock.js';
import { pmState } from './crane.js';

/**
 * The month the dashboard treats as "now". When the data is for this calendar year it is the latest
 * month in the sheets that is not in the future; for another year it is the last month in the sheets.
 * Returns null when no monthly sheet was read.
 */
export function currentPmMonth(cranes, year, today = now()) {
  const present = new Set();
  for (const crane of cranes) for (const record of crane.pm) present.add(MONTHS.indexOf(record.m));
  const months = [...present].filter((index) => index >= 0).sort((a, b) => a - b);
  if (!months.length) return null;
  if (+year === today.getFullYear()) {
    const reached = months.filter((index) => index <= today.getMonth());
    return MONTHS[reached.length ? reached[reached.length - 1] : months[0]];
  }
  return MONTHS[months[months.length - 1]];
}

/** For each month with records: how many cranes have one and how many completed their PM. */
export function completionByMonth(cranes) {
  return MONTHS.map((month) => {
    const records = cranes.map((crane) => crane.pm.find((r) => r.m === month)).filter(Boolean);
    return { month, total: records.length, done: records.filter((r) => pmState(r) === 'done').length };
  }).filter((entry) => entry.total);
}

/** How many months in a row, counting back from the one before the current month, were 100% done. */
export function completeStreak(byMonth, currentMonth) {
  const current = MONTHS.indexOf(currentMonth);
  let streak = 0;
  for (let i = byMonth.length - 1; i >= 0; i -= 1) {
    const { month, total, done } = byMonth[i];
    if (month === currentMonth || MONTHS.indexOf(month) > current) continue;
    if (done !== total) break;
    streak += 1;
  }
  return streak;
}
