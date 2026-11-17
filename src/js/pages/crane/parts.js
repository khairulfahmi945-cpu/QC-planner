/** Pieces used on more than one tab of the crane page. */
import { MONTHS, MONTH_NAMES } from '../../config.js';
import { monthCellState, PM_STATE_LABEL, pmRecordIn } from '../../domain/crane.js';
import { oilParts } from '../../domain/oil.js';
import { ropeLifeUsed, ropeTone } from '../../domain/wirerope.js';
import { formatDate } from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatNumber, parseNumber } from '../../lib/format.js';
import { progressBar } from '../../ui/charts.js';
import { chip, detailList, detailRow } from '../../ui/components.js';

/** Twelve small blocks, one per month, showing PM status across the year. */
export const pmTimeline = (crane) => html`
  <ol class="tl" aria-label="PM status by month">${MONTHS.map((month) => {
    const state = monthCellState(pmRecordIn(crane, month));
    return html`<li class="t-${state}" title="${MONTH_NAMES[month]}: ${PM_STATE_LABEL[state]}"><i></i><span>${month.charAt(0)}</span></li>`;
  })}</ol>`;

/** "Rope life used" bar, or nothing when the move counts are missing. */
export function ropeGauge(currentMoves, recommendedMoves, label = 'Rope life used') {
  const pct = ropeLifeUsed(currentMoves, recommendedMoves);
  if (pct === null) return '';
  return html`
    <div class="gauge">
      <div class="rt"><span>${label}</span><b>${pct.toFixed(1)}%</b></div>
      ${progressBar(pct, ropeTone(pct))}
    </div>`;
}

/** Chips for an oil job: what was sampled and what had its oil replaced. */
export function oilChips(job) {
  const { sampled, replaced } = oilParts(job.ds);
  return html`${sampled.length ? chip(`Sampling: ${sampled.join(', ')}`, 'ok') : ''}${replaced.length ? chip(`Oil replaced: ${replaced.join(', ')}`, 'warn') : ''}`;
}

const moves = (value) => (parseNumber(value) !== null ? formatNumber(parseNumber(value)) : value);

/** One SANY wirerope row as a card. */
export function sanyCard(rope) {
  const earlier = rope.x2
    ? [formatDate(rope.x2.d), parseNumber(rope.x2.mv) !== null ? `${formatNumber(parseNumber(rope.x2.mv))} moves` : '', rope.x2.item].filter(Boolean).join(' · ')
    : '';
  return html`
    <article class="card">
      <h3>SANY ${(rope.ty || '').toLowerCase()} wirerope</h3>
      <div class="chips">${chip(rope.st)}</div>
      ${ropeGauge(rope.cur, rope.lim)}
      ${detailList(
        detailRow('Current moves', moves(rope.cur)),
        detailRow('Recommended moves', parseNumber(rope.lim) !== null ? formatNumber(parseNumber(rope.lim)) : ''),
        detailRow('Replaced on', formatDate(rope.d)),
        detailRow('Moves at replacement', moves(rope.mv)),
        detailRow('Item code', rope.item),
        detailRow('Earlier replacement', earlier),
      )}
    </article>`;
}

/** The SOS coupling card, shown on the Summary and Inspection tabs. */
export const couplingCard = (sos) => html`
  <article class="card">
    <h3>SOS coupling service</h3>
    <div class="chips">${chip(sos.s) || chip('No status', '')}</div>
    ${detailList(detailRow('Date', formatDate(sos.d)))}
  </article>`;
