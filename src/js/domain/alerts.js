/**
 * Alerts: everything that needs someone to act, grouped by reason. Rows are plain text; the page
 * decides how to show them.
 *
 * @typedef {{id: string, title: string, detail: string, tone?: 'bad' | 'warn'}} AlertRow
 * @typedef {{key: string, title: string, shortTitle: string, tone: 'bad' | 'warn', rows: AlertRow[]}} AlertSection
 */
import { THRESHOLDS, MONTH_NAMES } from '../config.js';
import { describeDays, formatDate, isIsoDate } from '../lib/dates.js';
import { formatNumber, plural, sentenceCase } from '../lib/format.js';
import { dataYear, getCrane } from './dataset.js';
import { craneStatus, downSinceMonth, lastCompletedPm, pmaDaysLeft } from './crane.js';
import { getFleet } from './fleet.js';
import { openRequests, priorityRank } from './workRequests.js';

const join = (...parts) => parts.filter(Boolean).join(' · ');

function downRows(fleet) {
  return fleet.downIds.map((id) => {
    const crane = getCrane(id);
    const since = downSinceMonth(crane);
    const lastPm = lastCompletedPm(crane);
    const open = openRequests(crane).length;
    return {
      id,
      title: craneStatus(crane) + (since ? ` since ${MONTH_NAMES[since]} ${dataYear()}` : ''),
      detail: join(
        crane.fleet,
        lastPm && `last PM done ${formatDate(lastPm)}`,
        open && plural(open, 'open work request'),
      ),
    };
  });
}

function p1Rows(fleet) {
  return fleet.openRequests
    .filter((request) => priorityRank(request) === 1)
    .sort((a, b) => String(a.d).localeCompare(String(b.d)))
    .map((request) => ({
      id: request.id,
      title: request.ds || 'No description',
      detail: join(
        request.no,
        `raised ${formatDate(request.d)}`,
        isIsoDate(request.d) && describeDays(request.d),
        request.ty,
        request.wo,
      ),
    }));
}

function ropeRows(fleet) {
  return fleet.ropesNearLimit
    .filter((rope) => rope.pct >= THRESHOLDS.ropeAlertPct)
    .map((rope) => ({
      id: rope.id,
      tone: rope.pct >= THRESHOLDS.ropeLimitPct ? 'bad' : 'warn',
      title: `${rope.type} rope at ${rope.pct.toFixed(1)}% of its move limit`,
      detail: join(
        `${formatNumber(rope.current)} of ${formatNumber(rope.limit)} moves`,
        sentenceCase(rope.note),
        rope.sany && 'SANY update sheet',
      ),
    }));
}

function certificateRows(ids, titlePrefix, daysText) {
  return ids.map((id) => {
    const crane = getCrane(id);
    return {
      id,
      title: `${titlePrefix} ${formatDate(crane.pmaExp)}`,
      detail: join(crane.fleet, daysText(pmaDaysLeft(crane)), crane.pma),
    };
  });
}

function inspectionRows(fleet) {
  return fleet.overdueInspections.map((entry) => ({
    id: entry.id,
    title: `Next inspection was planned for ${formatDate(entry.nextPlanDate)}`,
    detail: join(
      getCrane(entry.id).fleet,
      `${-entry.daysLeft} days ago`,
      `last done ${formatDate(entry.actualDate)} (${entry.quarter})`,
    ),
  }));
}

/** @returns {AlertSection[]} only the sections that have rows */
export function getAlertSections() {
  const fleet = getFleet();
  const { expired, due } = fleet.certificates;
  const sections = [
    { key: 'down', title: 'Cranes down', shortTitle: 'Down', tone: 'bad', rows: downRows(fleet) },
    { key: 'p1', title: 'Open P1 work requests', shortTitle: 'P1 requests', tone: 'bad', rows: p1Rows(fleet) },
    {
      key: 'rope',
      title: `Wirerope at ${THRESHOLDS.ropeAlertPct}% or more of its move limit`,
      shortTitle: `Rope ${THRESHOLDS.ropeAlertPct}%+`,
      tone: 'warn',
      rows: ropeRows(fleet),
    },
    {
      key: 'pmaexp',
      title: 'PMA / CF expired',
      shortTitle: 'PMA expired',
      tone: 'bad',
      rows: certificateRows(expired, 'Expired', (days) => `${-days} days ago`),
    },
    {
      key: 'pmadue',
      title: `PMA / CF expiring within ${THRESHOLDS.pmaDueDays} days`,
      shortTitle: 'PMA due',
      tone: 'warn',
      rows: certificateRows(due, 'Expires', (days) => (days === 0 ? 'today' : `in ${days} days`)),
    },
    {
      key: 'insp',
      title: 'Quarterly inspection plan date passed',
      shortTitle: 'Inspection',
      tone: 'warn',
      rows: inspectionRows(fleet),
    },
  ];
  return sections.filter((section) => section.rows.length);
}

const summaries = new WeakMap();

/** Sections plus how many cranes have an alert, and how many of those have a red one. */
export function getAlertSummary() {
  const fleet = getFleet();
  if (!summaries.has(fleet)) {
    const sections = getAlertSections();
    const all = new Set();
    const red = new Set();
    for (const section of sections) {
      for (const row of section.rows) {
        all.add(row.id);
        if ((row.tone || section.tone) === 'bad') red.add(row.id);
      }
    }
    summaries.set(fleet, { sections, craneCount: all.size, redCount: red.size });
  }
  return summaries.get(fleet);
}

/** The rows of one alert section, or an empty list when it has none. */
export const getAlertRows = (key) => getAlertSummary().sections.find((s) => s.key === key)?.rows ?? [];
