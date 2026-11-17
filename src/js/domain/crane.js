/** Rules about one crane. Every function takes plain data and gives plain data. */
import { THRESHOLDS } from '../config.js';
import { daysFromToday, isIsoDate, todayIso } from '../lib/dates.js';

const DOWN_STATUS = /down|breakdown|\bbd\b|not avail|out of service|oos/i;
const PM_DONE = /complete|done/i;
const PM_PLANNED = /plan|progress|partial|sched/i;

/** The newest monthly PM record that says anything. */
export const latestPmRecord = (crane) =>
  [...crane.pm].reverse().find((record) => record.st || record.s || record.a.length);

export const craneStatus = (crane) => latestPmRecord(crane)?.st ?? '';
export const isDown = (crane) => DOWN_STATUS.test(craneStatus(crane));
export const isOperating = (crane) => /^ops$/i.test(craneStatus(crane));

/* ---------- PM ---------- */

/** 'done' | 'plan' | 'pend' for a monthly record, 'none' when there is no record. */
export function pmState(record) {
  if (!record) return 'none';
  if (PM_DONE.test(record.s)) return 'done';
  return PM_PLANNED.test(record.s) ? 'plan' : 'pend';
}

/** Like pmState, but a month with no completed PM on a crane that is down shows as 'down'. */
export function monthCellState(record) {
  const state = pmState(record);
  if (state === 'done') return 'done';
  return /down/i.test(record?.st || '') ? 'down' : state;
}

export const PM_STATE_LABEL = {
  done: 'PM done', plan: 'In plan', pend: 'Not done', none: 'No record', down: 'Crane down',
};

export const pmRecordIn = (crane, month) => crane.pm.find((record) => record.m === month);
export const pmStateIn = (crane, month) => pmState(pmRecordIn(crane, month));

/** The most recent PM date marked completed, up to today. "" when there is none. */
export function lastCompletedPm(crane) {
  const today = todayIso();
  let best = '';
  for (const record of crane.pm) {
    if (pmState(record) !== 'done') continue;
    for (const date of record.a) if (isIsoDate(date) && date <= today && date > best) best = date;
  }
  return best;
}

/** The month the crane's current "down" run began, or null when it is not down. */
export function downSinceMonth(crane) {
  let since = null;
  let started = false;
  for (let i = crane.pm.length - 1; i >= 0; i -= 1) {
    const record = crane.pm[i];
    if (!started && !(record.st || record.s || record.a.length)) continue;
    started = true;
    if (!/down/i.test(record.st)) break;
    since = record.m;
  }
  return since;
}

/* ---------- PMA / CF certificate ---------- */

export const pmaDaysLeft = (crane) => daysFromToday(crane.pmaExp);

/** 'expired' | 'due' | 'valid' | 'none' (no expiry date). */
export function pmaStatus(crane) {
  const days = pmaDaysLeft(crane);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  return days <= THRESHOLDS.pmaDueDays ? 'due' : 'valid';
}

/* ---------- Quarterly inspection ---------- */

/** The newest quarter with an actual date, and when the next inspection is planned. */
export function nextInspection(crane) {
  const last = [...crane.fyk].reverse().find((quarter) => quarter.a);
  if (!last) return null;
  return {
    quarter: last.q,
    actualDate: last.a,
    nextPlanDate: last.n,
    daysLeft: daysFromToday(last.n),
  };
}
