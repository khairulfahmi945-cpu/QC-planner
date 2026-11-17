/** The Cranes page: every crane as a tile or a table row, with search and filters. */
import { MONTH_NAMES } from '../config.js';
import { getCrane } from '../domain/dataset.js';
import {
  craneStatus, isDown, isOperating, pmaDaysLeft, pmaStatus, pmStateIn,
} from '../domain/crane.js';
import { getFleet } from '../domain/fleet.js';
import { digitsOf, numberOf } from '../domain/search.js';
import { isOpenJob } from '../domain/purchasing.js';
import { hasOpenP1, openRequests, priorityTone, topPriority } from '../domain/workRequests.js';
import { UNRANKED_PRIORITY } from '../config.js';
import { formatDate } from '../lib/dates.js';
import { $, cx, html, render } from '../lib/dom.js';
import { barWithText } from '../ui/charts.js';
import { ropeTone } from '../domain/wirerope.js';
import {
  chip, choiceGroup, craneLink, emptyNote, pageHeader,
} from '../ui/components.js';
import { responsiveTable } from '../ui/table.js';
import { view } from '../ui/viewState.js';

/** [key, label, test]. The key is what the filter buttons send back. */
export const CRANE_FILTERS = [
  ['all', 'All', () => true],
  ['down', 'Down', (crane) => isDown(crane)],
  ['p1', 'P1 open', (crane) => hasOpenP1(crane)],
  ['pend', 'PM not done', (crane, fleet) => Boolean(fleet.month) && pmStateIn(crane, fleet.month) !== 'done'],
  ['pma', 'PMA due / expired', (crane) => /expired|due/.test(pmaStatus(crane))],
];

const PM_LABEL = { done: 'done', plan: 'in plan', pend: 'not started', none: 'no record' };
const PM_CHIP = { done: ['Done', 'ok'], plan: ['In plan', 'warn'], pend: ['Not started', ''], none: ['No record', ''] };

export function renderCranes() {
  const fleet = getFleet();
  const { month } = fleet;
  const filters = CRANE_FILTERS.map(([value, label, test]) => ({
    key: 'filt',
    value,
    label,
    count: fleet.ids.filter((id) => test(getCrane(id), fleet)).length,
    pressed: view.filt === value,
  }));
  const modes = [['tiles', 'Tiles'], ['list', 'List']].map(([value, label]) => ({ key: 'cview', value, label, pressed: view.cview === value }));

  return html`
    ${pageHeader('Cranes', `${fleet.count} cranes in ${Object.keys(fleet.fleets).length} fleets. Tap a crane to open it.`)}
    <label class="find-in">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <span class="vh">Find a crane number</span>
      <input id="cq" type="search" inputmode="numeric" placeholder="Find a crane number" value="${view.cq}" autocomplete="off">
    </label>
    ${choiceGroup('Filter cranes', filters)}
    <div class="cbar">
      ${choiceGroup('View', modes, 'seg sm')}
      ${month ? html`<span class="key"><i class="pm-done"></i>PM done<i class="pm-plan"></i>In plan<i class="pm-pend"></i>Not started</span>` : ''}
    </div>
    <div id="clist"></div>`;
}

const matchesSearch = (id) => {
  const digits = digitsOf(view.cq);
  return !digits || numberOf(id).includes(digits);
};

function tile(id, fleet, index) {
  const crane = getCrane(id);
  const status = craneStatus(crane);
  const pm = fleet.month ? pmStateIn(crane, fleet.month) : 'none';
  const title = `${id}${fleet.month ? ` · PM ${MONTH_NAMES[fleet.month]}: ${PM_LABEL[pm]}` : ''}`;
  const note = status && !isOperating(crane) ? status : hasOpenP1(crane) ? 'P1 open' : '';
  return html`
    <a class="${cx('qc', `pm-${pm}`, isDown(crane) && 'down')}" style="--i:${Math.min(index, 36)}" href="#${id}" title="${title}">${id}${note ? html`<small>${note}</small>` : ''}</a>`;
}

function tiles(fleet, ids) {
  let index = 0;
  return Object.entries(fleet.fleets).map(([name, members]) => {
    const shown = members.filter((id) => ids.has(id));
    if (!shown.length) return '';
    return html`
      <h3 class="fl-h">${name} <small>${shown.length}</small></h3>
      <div class="grid">${shown.map((id) => tile(id, fleet, index++))}</div>`;
  });
}

function table(fleet, ids) {
  const ropeUsed = (id) => fleet.ropesNearLimit.find((rope) => rope.id === id)?.pct ?? null;
  return html`<article class="card flat">${responsiveTable([
    { label: 'Crane', cell: (id) => craneLink(id) },
    { label: 'Fleet', cell: (id) => getCrane(id).fleet || '–' },
    { label: 'Status', cell: (id) => chip(craneStatus(getCrane(id))) || '–' },
    { label: `PM ${fleet.month || ''}`, cell: (id) => chip(...PM_CHIP[pmStateIn(getCrane(id), fleet.month)]) },
    { label: 'Open work requests', cell: (id) => {
      const crane = getCrane(id);
      const open = openRequests(crane).length;
      const top = topPriority(crane);
      if (!open) return '0';
      return html`${open}${top < UNRANKED_PRIORITY ? html` <span class="chip ${priorityTone(top)}">P${top}</span>` : ''}`;
    } },
    { label: 'Open PR / WO', cell: (id) => getCrane(id).pr.filter(isOpenJob).length },
    { label: 'PMA / CF', cell: (id) => {
      const crane = getCrane(id);
      const days = pmaDaysLeft(crane);
      if (days === null) return '–';
      return html`${formatDate(crane.pmaExp)} ${days < 0 ? chip('Expired', 'bad') : days <= 60 ? chip(`${days} d`, 'warn') : ''}`;
    } },
    { label: 'Rope life used', cell: (id) => {
      const pct = ropeUsed(id);
      return pct === null ? '–' : barWithText(pct, ropeTone(pct), `${pct.toFixed(0)}%`);
    } },
  ], [...ids])}</article>`;
}

/** Redraws just the tiles or table, so typing in the search box keeps its focus. */
export function renderCraneList() {
  const target = $('#clist');
  if (!target) return;
  const fleet = getFleet();
  const test = (CRANE_FILTERS.find(([key]) => key === view.filt) || CRANE_FILTERS[0])[2];
  const ids = new Set(fleet.ids.filter((id) => test(getCrane(id), fleet) && matchesSearch(id)));
  if (!ids.size) {
    render(target, emptyNote('No cranes match.'));
    return;
  }
  render(target, view.cview === 'list' ? table(fleet, [...ids]) : tiles(fleet, ids));
}
