import {
  RESULT_TONE, hasOilLab, orderOfCrane, planNeeds, planOfCrane, samplesOfCrane,
} from '../../../domain/oilLab.js';
import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote, sectionHeader,
} from '../../../ui/components.js';
import { craneView } from '../state.js';

const plannedRows = (id) =>
  planOfCrane(id).filter((row) => row.changeStatus || row.sampleStatus || row.priority || row.last || row.cycles.length);

/** The small number beside the tab label: components that are due, else samples on file. */
export function oilLabCount() {
  if (!hasOilLab()) return '';
  const due = plannedRows(craneView.id).filter((row) => {
    const needs = planNeeds(row);
    return needs.change || needs.sample;
  }).length;
  return due ? `${due} due` : samplesOfCrane(craneView.id).length;
}

const figure = (value) => (value == null ? '–' : value);

/** Sampling history of one component: one line per cycle. */
function cycleTable(cycles) {
  if (!cycles.length) return '';
  return html`
    <div class="tbl"><table class="qt">
      <thead><tr><th>Sampled</th><th>Viscosity cSt</th><th>TAN mgKOH/g</th><th>Oxidation abs/0.1mm</th><th>Water ppm</th></tr></thead>
      <tbody>${[...cycles].reverse().map((cycle) => html`
        <tr><td>${formatDate(cycle.d)}</td><td>${figure(cycle.v)}</td><td>${figure(cycle.t)}</td><td>${figure(cycle.o)}</td><td>${figure(cycle.w)}</td></tr>`)}
      </tbody>
    </table></div>`;
}

/** One component: what it needs now, its plan, and its sampling history. */
function planCard(row) {
  const needs = planNeeds(row);
  return html`
    <article class="card ${needs.change ? 'crit-1' : needs.sample ? 'crit-2' : ''}">
      <h3>${row.comp}</h3>
      ${chipRow(
        needs.change ? chip('Oil replacement due', 'bad') : chip('Oil OK', 'ok'),
        needs.sample ? chip('Sampling due', 'warn') : chip('Sampling OK', 'ok'),
        row.priority ? chip(`Priority ${row.priority}`) : '',
        row.last ? chip(`Last result ${row.last}`, RESULT_TONE[row.last]) : '',
        row.action ? chip(row.action) : '',
      )}
      ${detailList(
        detailRow('Last oil change', formatDate(row.lastChange)),
        detailRow('Oil usage', row.usage == null ? '' : `${row.usage} months`),
        detailRow('Next sampling', formatDate(row.next)),
      )}
      ${cycleTable(row.cycles)}
    </article>`;
}

function orderNote(order) {
  if (!order) return '';
  return html`
    <article class="card">
      <h3>Oil sampling work order</h3>
      ${chipRow(chip(order.st))}
      ${detailList(
        detailRow('Components', order.parts.join(', ')),
        detailRow('Work order', order.wo),
        detailRow('Date', formatDate(order.d)),
      )}
    </article>`;
}

function resultCards(samples) {
  const left = samples.length - craneView.labLimit;
  return html`
    ${samples.slice(0, craneView.labLimit).map((sample) => html`
      <article class="card">
        <h3>${sample.sys} · ${formatDate(sample.d)}</h3>
        ${chipRow(
          sample.res ? chip(sample.res, RESULT_TONE[sample.res]) : '',
          sample.act ? chip(sample.act) : '',
          sample.fm ? chip(sample.fm) : '',
        )}
        ${detailList(
          detailRow('Oil', sample.oil),
          detailRow('Sample ID', [sample.sid, sample.batch && `batch ${sample.batch}`].filter(Boolean).join(' · ')),
          detailRow('Report received', formatDate(sample.rd)),
          detailRow('Remarks', sample.rem),
          detailRow('Recommendation', sample.rec),
          detailRow('Oil usage (months)', sample.use),
          detailRow('Work request', sample.wr),
        )}
      </article>`)}
    ${left > 0 ? html`<button class="more" id="morelab">Show more (${left} left)</button>` : ''}`;
}

export function renderOilLab() {
  if (!hasOilLab()) return emptyNote('The oil analysis file has not been uploaded yet. Upload it on the Data page.');
  const id = craneView.id;
  const plan = plannedRows(id);
  const samples = samplesOfCrane(id);
  if (!plan.length && !samples.length) return emptyNote('No oil analysis data for this crane.');
  return html`
    ${plan.length ? html`${sectionHeader('Oil plan', 'what each component needs')}${plan.map(planCard)}${orderNote(orderOfCrane(id))}` : ''}
    ${samples.length ? html`${sectionHeader('Lab results', `${samples.length} samples, newest first`)}${resultCards(samples)}` : ''}`;
}
