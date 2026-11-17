/** Insights: work requests. */
import { MONTH_NAMES, PAGE_SIZE } from '../../config.js';
import { monthAxisLabel } from './common.js';
import { getCrane } from '../../domain/dataset.js';
import { getFleet } from '../../domain/fleet.js';
import {
  isOpenRequest, priorityRank, priorityTone, topPriority,
} from '../../domain/workRequests.js';
import {
  daysFromToday, describeDays, formatDate, isIsoDate, monthLongFromKey, monthShortFromKey, yearFromKey,
} from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatNumber } from '../../lib/format.js';
import { horizontalBars, meter, verticalBars } from '../../ui/charts.js';
import {
  caption, chip, choiceGroup, emptyNote, emptyStateCard, insightCard, keyFigures, legend, listRow,
  pageHeader, sectionHeader, showMoreButton, subheading,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';
import { view } from '../../ui/viewState.js';

const MONTHS_SHOWN = 14;
const TOP_CRANES = 8;
const AGE_BANDS = [
  ['30 days or less', 0, 30],
  ['31 to 90 days', 31, 90],
  ['91 to 180 days', 91, 180],
  ['181 to 365 days', 181, 365],
  ['More than a year', 366, Infinity],
];

/** Requests raised per month, split into still open and closed. */
function raisedPerMonth(requests) {
  const byMonth = {};
  for (const request of requests) {
    if (!isIsoDate(request.d)) continue;
    const key = request.d.slice(0, 7);
    byMonth[key] ||= { open: 0, closed: 0 };
    byMonth[key][isOpenRequest(request) ? 'open' : 'closed'] += 1;
  }
  return byMonth;
}

const countBy = (items, keyOf) => {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] || 0) + 1;
  return counts;
};

const byCountDescending = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);

function ageBands(open) {
  const ages = open.filter((r) => isIsoDate(r.d)).map((r) => Math.max(0, -daysFromToday(r.d)));
  return AGE_BANDS.map(([label, from, to], index) => ({
    label,
    value: ages.filter((age) => age >= from && age <= to).length,
    tone: index > 2 ? 'bad' : index > 0 ? 'warn' : 'normal',
  }));
}

function monthlyChart(byMonth) {
  const months = Object.keys(byMonth).sort().slice(-MONTHS_SHOWN);
  const largest = Math.max(1, ...months.map((key) => byMonth[key].open + byMonth[key].closed));
  const chart = verticalBars(
    months.map((key, index) => {
      const { open, closed } = byMonth[key];
      return {
        top: open + closed,
        height: ((open + closed) / largest) * 100,
        stack: { pct: (open / (open + closed)) * 100, tone: 'warn' },
        label: monthAxisLabel(key, index),
        title: `${monthLongFromKey(key)} ${yearFromKey(key)}: ${open + closed} raised, ${open} still open`,
      };
    }),
    { description: 'Work requests raised per month', wideLabels: true },
  );
  return { months, chart };
}

function openList(fleet) {
  const open = fleet.openRequests
    .filter((r) => view.wqf === 'all' || priorityRank(r) === +view.wqf)
    .sort((a, b) => priorityRank(a) - priorityRank(b) || String(a.d).localeCompare(String(b.d)));
  const filters = choiceGroup('Filter by criticality', [
    ['all', 'All', fleet.openRequests.length],
    ['1', 'P1', fleet.requestsByRank[0]],
    ['2', 'P2', fleet.requestsByRank[1]],
    ['3', 'P3', fleet.requestsByRank[2]],
  ].map(([value, label, count]) => ({ key: 'wqf', value, label, count, pressed: view.wqf === value })));

  const shown = open.slice(0, view.wqN);
  const rows = shown.map((request) => {
    const rank = priorityRank(request);
    return listRow({
      id: request.id,
      title: request.ds || 'No description',
      detail: [request.no, `raised ${formatDate(request.d)}`, isIsoDate(request.d) && describeDays(request.d), request.ty, request.wo, request.rm]
        .filter(Boolean).join(' · '),
      value: rank < 9 ? chip(`P${rank}`, priorityTone(rank)) : '',
      tone: rank === 1 ? 'bad' : '',
    });
  });
  return html`
    ${sectionHeader('Open work requests', open.length)}
    ${filters}
    ${open.length
      ? html`<div class="rows">${rows}</div>${showMoreButton('wqN', open.length - view.wqN, PAGE_SIZE.workRequests.step)}`
      : emptyNote('No open requests at this criticality.')}`;
}

export function renderWorkRequests() {
  const fleet = getFleet();
  const all = fleet.requests;
  const open = fleet.openRequests;
  if (!all.length) {
    return html`${topicNav('work-requests')}${pageHeader('Work requests', '')}${emptyStateCard('The file has no WORK REQUEST sheet, or it has no rows.')}`;
  }
  const [p1, p2, p3, unranked] = fleet.requestsByRank;
  const { months, chart } = monthlyChart(raisedPerMonth(all));
  const types = countBy(open, (r) => r.ty || 'No type');
  const perCrane = Object.entries(countBy(open, (r) => r.id))
    .sort((a, b) => b[1] - a[1] || +a[0].slice(1) - +b[0].slice(1))
    .slice(0, TOP_CRANES);
  const oldest = open.filter((r) => isIsoDate(r.d)).sort((a, b) => a.d.localeCompare(b.d))[0];

  return html`
    ${topicNav('work-requests')}
    ${pageHeader('Work requests', 'CBM and live inspection requests. Criticality comes from the Priority column.')}
    ${keyFigures([
      [formatNumber(all.length), 'Total', ''],
      [formatNumber(open.length), 'Open', 'warn'],
      [formatNumber(all.length - open.length), 'Closed', 'ok'],
      [p1, 'Open at P1', p1 ? 'bad' : ''],
    ])}
    <div class="igrid">
      ${insightCard('Raised per month', months.length ? `From ${MONTH_NAMES[monthShortFromKey(months[0])]} ${yearFromKey(months[0])}` : '', html`
        ${chart}${legend([['Closed', '', 's-tl'], ['Still open', '', 's-wn']])}`)}
      ${insightCard('Open requests', 'By criticality, type and age', html`
        <div class="rt"><span>Criticality</span><b>${open.length} open</b></div>
        ${meter([[p1, 'bad'], [p2, 'warn'], [p3 + unranked, 'ok']], open.length)}
        ${legend([['P1', p1, 's-bd'], ['P2', p2, 's-wn'], ['P3', p3, 's-ok'], ...(unranked ? [['No priority', unranked, 's-mu']] : [])])}
        ${subheading('Type')}
        ${horizontalBars(byCountDescending(types).map(([label, value]) => ({ label, value })))}
        ${subheading('Age of open requests')}
        ${horizontalBars(ageBands(open))}
        ${oldest ? caption(`Oldest open request: ${oldest.no} on ${oldest.id}, raised ${formatDate(oldest.d)}.`) : ''}`)}
      ${insightCard('Cranes with the most open requests', '', html`
        ${horizontalBars(perCrane.map(([id, value]) => ({
          label: html`<b>${id}</b> ${getCrane(id).fleet}`,
          value,
          href: `#${id}`,
          tone: topPriority(getCrane(id)) === 1 ? 'bad' : 'normal',
        })))}
        ${caption('Red bars have an open P1 request.')}`)}
    </div>
    ${openList(fleet)}`;
}
