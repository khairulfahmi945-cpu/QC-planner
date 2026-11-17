/** Insights: PMA / CF certificates and the quarterly inspection plan. */
import { PAGE_SIZE, THRESHOLDS } from '../../config.js';
import { dataYear } from '../../domain/dataset.js';
import { getAlertRows } from '../../domain/alerts.js';
import { getFleet } from '../../domain/fleet.js';
import {
  formatDayMonth, isIsoDate, lastMonthKeys, monthLongFromKey, nextMonthKey, todayIso, yearFromKey,
} from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { segmentBars, verticalBars } from '../../ui/charts.js';
import {
  caption, craneChips, insightCard, keyFigures, legend, listRows, pageHeader, sectionHeader, showMoreButton,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';
import { view } from '../../ui/viewState.js';
import { monthAxisLabel } from './common.js';

const MONTHS_BEFORE = 13;
const MONTHS_AFTER = 18;
const MAX_BARS = 40;

/** The chart runs from a year ago to 18 months ahead, but only as far as there are expiry dates. */
function expiryWindow(counts) {
  const keys = Object.keys(counts).sort();
  const thisMonth = todayIso().slice(0, 7);
  const first = lastMonthKeys(MONTHS_BEFORE)[0];
  let last = thisMonth;
  for (let i = 0; i < MONTHS_AFTER; i += 1) last = nextMonthKey(last);

  const months = [];
  if (keys.length) {
    let key = keys[0] < first ? first : keys[0];
    const end = keys[keys.length - 1] > last ? last : keys[keys.length - 1];
    for (let guard = 0; key <= end && guard < MAX_BARS; guard += 1) {
      months.push(key);
      key = nextMonthKey(key);
    }
  }
  const sum = (selected) => keys.filter(selected).reduce((total, key) => total + counts[key], 0);
  return { months, first, last, thisMonth, before: sum((k) => k < first), after: sum((k) => k > last) };
}

function expiryCard(fleet) {
  const counts = {};
  for (const crane of fleet.cranes) {
    if (isIsoDate(crane.pmaExp)) counts[crane.pmaExp.slice(0, 7)] = (counts[crane.pmaExp.slice(0, 7)] || 0) + 1;
  }
  const { months, first, last, thisMonth, before, after } = expiryWindow(counts);
  if (!months.length) return '';
  const largest = Math.max(1, ...months.map((key) => counts[key] || 0));
  const outside = [
    before && `${before} expired before ${monthLongFromKey(first)} ${yearFromKey(first)}`,
    after && `${after} expire after ${monthLongFromKey(last)} ${yearFromKey(last)}`,
  ].filter(Boolean);
  return insightCard('PMA / CF expiry by month', 'Number of cranes whose certificate expires in each month', html`
    ${verticalBars(
      months.map((key, index) => ({
        top: counts[key] || '',
        height: ((counts[key] || 0) / largest) * 100,
        tone: key < thisMonth ? 'bad' : key === thisMonth ? 'warn' : '',
        label: monthAxisLabel(key, index),
        title: `${monthLongFromKey(key)} ${yearFromKey(key)}: ${counts[key] || 0} cranes`,
      })),
      { description: 'PMA and CF expiry by month', wideLabels: true },
    )}
    ${legend([['Already passed', '', 's-bd'], ['This month', '', 's-wn'], ['Coming', '', 's-tl']])}
    ${outside.length ? caption(`${outside.join(', ')}.`) : ''}`, { wide: months.length > 12 });
}

function inspectionProgressCard(fleet, overdueCount) {
  const { count } = fleet;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
    quarter,
    done: fleet.cranes.filter((crane) => crane.fyk.some((entry) => entry.q === quarter && entry.a)).length,
  }));
  return insightCard('Quarterly inspection progress', `Cranes with an actual inspection date in each quarter of ${dataYear()}`, html`
    ${segmentBars(quarters.map(({ quarter, done }) => ({
      label: quarter,
      text: `${done} of ${count}`,
      segments: [{ value: done, tone: done === count ? 'ok' : 'normal' }],
    })), Math.max(1, count))}
    ${overdueCount ? caption(`${overdueCount} cranes are past their next inspection plan date. They are listed below.`) : ''}`);
}

function comingUpCard(fleet) {
  const soon = fleet.inspections
    .filter((entry) => entry.daysLeft !== null && entry.daysLeft >= 0 && entry.daysLeft <= THRESHOLDS.inspectionSoonDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (!soon.length) return '';
  return insightCard('Inspections planned in the next 30 days', 'Next plan date after the latest actual inspection',
    craneChips(soon.map((entry) => ({ id: entry.id, note: formatDayMonth(entry.nextPlanDate) }))));
}

function rowsSection(title, rows, tone, key) {
  if (!rows.length) return '';
  const limited = key ? rows.slice(0, view[key]) : rows;
  return html`
    ${sectionHeader(title, rows.length)}
    ${listRows(limited, () => tone)}
    ${key ? showMoreButton(key, rows.length - view[key], PAGE_SIZE.expiredCertificates.step) : ''}`;
}

export function renderInspection() {
  const fleet = getFleet();
  const { valid, due, expired, none } = fleet.certificates;
  const overdue = getAlertRows('insp');

  return html`
    ${topicNav('certificates')}
    ${pageHeader('PMA / CF and inspection', 'Certificate expiry dates and the quarterly inspection plan from the FYK INS sheet.')}
    ${keyFigures([
      [valid.length, 'Valid', 'ok'],
      [due.length, `Due within ${THRESHOLDS.pmaDueDays} days`, due.length ? 'warn' : ''],
      [expired.length, 'Expired', expired.length ? 'bad' : ''],
      [none.length, 'No expiry date', ''],
    ])}
    <div class="igrid">
      ${expiryCard(fleet)}
      ${inspectionProgressCard(fleet, overdue.length)}
      ${comingUpCard(fleet)}
    </div>
    ${rowsSection('PMA / CF expired', getAlertRows('pmaexp'), 'bad', 'exN')}
    ${rowsSection(`PMA / CF expiring within ${THRESHOLDS.pmaDueDays} days`, getAlertRows('pmadue'), 'warn', 'dueN')}
    ${rowsSection('Quarterly inspection plan date passed', overdue, 'warn')}`;
}
