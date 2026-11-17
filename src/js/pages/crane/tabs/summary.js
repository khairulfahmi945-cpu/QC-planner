import { MONTH_NAMES, THRESHOLDS, UNRANKED_PRIORITY } from '../../../config.js';
import { dataYear } from '../../../domain/dataset.js';
import { latestPmRecord, pmaDaysLeft } from '../../../domain/crane.js';
import { isOpenJob, jobCategory } from '../../../domain/purchasing.js';
import { isOpenRequest, priorityRank, priorityTone, topPriority } from '../../../domain/workRequests.js';
import { todayIso, formatDate } from '../../../lib/dates.js';
import { html, joinHtml } from '../../../lib/dom.js';
import { formatNumber, parseNumber } from '../../../lib/format.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { couplingCard, oilChips, pmTimeline } from '../parts.js';

function certificateChip(crane) {
  const days = pmaDaysLeft(crane);
  if (days === null) return '';
  if (days < 0) return chip('Expired', 'bad');
  return days <= THRESHOLDS.pmaDueDays ? chip(`Due in ${days} days`, 'warn') : chip('Valid', 'ok');
}

const craneCard = (crane) => html`
  <article class="card"><h3>Crane</h3>${detailList(
    detailRow('Fleet', crane.fleet),
    detailRow('Type', crane.desc),
    detailRow('PMA no.', crane.pma),
    detailRow('Serial no.', crane.serial),
    detailRow('PMA / CF expiry', crane.pmaExp ? html`${formatDate(crane.pmaExp)} ${certificateChip(crane)}` : ''),
  )}</article>`;

function latestPmCard(crane) {
  const latest = latestPmRecord(crane);
  return html`
    <article class="card">
      <h3>Latest PM</h3>
      ${pmTimeline(crane)}
      ${latest
        ? html`${chipRow(chip(latest.st), chip(latest.s))}${detailList(
            detailRow('Month', `${MONTH_NAMES[latest.m]} ${dataYear()}`),
            detailRow('PM done', latest.a.map(formatDate).join(', ')),
            detailRow('Remark', latest.r),
          )}`
        : emptyNote(`No PM record in ${dataYear()}.`)}
    </article>`;
}

function purchasingCard(crane) {
  const next = crane.fyk.filter((q) => q.n >= todayIso()).sort((a, b) => a.n.localeCompare(b.n))[0];
  return html`
    <article class="card">
      <h3>PR / WO</h3>
      ${detailList(
        detailRow('Open', html`<b>${crane.pr.filter(isOpenJob).length}</b>`),
        detailRow('Complete', html`<b>${crane.pr.filter((job) => jobCategory(job) === 'done').length}</b>`),
        detailRow('Total', crane.pr.length),
        detailRow('Next inspection', next ? `${next.q} plan, ${formatDate(next.n)}` : ''),
      )}
    </article>`;
}

function requestsCard(crane) {
  const open = crane.wq.filter(isOpenRequest);
  const top = topPriority(crane);
  const byRank = [1, 2, 3]
    .map((rank) => [rank, open.filter((r) => priorityRank(r) === rank).length])
    .filter(([, count]) => count)
    .map(([rank, count]) => chip(`P${rank} × ${count}`, priorityTone(rank)));
  return html`
    <article class="${top < UNRANKED_PRIORITY ? `card crit-${top}` : 'card'}">
      <h3>Work requests</h3>
      ${crane.wq.length
        ? html`
          ${chipRow(top < UNRANKED_PRIORITY ? chip(`Highest open criticality: P${top}`, priorityTone(top)) : chip('No open requests', 'ok'))}
          ${detailList(
            detailRow('Open', html`<b>${open.length}</b>`),
            detailRow('Open by criticality', joinHtml(byRank)),
            detailRow('Closed', crane.wq.length - open.length),
            detailRow('Total', crane.wq.length),
          )}`
        : emptyNote('No work requests for this crane.')}
    </article>`;
}

function wireropeCard(crane) {
  const last = crane.wr[crane.wr.length - 1];
  if (!last && !crane.sany.length) return '';
  return html`
    <article class="card">
      <h3>Wirerope</h3>
      ${last ? chipRow(chip(last.js), chip(last.av)) : ''}
      ${detailList(
        last ? detailRow('Job', last.j) : '',
        last ? detailRow('Current moves', last.cur) : '',
        ...crane.sany.map((rope) => {
          const moves = parseNumber(rope.cur);
          return detailRow(`SANY ${(rope.ty || 'update').toLowerCase()}`, rope.st + (moves !== null ? `, ${formatNumber(moves)} moves` : ''));
        }),
      )}
    </article>`;
}

function oilCard(crane) {
  const latest = crane.oil[0];
  if (!latest) return '';
  return html`
    <article class="card">
      <h3>Latest oil work</h3>
      ${chipRow(chip(latest.s), oilChips(latest))}
      ${detailList(
        detailRow('Plan date', formatDate(latest.d)),
        detailRow('Completed', formatDate(latest.c)),
        detailRow('Work order', latest.wo),
      )}
    </article>`;
}

export const renderSummary = (crane) => html`
  ${craneCard(crane)}
  ${latestPmCard(crane)}
  ${purchasingCard(crane)}
  ${requestsCard(crane)}
  ${wireropeCard(crane)}
  ${crane.sos ? couplingCard(crane.sos) : ''}
  ${oilCard(crane)}`;
