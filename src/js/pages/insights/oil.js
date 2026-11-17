/** Insights: oil sampling and replacement jobs, and the SOS coupling service. */
import { PAGE_SIZE } from '../../config.js';
import { getCrane } from '../../domain/dataset.js';
import { getFleet } from '../../domain/fleet.js';
import { oilDate, oilParts } from '../../domain/oil.js';
import {
  daysFromToday, describeDays, formatDate, lastMonthKeys, monthLongFromKey, todayIso, yearFromKey,
} from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatNumber, sentenceCase, truncate } from '../../lib/format.js';
import { horizontalBars, segmentBars, verticalBars } from '../../ui/charts.js';
import {
  craneChips, emptyStateCard, insightCard, keyFigures, legend, listRow, pageHeader, sectionHeader,
  showMoreButton, subheading,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';
import { view } from '../../ui/viewState.js';
import { monthAxisLabel } from './common.js';

const MONTHS_SHOWN = 12;
const TOP_COMPONENTS = 8;
const LONGEST_SHOWN = 8;
const STATUS_NOTE_MAX = 20;

/** Jobs per month (sampling only, or with oil replaced) and per component. */
function tallyJobs(jobs, months) {
  const byMonth = Object.fromEntries(months.map((key) => [key, { sampled: 0, replaced: 0 }]));
  const byComponent = {};
  const add = (name, kind) => {
    byComponent[name] ||= { sampled: 0, replaced: 0 };
    byComponent[name][kind] += 1;
  };
  for (const job of jobs) {
    const bucket = byMonth[job.date.slice(0, 7)];
    if (!bucket) continue;
    const parts = oilParts(job.ds);
    bucket[parts.replaced.length ? 'replaced' : 'sampled'] += 1;
    parts.sampled.forEach((name) => add(name, 'sampled'));
    parts.replaced.forEach((name) => add(name, 'replaced'));
  }
  return { byMonth, byComponent };
}

function longestSinceLastJob(fleet) {
  return fleet.ids
    .map((id) => {
      const dates = getCrane(id).oil.map(oilDate).filter((date) => date && date <= todayIso()).sort();
      return { id, date: dates.length ? dates[dates.length - 1] : '' };
    })
    .filter((entry) => entry.date)
    .map((entry) => ({ ...entry, days: -daysFromToday(entry.date) }))
    .sort((a, b) => b.days - a.days);
}

const couplingTone = (status) => (/due|down/i.test(status) ? 'warn' : /complete|done/i.test(status) ? 'ok' : 'normal');

function couplingCard(couplings) {
  if (!couplings.length) return '';
  const counts = {};
  for (const coupling of couplings) {
    const label = coupling.s ? sentenceCase(coupling.s) : 'No status';
    counts[label] = (counts[label] || 0) + 1;
  }
  const open = couplings.filter((c) => c.s && !/complete|done/i.test(c.s));
  return insightCard('SOS coupling service', `Status from the SOS coupling sheet, ${couplings.length} cranes`, html`
    ${horizontalBars(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, tone: couplingTone(label) })))}
    ${open.length ? html`
      ${subheading('Not completed')}
      ${craneChips(open.map((c) => ({ id: c.id, title: c.s, note: truncate(sentenceCase(c.s), STATUS_NOTE_MAX) })))}` : ''}`);
}

function latestJobs(done) {
  if (!done.length) return '';
  const { step, max } = PAGE_SIZE.oilJobs;
  const sorted = [...done].sort((a, b) => b.date.localeCompare(a.date));
  return html`
    ${sectionHeader('Latest oil jobs', 'newest first')}
    <div class="rows">${sorted.slice(0, view.olN).map((job) => {
      const parts = oilParts(job.ds);
      const title = [
        parts.sampled.length && `Sampling: ${parts.sampled.join(', ')}`,
        parts.replaced.length && `Oil replaced: ${parts.replaced.join(', ')}`,
      ].filter(Boolean).join(' · ');
      return listRow({
        id: job.id,
        title: title || job.ds,
        detail: [formatDate(job.date), describeDays(job.date), job.s, job.wo].filter(Boolean).join(' · '),
      });
    })}</div>
    ${showMoreButton('olN', Math.min(sorted.length, max) - view.olN, step)}`;
}

export function renderOil() {
  const fleet = getFleet();
  const completed = fleet.oilJobs.filter((job) => job.date && job.date <= todayIso());
  if (!completed.length && !fleet.couplings.length) {
    return html`${topicNav('oil')}${pageHeader('Oil and coupling', '')}${emptyStateCard('The file has no OIL SAMPLING sheet, or it has no rows.')}`;
  }
  const months = lastMonthKeys(MONTHS_SHOWN);
  const { byMonth, byComponent } = tallyJobs(completed, months);
  const total = months.reduce((n, key) => n + byMonth[key].sampled + byMonth[key].replaced, 0);
  const replacedTotal = months.reduce((n, key) => n + byMonth[key].replaced, 0);
  const largestMonth = Math.max(1, ...months.map((key) => byMonth[key].sampled + byMonth[key].replaced));
  const components = Object.entries(byComponent)
    .map(([name, tally]) => ({ name, ...tally }))
    .sort((a, b) => b.sampled + b.replaced - (a.sampled + a.replaced))
    .slice(0, TOP_COMPONENTS);
  const largestComponent = Math.max(1, ...components.map((c) => c.sampled + c.replaced));
  const longest = longestSinceLastJob(fleet);
  const due = fleet.couplings.filter((c) => /due/i.test(c.s)).length;

  return html`
    ${topicNav('oil')}
    ${pageHeader('Oil and coupling', 'Oil sampling and oil replacement jobs, and the SOS coupling service list.')}
    ${keyFigures([
      [formatNumber(total), 'Oil jobs in 12 months', ''],
      [formatNumber(replacedTotal), 'With oil replaced', 'warn'],
      [longest.length ? `${longest[0].days} d` : '–', 'Longest since last job', ''],
      [due, 'Couplings due', 'warn'],
    ])}
    <div class="igrid">
      ${insightCard('Oil jobs per month', 'Last 12 months, by completed date', html`
        ${verticalBars(
          months.map((key, index) => {
            const { sampled, replaced } = byMonth[key];
            const count = sampled + replaced;
            return {
              top: count || '',
              height: (count / largestMonth) * 100,
              stack: { pct: count ? (replaced / count) * 100 : 0, tone: 'warn' },
              label: monthAxisLabel(key, index),
              title: `${monthLongFromKey(key)} ${yearFromKey(key)}: ${count} jobs, ${replaced} with oil replaced`,
            };
          }),
          { description: 'Oil jobs per month', wideLabels: true },
        )}
        ${legend([['Sampling only', '', 's-tl'], ['Oil replaced', '', 's-wn']])}`)}
      ${components.length
        ? insightCard('By component', 'Last 12 months. One job can cover several components.', html`
            ${segmentBars(components.map((c) => ({
              label: c.name,
              text: `${c.sampled} sampled · ${c.replaced} replaced`,
              segments: [{ value: c.sampled, tone: 'normal' }, { value: c.replaced, tone: 'warn' }],
            })), largestComponent)}
            ${legend([['Sampled', '', 's-tl'], ['Oil replaced', '', 's-wn']])}`)
        : ''}
      ${longest.length
        ? insightCard('Longest since the last oil job', 'Days since the latest completed oil job on each crane', horizontalBars(
            longest.slice(0, LONGEST_SHOWN).map(({ id, date, days }) => ({ label: html`<b>${id}</b> ${formatDate(date)}`, value: days, href: `#${id}` })),
            { format: (days) => `${days} days` },
          ))
        : ''}
      ${couplingCard(fleet.couplings)}
    </div>
    ${latestJobs(completed)}`;
}
