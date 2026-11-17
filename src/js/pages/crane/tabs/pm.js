import { MONTH_NAMES } from '../../../config.js';
import { dataYear } from '../../../domain/dataset.js';
import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';

export function renderPm(crane) {
  if (!crane.pm.length) return emptyNote(`No PM records in ${dataYear()}.`);
  return html`${[...crane.pm].reverse().map((record) => html`
    <article class="card">
      <h3>${MONTH_NAMES[record.m]} ${dataYear()}</h3>
      ${chipRow(chip(record.st), chip(record.s))}
      ${detailList(
        detailRow('PM done', record.a.map(formatDate).join(', ')),
        detailRow('Previous PM', formatDate(record.ls)),
        detailRow('Remark', record.r),
        ...Object.entries(record.p || {}).map(([part, date]) => detailRow(part, formatDate(date))),
      )}
    </article>`)}`;
}
