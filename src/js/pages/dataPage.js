/** The Data page: upload, export, and a check of what was read from the file. */
import { MONTH_NAMES } from '../config.js';
import { canUpload, isShared } from '../data/shared.js';
import { countRecords, dataYear, describeUpload, getDataset } from '../domain/dataset.js';
import { getFleet } from '../domain/fleet.js';
import { html } from '../lib/dom.js';
import { formatNumber } from '../lib/format.js';
import { caption, detailList, detailRow, insightCard, pageHeader } from '../ui/components.js';
import { messageMarkup } from '../ui/message.js';

const steps = html`
  <ol class="steps">
    <li>Open this page in Chrome, Safari or on a computer. The Claude phone app may not open the file picker.</li>
    <li>Tap <b>Upload live update file</b> and choose the latest LIVE UPDATE Excel file (.xlsx).</li>
    <li>Check the numbers under <b>What was read from the file</b>.</li>
  </ol>`;

const uploadButton = () =>
  html`<label class="btn pri upbtn" for="file" tabindex="0" role="button">Upload live update file</label>`;

function toolbar() {
  return html`
    <div class="tools">
      ${canUpload() ? uploadButton() : ''}
      ${getDataset() ? html`<button class="btn" type="button" data-act="exall">Export all (Excel)</button>` : ''}
    </div>
    ${messageMarkup()}`;
}

/** A count for the "what was read" list, with an optional note and the sheet it came from. */
function readCount(count, note, sheet) {
  return html`
    ${count ? html`<b>${formatNumber(count)}</b>` : html`<span class="chip warn">Nothing read</span>`}
    ${note ? html`<small>${note}</small>` : ''}
    ${sheet ? html`<small>Sheet: ${String(sheet).trim()}</small>` : ''}`;
}

function whatWasRead(dataset) {
  const fleet = getFleet();
  const sheets = dataset.sheets || {};
  const pmRows = countRecords(dataset, 'pm');
  const monthRange = fleet.pmByMonth.length
    ? `${MONTH_NAMES[fleet.pmByMonth[0].month]} to ${MONTH_NAMES[fleet.pmByMonth.at(-1).month]}, ${fleet.pmByMonth.length} monthly sheets`
    : '';
  const fixedDates = dataset.fix?.wqDates;

  return insightCard('What was read from the file', 'Check these after every upload. A zero means a sheet was missing or laid out differently.', html`
    <div class="read">${detailList(
      detailRow('Cranes', readCount(fleet.count, '', sheets.fyk)),
      detailRow('PM rows', readCount(pmRows, monthRange)),
      detailRow('PR / WO rows', readCount(countRecords(dataset, 'pr'), `${formatNumber(fleet.jobs.length)} unique jobs`, sheets.pr)),
      detailRow('Work requests', readCount(fleet.requests.length, fixedDates ? `${fixedDates} dates corrected` : '', sheets.wq)),
      detailRow('Wirerope jobs', readCount(fleet.ropeJobs.length, '', sheets.wr)),
      detailRow('SANY wirerope entries', readCount(countRecords(dataset, 'sany'))),
      detailRow('Oil records', readCount(fleet.oilJobs.length, '', sheets.oil)),
      detailRow('Cranes with inspection dates', readCount(fleet.inspections.length)),
      detailRow('SOS coupling rows', readCount(fleet.couplings.length, '', sheets.sos)),
    )}</div>
    ${fixedDates ? caption(`${fixedDates} work request dates had the day and month swapped in the Excel file. They were corrected using the work request number.`) : ''}`);
}

export function renderDataPage() {
  const dataset = getDataset();
  const intro = isShared()
    ? 'One upload is shared with everyone who opens this page.'
    : 'The file you upload is saved on this device only.';
  const header = html`${pageHeader('Data', intro)}${toolbar()}`;

  if (!dataset) {
    const body = canUpload()
      ? steps
      : html`<p class="sub">Waiting for an editor to upload the latest LIVE UPDATE file. It appears here automatically.</p>`;
    return html`${header}<div class="igrid">${insightCard('No data loaded yet', '', body)}</div>`;
  }
  return html`
    ${header}
    <div class="igrid">
      ${insightCard('Current file', '', detailList(
        detailRow('File', dataset.src),
        detailRow('Uploaded', describeUpload()),
        detailRow('Year', dataYear()),
        detailRow('Stored', isShared() ? 'Shared with everyone who opens this page' : 'On this device only'),
      ))}
      ${whatWasRead(dataset)}
      ${insightCard('How to update', '', steps)}
    </div>`;
}
