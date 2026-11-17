/** Insights: PR / WO (purchase requests and work orders). */
import { PAGE_SIZE } from '../../config.js';
import { dataYear, getCrane } from '../../domain/dataset.js';
import { getFleet } from '../../domain/fleet.js';
import { isOpenJob, jobAmount } from '../../domain/purchasing.js';
import { groupVendors } from '../../domain/vendors.js';
import { formatDate, isIsoDate, monthLongFromKey, monthShortFromKey } from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatMoney, formatNumber, sentenceCase } from '../../lib/format.js';
import { horizontalBars, meter, verticalBars } from '../../ui/charts.js';
import {
  caption, emptyStateCard, insightCard, keyFigures, legend, listRow, pageHeader, sectionHeader, showMoreButton,
  subheading,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';
import { view } from '../../ui/viewState.js';

const TOP_VENDORS = 8;
const TOP_CRANES = 8;
const TOP_STATUSES = 6;
const CRANES_SHOWN_IN_ROW = 3;

const tally = (items, keyOf) => {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

function monthlyChart(jobs, year) {
  const byMonth = {};
  for (const { job, group } of jobs) {
    if (!isIsoDate(job.d) || job.d.slice(0, 4) !== year) continue;
    const key = job.d.slice(0, 7);
    byMonth[key] ||= { open: 0, closed: 0, other: 0 };
    byMonth[key][group === 'done' ? 'closed' : isOpenJob(job) ? 'open' : 'other'] += 1;
  }
  const months = Object.keys(byMonth).sort();
  if (!months.length) return '';
  const largest = Math.max(1, ...months.map((key) => byMonth[key].open + byMonth[key].closed));
  return insightCard('Jobs raised per month', `By the DATE column, ${year}`, html`
    ${verticalBars(
      months.map((key) => {
        const { open, closed } = byMonth[key];
        const total = open + closed;
        return {
          top: total,
          height: (total / largest) * 100,
          stack: { pct: total ? (open / total) * 100 : 0, tone: 'warn' },
          label: monthShortFromKey(key),
          title: `${monthLongFromKey(key)}: ${total} raised, ${open} still open`,
        };
      }),
      { description: 'PR and WO jobs raised per month' },
    )}
    ${legend([['Completed', '', 's-tl'], ['Still open', '', 's-wn']])}`);
}

const craneList = (ids) =>
  ids.slice(0, CRANES_SHOWN_IN_ROW).join(', ') + (ids.length > CRANES_SHOWN_IN_ROW ? ` +${ids.length - CRANES_SHOWN_IN_ROW}` : '');

function largestJobs(fleet) {
  const biggest = fleet.openJobs.filter((e) => jobAmount(e.job) > 0).sort((a, b) => jobAmount(b.job) - jobAmount(a.job));
  if (!biggest.length) return '';
  const { step, max } = PAGE_SIZE.largestJobs;
  return html`
    ${sectionHeader('Largest open jobs', 'by value')}
    <div class="rows">${biggest.slice(0, view.jobN).map(({ job, ids }) => listRow({
      id: ids[0],
      title: job.j || 'No description',
      detail: [ids.length > 1 ? craneList(ids) : '', job.v, formatDate(job.d), sentenceCase(job.ps || job.st), job.pr || job.wo]
        .filter(Boolean).join(' · '),
      value: formatMoney(jobAmount(job)),
    }))}</div>
    ${showMoreButton('jobN', Math.min(biggest.length, max) - view.jobN, step)}`;
}

export function renderPurchasing() {
  const fleet = getFleet();
  const { jobs, openJobs, jobCounts, jobValues } = fleet;
  if (!jobs.length) {
    return html`${topicNav('pr-wo')}${pageHeader('PR / WO', '')}${emptyStateCard('The file has no PR sheet, or it has no rows.')}`;
  }
  const year = dataYear();
  const doneValue = jobValues.done || 0;
  const noStatusValue = jobValues.none || 0;
  const totalValue = doneValue + fleet.openJobValue + noStatusValue || 1;

  const byStatus = tally(openJobs, (e) => sentenceCase(e.job.st));
  const byPrStatus = tally(openJobs, (e) => (e.job.ps ? sentenceCase(e.job.ps) : 'No PR / PO status')).slice(0, TOP_STATUSES);
  const vendors = groupVendors(jobs.filter((e) => e.group !== 'cancel').map((e) => ({ name: e.job.v, amount: jobAmount(e.job) })));
  const merged = vendors.slice(0, TOP_VENDORS).filter((vendor) => vendor.names.length > 1);
  const byYearRaised = tally(openJobs, (e) => /20\d\d/.exec(e.job.d || '')?.[0] ?? 'No date').sort((a, b) => b[0].localeCompare(a[0]));
  const perCrane = fleet.ids
    .map((id) => ({ id, count: getCrane(id).pr.filter(isOpenJob).length }))
    .filter((entry) => entry.count)
    .sort((a, b) => b.count - a.count || +a.id.slice(1) - +b.id.slice(1))
    .slice(0, TOP_CRANES);

  return html`
    ${topicNav('pr-wo')}
    ${pageHeader('PR / WO', 'Purchase requests and work orders. Open means not completed and not cancelled. A job listed against several cranes is counted once.')}
    ${keyFigures([
      [formatNumber(jobs.length), 'Jobs', ''],
      [formatNumber(openJobs.length), 'Open', 'warn'],
      [formatNumber(jobCounts.done || 0), 'Completed', 'ok'],
      [formatMoney(fleet.openJobValue), 'Open value', 'warn'],
    ])}
    <div class="igrid">
      ${insightCard('Value by status', 'Sum of the RM column', html`
        <div class="money">
          <div><b>${formatMoney(doneValue)}</b><span><i class="s-ok"></i>Completed</span></div>
          <div><b>${formatMoney(fleet.openJobValue)}</b><span><i class="s-wn"></i>Open</span></div>
          ${noStatusValue ? html`<div><b>${formatMoney(noStatusValue)}</b><span><i class="s-mu"></i>No status</span></div>` : ''}
        </div>
        ${meter([[doneValue, 'ok'], [fleet.openJobValue, 'warn'], [noStatusValue, 'muted']], totalValue)}
        ${subheading('Open jobs by job status')}
        ${horizontalBars(byStatus.map(([label, value]) => ({ label, value })), { tone: 'warn' })}
        ${subheading('Open jobs by PR / PO status')}
        ${horizontalBars(byPrStatus.map(([label, value]) => ({ label, value })), { tone: 'warn' })}
        ${jobCounts.none ? caption(`${jobCounts.none} jobs have no job status in the sheet${jobCounts.cancel ? `, and ${jobCounts.cancel} are cancelled` : ''}.`) : ''}`)}
      ${insightCard('Top vendors by value', 'All jobs in the sheet except cancelled ones', html`
        ${horizontalBars(
          vendors.slice(0, TOP_VENDORS).map((vendor) => ({ label: html`${vendor.name} <small>${vendor.jobs} jobs</small>`, value: vendor.amount })),
          { format: formatMoney },
        )}
        ${merged.length ? caption(`Different spellings counted as one vendor: ${merged.map((vendor) => vendor.names.join(' + ')).join('; ')}.`) : ''}`)}
      ${monthlyChart(jobs, year)}
      ${insightCard('Open jobs by year raised', 'How old the open backlog is', horizontalBars(
        byYearRaised.map(([label, value]) => ({ label, value, tone: label < year ? 'warn' : 'normal' })),
      ))}
      ${perCrane.length
        ? insightCard('Cranes with the most open jobs', '', horizontalBars(
            perCrane.map(({ id, count }) => ({ label: html`<b>${id}</b> ${getCrane(id).fleet}`, value: count, href: `#${id}` })),
          ))
        : ''}
    </div>
    ${largestJobs(fleet)}`;
}
