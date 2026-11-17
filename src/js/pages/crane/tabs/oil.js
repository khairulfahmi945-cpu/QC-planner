import { oilDate } from '../../../domain/oil.js';
import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { oilChips } from '../parts.js';
import { craneView } from '../state.js';

export function renderOil(crane) {
  if (!crane.oil.length) return emptyNote('No oil sampling records for this crane.');
  const left = crane.oil.length - craneView.oilLimit;
  return html`
    ${crane.oil.slice(0, craneView.oilLimit).map((job) => html`
      <article class="card">
        <h3>${formatDate(oilDate(job) || job.d)}</h3>
        ${chipRow(chip(job.s), oilChips(job))}
        ${detailList(
          detailRow('Plan date', formatDate(job.d)),
          detailRow('Completed', formatDate(job.c)),
          detailRow('Work order', job.wo),
          detailRow('Description', job.ds),
        )}
      </article>`)}
    ${left > 0 ? html`<button class="more" id="moreo">Show more (${left} left)</button>` : ''}`;
}
