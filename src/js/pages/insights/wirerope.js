/** Insights: wirerope replacement jobs and the SANY update sheet. */
import { MONTHS, MONTH_NAMES, PAGE_SIZE, THRESHOLDS } from '../../config.js';
import { dataYear, getCrane } from '../../domain/dataset.js';
import { getFleet } from '../../domain/fleet.js';
import { ROPE_TYPES, ropeLifeUsed, ropeTone } from '../../domain/wirerope.js';
import { now } from '../../lib/clock.js';
import { formatDate } from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatNumber, parseNumber, sentenceCase } from '../../lib/format.js';
import {
  barWithText, horizontalBars, meter, progressBar, segmentBars,
} from '../../ui/charts.js';
import {
  caption, chip, craneLink, emptyStateCard, insightCard, keyFigures, legend, pageHeader, sectionHeader,
  showMoreButton, subheading,
} from '../../ui/components.js';
import { responsiveTable } from '../../ui/table.js';
import { topicNav } from '../../ui/topics.js';
import { view } from '../../ui/viewState.js';

const NEAR_LIMIT_SHOWN = 10;
const FURTHEST_OVER_SHOWN = 6;
const RED_GROUPS = /broken|premature|acc/i;

/** Plan groups are named "November", "January 2027", "Additional hoist" and so on. */
const MONTH_GROUP = new RegExp(`^(${MONTHS.map((m) => MONTH_NAMES[m]).join('|')})\\b(?:\\s+(\\d{4}))?`, 'i');

function monthOfGroup(name, defaultYear) {
  const match = MONTH_GROUP.exec(name || '');
  if (!match) return null;
  const month = MONTHS.findIndex((m) => MONTH_NAMES[m].toLowerCase() === match[1].toLowerCase());
  return { year: match[2] ? +match[2] : defaultYear, month };
}

function groupHasPassed(name, defaultYear) {
  const group = monthOfGroup(name, defaultYear);
  const today = now();
  return Boolean(group) && (group.year < today.getFullYear() || (group.year === today.getFullYear() && group.month < today.getMonth()));
}

function pendingByGroup(pending, year) {
  const counts = new Map();
  for (const job of pending) counts.set(job.mo || 'No group', (counts.get(job.mo || 'No group') || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, when: monthOfGroup(name, year) }))
    .sort((a, b) => (a.when ? 0 : 1) - (b.when ? 0 : 1)
      || (a.when && b.when ? a.when.year - b.when.year || a.when.month - b.when.month : a.name.localeCompare(b.name)));
}

function groupingReasons(jobs, year) {
  const counts = {};
  for (const job of jobs) {
    const reason = monthOfGroup(job.mo, year) ? 'Planned by month' : /additional/i.test(job.mo) ? 'Additional' : job.mo || 'No group';
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

const lifeUsed = (job) => ropeLifeUsed(job.cur, job.rec);

function nearLimitCard(ropes) {
  if (!ropes.length) return '';
  return insightCard('Closest to the move limit', 'Ropes not yet replaced, current moves against recommended moves', html`
    <div class="ropes">${ropes.slice(0, NEAR_LIMIT_SHOWN).map((rope) => html`
      <a class="rp" href="#${rope.id}">
        <b>${rope.id}</b>
        <span class="rn">${rope.type}${rope.sany ? ' · SANY sheet' : ''}</span>
        <span class="rv">${rope.pct.toFixed(1)}%</span>
        ${progressBar(rope.pct, ropeTone(rope.pct))}
        <small>${formatNumber(rope.current)} of ${formatNumber(rope.limit)} moves${rope.note ? ` · ${sentenceCase(rope.note)}` : ''}</small>
      </a>`)}</div>`);
}

function byTypeCard(done, pending) {
  const rows = ROPE_TYPES
    .map((type) => ({ type, done: done.filter((j) => j.type === type).length, pending: pending.filter((j) => j.type === type).length }))
    .filter((row) => row.done + row.pending);
  const largest = Math.max(1, ...rows.map((row) => row.done + row.pending));
  if (!rows.length) return '';
  return insightCard('By rope type', 'Done and pending replacements', html`
    ${segmentBars(rows.map((row) => ({
      label: row.type,
      text: `${row.done} done · ${row.pending} pending`,
      segments: [{ value: row.done, tone: 'ok' }, { value: row.pending, tone: 'warn' }],
    })), largest)}
    ${legend([['Done', '', 's-ok'], ['Pending', '', 's-wn']])}`);
}

function planGroupCard(pending, year) {
  const groups = pendingByGroup(pending, year);
  if (!groups.length) return '';
  const late = pending.filter((job) => groupHasPassed(job.mo, year)).length;
  return insightCard('Pending by plan group', 'Groups as named in the sheet', html`
    ${horizontalBars(groups.map((group) => ({
      label: html`${group.name}${groupHasPassed(group.name, year) ? html` <small>month passed</small>` : ''}`,
      value: group.count,
      tone: groupHasPassed(group.name, year) ? 'bad' : 'warn',
    })))}
    ${late ? caption(`${late} pending replacements were planned for a month that has already passed.`) : ''}`);
}

function afterLimitCard(done) {
  const withMoves = done
    .map((job) => ({ job, current: parseNumber(job.cur), limit: parseNumber(job.rec) }))
    .filter((entry) => entry.current && entry.limit);
  if (!withMoves.length) return '';
  const over = withMoves.filter((entry) => entry.current > entry.limit).sort((a, b) => b.current / b.limit - a.current / a.limit);
  return insightCard('Replaced after the recommended moves', 'Completed jobs that have move counts', html`
    <div class="rt"><span>Over the limit when replaced</span><b>${over.length} of ${withMoves.length}</b></div>
    ${meter([[over.length, 'bad'], [withMoves.length - over.length, 'ok']], withMoves.length)}
    ${legend([['Over', over.length, 's-bd'], ['Within', withMoves.length - over.length, 's-ok']])}
    ${over.length ? html`
      ${subheading('Furthest over')}
      ${horizontalBars(
        over.slice(0, FURTHEST_OVER_SHOWN).map(({ job, current, limit }) => ({
          label: html`<b>${job.id}</b> ${job.type} <small>${formatNumber(current)} of ${formatNumber(limit)}</small>`,
          value: (current / limit - 1) * 100,
          href: `#${job.id}`,
          tone: 'bad',
        })),
        { format: (value) => `+${value.toFixed(1)}%` },
      )}` : ''}`);
}

function pendingTable(pending) {
  if (!pending.length) return '';
  const sorted = [...pending].sort((a, b) => {
    const pa = lifeUsed(a);
    const pb = lifeUsed(b);
    return (pb === null ? -1 : pb) - (pa === null ? -1 : pa) || +a.id.slice(1) - +b.id.slice(1);
  });
  const { step } = PAGE_SIZE.pendingRopes;
  return html`
    ${sectionHeader('Pending replacements', pending.length)}
    <article class="card flat">${responsiveTable([
      { label: 'Crane', cell: (job) => craneLink(job.id) },
      { label: 'Rope', cell: (job) => job.type },
      { label: 'Plan group', cell: (job) => job.mo || '–' },
      { label: 'Moves', cell: (job) => {
        const current = parseNumber(job.cur);
        const limit = parseNumber(job.rec);
        return current && limit ? `${formatNumber(current)} of ${formatNumber(limit)}` : '–';
      } },
      { label: 'Life used', cell: (job) => {
        const pct = lifeUsed(job);
        return pct === null ? '–' : barWithText(pct, ropeTone(pct), `${pct.toFixed(1)}%`);
      } },
      { label: 'Rope stock', cell: (job) => chip(job.av) || '–' },
      { label: 'WO', cell: (job) => job.wo || '–' },
    ], sorted.slice(0, view.rpN))}</article>
    ${showMoreButton('rpN', pending.length - view.rpN, step)}`;
}

function sanyTable(sany) {
  if (!sany.length) return '';
  return html`
    ${sectionHeader('SANY wirerope update', sany.length)}
    <article class="card flat">${responsiveTable([
      { label: 'Crane', cell: (rope) => craneLink(rope.id) },
      { label: 'Rope', cell: (rope) => rope.ty || '–' },
      { label: 'Status', cell: (rope) => chip(rope.st) || '–' },
      { label: 'Current moves', cell: (rope) => {
        const current = parseNumber(rope.cur);
        if (current === null) return '–';
        const limit = parseNumber(rope.lim);
        return limit ? `${formatNumber(current)} of ${formatNumber(limit)}` : formatNumber(current);
      } },
      { label: 'Replaced on', cell: (rope) => formatDate(rope.d) || '–' },
      { label: 'Moves at replacement', cell: (rope) => (parseNumber(rope.mv) !== null ? formatNumber(parseNumber(rope.mv)) : '–') },
    ], sany)}</article>`;
}

export function renderWirerope() {
  const fleet = getFleet();
  const { ropeJobs: jobs, pendingRopeJobs: pending, doneRopeJobs: done, ropesNearLimit: ropes } = fleet;
  const year = +dataYear();
  const sany = fleet.ids.flatMap((id) => getCrane(id).sany.map((rope) => ({ id, ...rope })));
  if (!jobs.length && !sany.length) {
    return html`${topicNav('wirerope')}${pageHeader('Wirerope', '')}${emptyStateCard('The file has no WIREROPE sheet, or it has no rows.')}`;
  }
  const nearAlert = ropes.filter((rope) => rope.pct >= THRESHOLDS.ropeAlertPct).length;
  const anyOver = ropes.some((rope) => rope.pct >= THRESHOLDS.ropeLimitPct);

  return html`
    ${topicNav('wirerope')}
    ${pageHeader('Wirerope', `Replacement jobs from the wirerope monitoring sheet${sany.length ? ' and the SANY update sheet' : ''}.`)}
    ${keyFigures([
      [formatNumber(jobs.length), 'Replacement jobs', ''],
      [formatNumber(done.length), 'Done', 'ok'],
      [formatNumber(pending.length), 'Pending', 'warn'],
      [nearAlert, `At ${THRESHOLDS.ropeAlertPct}% or more of limit`, anyOver ? 'bad' : nearAlert ? 'warn' : ''],
    ])}
    <div class="igrid">
      ${nearLimitCard(ropes)}
      ${byTypeCard(done, pending)}
      ${planGroupCard(pending, year)}
      ${insightCard('How replacements were grouped', 'All jobs in the sheet, done and pending', html`
        ${horizontalBars(groupingReasons(jobs, year).map(([label, value]) => ({ label, value, tone: RED_GROUPS.test(label) ? 'bad' : 'normal' })))}
        ${caption('Red bars are the Broken strand, Prematured and Acc groups.')}`)}
      ${afterLimitCard(done)}
    </div>
    ${pendingTable(pending)}
    ${sanyTable(sany)}`;
}
