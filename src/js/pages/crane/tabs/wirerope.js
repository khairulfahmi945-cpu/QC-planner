import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { ropeGauge, sanyCard } from '../parts.js';

function jobCard(job) {
  const over = job.over ? job.over + (job.pct ? ` (${job.pct}%)` : '') : '';
  return html`
    <article class="card">
      <h3>${job.j}</h3>
      ${chipRow(chip(job.js), chip(job.av), job.pri ? chip(`Priority ${job.pri}`, '') : '')}
      ${ropeGauge(job.cur, job.rec)}
      ${detailList(
        detailRow('Plan group', job.mo),
        detailRow('Plan date', formatDate(job.pd)),
        detailRow('Current moves', job.cur),
        detailRow('Recommended moves', job.rec),
        detailRow('Over moves', over),
        detailRow('WO', job.wo),
        detailRow('PR', job.pr),
        detailRow('CWO', job.cwo),
        detailRow('Item code', job.item),
        detailRow('Note', [job.loc, job.note].filter(Boolean).join(' · ')),
      )}
    </article>`;
}

export function renderWirerope(crane) {
  if (!crane.sany.length && !crane.wr.length) return emptyNote('No wirerope records for this crane.');
  return html`${crane.sany.map(sanyCard)}${[...crane.wr].reverse().map(jobCard)}`;
}
