import { jobCategory } from '../../../domain/purchasing.js';
import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { craneView } from '../state.js';

const FILTERS = [['open', 'Open'], ['done', 'Complete'], ['other', 'Other'], ['all', 'All']];

export function renderPurchasing(crane) {
  const jobs = [...crane.pr].sort((a, b) => b.d.localeCompare(a.d));
  const groups = {
    open: jobs.filter((job) => jobCategory(job) === 'open'),
    done: jobs.filter((job) => jobCategory(job) === 'done'),
    other: jobs.filter((job) => jobCategory(job) === 'other'),
    all: jobs,
  };
  const shown = groups[craneView.purchasingFilter] || jobs;
  const filters = html`
    <div class="seg">${FILTERS.filter(([key]) => key !== 'other' || groups.other.length).map(([key, label]) => html`
      <button data-pr="${key}" aria-pressed="${String(craneView.purchasingFilter === key)}">${label} (${groups[key].length})</button>`)}
    </div>`;
  if (!shown.length) return html`${filters}${emptyNote('No PR or work orders in this view.')}`;

  const left = shown.length - craneView.purchasingLimit;
  return html`
    ${filters}
    ${shown.slice(0, craneView.purchasingLimit).map((job) => html`
      <article class="card">
        <h3>${job.j || 'No description'}</h3>
        ${chipRow(chip(job.st), chip(job.ps))}
        ${detailList(
          detailRow('Vendor', job.v),
          detailRow('Cost', job.rm),
          detailRow('WO', job.wo),
          detailRow('PR', job.pr),
          detailRow('PO', job.po),
          detailRow('GRN', job.grn),
          detailRow('Service code', job.sc),
          detailRow('Date', formatDate(job.d)),
          detailRow('Planner update', job.pu),
        )}
      </article>`)}
    ${left > 0 ? html`<button class="more" id="more">Show more (${left} left)</button>` : ''}`;
}
