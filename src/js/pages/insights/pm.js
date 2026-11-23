/** Insights: preventive maintenance. */
import { MONTHS, MONTH_NAMES } from '../../config.js';
import { dataYear, getCrane } from '../../domain/dataset.js';
import { isDown, lastCompletedPm, monthCellState, PM_STATE_LABEL, pmRecordIn } from '../../domain/crane.js';
import { getFleet } from '../../domain/fleet.js';
import { daysFromToday, formatDate, formatDayMonth, isIsoDate } from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { percentOf } from '../../lib/format.js';
import { horizontalBars, verticalBars } from '../../ui/charts.js';
import {
  caption, craneChips, insightCard, keyFigures, legend, pageHeader,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';

const NO_NOTE = () => '';

/** The PM date(s) a crane has in the current month. */
const datesIn = (id, month) => pmRecordIn(getCrane(id), month)?.a.filter(isIsoDate) ?? [];

function monthGroup(label, ids, tone, noteOf = NO_NOTE) {
  if (!ids.length) return '';
  const items = ids.map((id) => {
    const note = noteOf(id);
    const down = isDown(getCrane(id));
    return { id, note: note && formatDayMonth(note), down, title: down ? 'Crane down' : '' };
  });
  return html`
    <div class="pg">
      <div class="rt"><span><i class="dot s-${tone}"></i>${label}</span><b>${ids.length}</b></div>
      ${craneChips(items)}
    </div>`;
}

/** One row per crane, one small block per month. */
function statusGrid(fleet) {
  return html`<div class="mx">${Object.entries(fleet.fleets).map(([name, ids]) => html`
    <div class="mxg">
      <h4>${name} <small>${ids.length}</small></h4>
      <div class="mxh"><span></span>${MONTHS.map((month) => html`<span>${month.charAt(0)}</span>`)}</div>
      ${ids.map((id) => html`
        <a class="mxr" href="#${id}"><b>${id}</b>${MONTHS.map((month) => {
          const record = pmRecordIn(getCrane(id), month);
          const state = monthCellState(record);
          const dates = record ? record.a.filter(isIsoDate).map(formatDate).join(', ') : '';
          const title = `${id} · ${MONTH_NAMES[month]}: ${PM_STATE_LABEL[state]}${dates ? ` (${dates})` : ''}`;
          return html`<i class="t-${state}" title="${title}"></i>`;
        })}</a>`)}
    </div>`)}</div>`;
}

const GRID_LEGEND = [
  ['PM done', '', 's-ok'], ['In plan', '', 's-wn'], ['Not done', '', 's-pd'], ['Crane down', '', 's-bd'], ['No record', '', 's-no'],
];

function longestSinceLastPm(fleet) {
  return fleet.ids
    .map((id) => ({ id, date: lastCompletedPm(getCrane(id)) }))
    .filter((entry) => entry.date)
    .map((entry) => ({ ...entry, days: -daysFromToday(entry.date) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);
}

/** The last item of a list, or undefined. */
const lastOf = (list) => list[list.length - 1];

export function renderPm() {
  const fleet = getFleet();
  const { month, count } = fleet;
  const monthName = month ? MONTH_NAMES[month] : 'This month';
  const year = dataYear();
  const done = fleet.pm.done.length;
  const planned = fleet.pm.plan.length;
  const notStarted = count - done - planned;
  const since = longestSinceLastPm(fleet);

  const completion = verticalBars(
    fleet.pmByMonth.map(({ month: m, total, done: d }) => {
      const pct = percentOf(d, total);
      return { top: pct, height: pct, label: m, current: m === month, title: `${MONTH_NAMES[m]}: ${d} of ${total} cranes` };
    }),
    { description: 'PM completion by month' },
  );

  return html`
    ${topicNav('pm')}
    ${pageHeader(`Preventive maintenance ${year}`, month ? `${monthName} is the current month in the file.` : '')}
    ${keyFigures([
      [done, `Done in ${monthName}`, 'ok'],
      [planned, 'In plan', 'warn'],
      [notStarted, 'Not started', ''],
      [`${percentOf(done, count)}%`, 'Complete this month', ''],
    ])}
    <div class="igrid">
      ${insightCard('PM completion by month', `Share of cranes with PM completed, ${year}`, html`
        ${completion}
        ${caption(`${month ? `${monthName} is still in progress. ` : ''}${fleet.completeStreak > 1 ? `The ${fleet.completeStreak} months before it finished at 100%.` : ''}`)}`)}
      ${since.length
        ? insightCard('Longest since the last completed PM', 'Days since the latest PM date marked completed', html`
            ${horizontalBars(
              since.map(({ id, date, days }) => ({
                label: html`<b>${id}</b> ${formatDate(date)}`,
                value: days,
                href: `#${id}`,
                tone: isDown(getCrane(id)) ? 'bad' : 'normal',
              })),
              { format: (days) => `${days} days` },
            )}
            ${caption('Red bars are cranes that are down.')}`)
        : ''}
      ${insightCard(`${monthName} by crane`, 'Tap a crane to open it. The small date is the PM date in the file.', html`
        ${monthGroup('Not started', [...fleet.pm.pend, ...fleet.pm.none], 'mu')}
        ${monthGroup('In plan', fleet.pm.plan, 'wn', (id) => datesIn(id, month)[0] || '')}
        ${monthGroup('Done', fleet.pm.done, 'ok', (id) => lastOf(datesIn(id, month)) || '')}`, { wide: true })}
      ${insightCard('PM status for every crane', `One row per crane, one block per month of ${year}. Tap a row to open the crane.`, html`
        ${legend(GRID_LEGEND)}
        ${statusGrid(fleet)}`, { wide: true })}
    </div>`;
}
