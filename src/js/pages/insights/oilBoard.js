/**
 * The oil plan board: every crane against every component, so what needs its oil replaced and what
 * needs a sample can be seen at a glance. Comes from the plan sheets of the oil analysis file.
 */
import { COMPONENTS, getOilLabSummary } from '../../domain/oilLab.js';
import { formatDate, todayIso } from '../../lib/dates.js';
import { cx, html } from '../../lib/dom.js';
import { choiceGroup, insightCard, keyFigures, legend, sectionHeader } from '../../ui/components.js';
import { view } from '../../ui/viewState.js';

const SHORT = { Trolley: 'Troll.', Gantry: 'Gantry' };

/** What a cell says in words (for the tooltip and screen readers). */
export function describeNeeds({ change, sample }) {
  return [change && 'oil replacement due', sample && 'sampling due'].filter(Boolean).join(' and ') || 'ok';
}

function cell(component, entry) {
  if (!entry) return html`<td class="lb-c lb-none" aria-label="${component}: not on this crane">–</td>`;
  const text = describeNeeds(entry);
  const tone = entry.change ? 'lb-oil' : entry.sample ? 'lb-smp' : 'lb-ok';
  return html`
    <td class="${cx('lb-c', tone, entry.change && entry.sample && 'lb-both')}" title="${component}: ${text}" aria-label="${component}: ${text}">
      ${entry.change ? html`<b>Oil</b>` : ''}${entry.sample ? html`<b>Smp</b>` : ''}${!entry.change && !entry.sample ? '✓' : ''}
    </td>`;
}

const matches = (row, filter) =>
  filter === 'oil' ? row.change > 0 : filter === 'sample' ? row.sample > 0 : filter === 'any' ? row.change + row.sample > 0 : true;

export function oilBoard() {
  const { board } = getOilLabSummary();
  if (!board.rows.length) return '';
  const rows = board.rows.filter((row) => matches(row, view.labv));
  const choices = [
    ['any', 'Needs something', board.cranesEither],
    ['oil', 'Oil replacement', board.cranesChange],
    ['sample', 'Sampling', board.cranesSample],
    ['all', 'All cranes', board.rows.length],
  ];
  return html`
    ${sectionHeader('Oil plan board', `${board.rows.length} cranes · planned on ${formatDate(todayIso())}`)}
    ${keyFigures([
      [board.changeCells, 'Components due for oil replacement', board.changeCells ? 'bad' : ''],
      [board.sampleCells, 'Components due for sampling', board.sampleCells ? 'warn' : ''],
      [board.cranesEither, 'Cranes needing either', ''],
      [board.orders.open.length, 'Open sampling work orders', board.orders.open.length ? 'warn' : ''],
    ])}
    ${choiceGroup('Show', choices.map(([value, label, count]) => ({ key: 'labv', value, label, count, pressed: view.labv === value })))}
    <article class="card flat">
      ${rows.length ? html`
        <table class="lb">
          <thead><tr><th scope="col">Crane</th>${COMPONENTS.map((c) => html`<th scope="col">${SHORT[c] || c}</th>`)}</tr></thead>
          <tbody>${rows.map((row) => html`
            <tr><th scope="row"><a href="#${row.id}">${row.id}</a></th>${COMPONENTS.map((c) => cell(c, row.cells[c]))}</tr>`)}
          </tbody>
          <tfoot><tr><th scope="row">Oil</th>${COMPONENTS.map((c) => html`<td>${board.totals[c].change}</td>`)}</tr>
            <tr><th scope="row">Smp</th>${COMPONENTS.map((c) => html`<td>${board.totals[c].sample}</td>`)}</tr></tfoot>
        </table>`
        : html`<p class="empty">Nothing due. Every planned component is up to date.</p>`}
    </article>
    ${legend([
      ['Oil: replace the oil', '', 's-bd'],
      ['Smp: take a sample', '', 's-wn'],
      ['Up to date', '', 's-ok'],
    ])}
    <p class="cap">Oil = oil replacement due (oil change status Due, or the action says change oil). Smp = sampling due (sampling status Due, or the action says resample). Tap a crane for the details.</p>`;
}

/** The open sampling work orders, as a card for the Oil lab page. */
export function workOrderCard() {
  const { board } = getOilLabSummary();
  const { open, done } = board.orders;
  if (!open.length && !done.length) return '';
  return insightCard('Oil sampling work orders', `${done.length} completed · ${open.length} open`, open.length ? html`
    <div class="cchips">${open.map((order) => html`
      <a class="cchip" href="#${order.id}" title="${order.parts.join(', ')}">${order.id}<small>${order.parts.join(', ') || 'no parts'} · ${formatDate(order.d)}</small></a>`)}
    </div>` : html`<p class="empty">No open work orders.</p>`);
}

/** A reference sheet shown as a table, exactly as laid out in the file. */
export function referenceTable(title, subtitle, grid) {
  if (!grid?.length) return '';
  return insightCard(title, subtitle, html`
    <div class="tbl"><table class="qt">
      <tbody>${grid.map((row, index) => html`<tr>${row.map((text) => (index === 0 ? html`<th>${text}</th>` : html`<td>${text}</td>`))}</tr>`)}</tbody>
    </table></div>`, { wide: true });
}
