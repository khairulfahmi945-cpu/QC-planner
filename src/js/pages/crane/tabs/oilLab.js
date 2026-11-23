import { RESULT_TONE, hasOilLab, samplesOfCrane } from '../../../domain/oilLab.js';
import { formatDate } from '../../../lib/dates.js';
import { html } from '../../../lib/dom.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { craneView } from '../state.js';

/** The small number beside the tab label: samples on file for the open crane. */
export const oilLabCount = () => (hasOilLab() ? samplesOfCrane(craneView.id).length : '');

export function renderOilLab() {
  if (!hasOilLab()) return emptyNote('The oil analysis file has not been uploaded yet. Upload it on the Data page.');
  const samples = samplesOfCrane(craneView.id);
  if (!samples.length) return emptyNote('No oil analysis results for this crane.');
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
