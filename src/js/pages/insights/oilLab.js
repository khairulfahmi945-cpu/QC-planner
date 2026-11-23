/** Insights: oil analysis (lab) results from the separate oil analysis file. */
import { PAGE_SIZE } from '../../config.js';
import { MONTHS_SHOWN, RESULTS, RESULT_TONE, getOilLab, getOilLabSummary, hasOilLab } from '../../domain/oilLab.js';
import { formatDate, monthLongFromKey, yearFromKey } from '../../lib/dates.js';
import { html } from '../../lib/dom.js';
import { formatNumber } from '../../lib/format.js';
import { horizontalBars, segmentBars } from '../../ui/charts.js';
import {
  choiceGroup, emptyStateCard, insightCard, keyFigures, legend, listRow, pageHeader, sectionHeader,
  showMoreButton,
} from '../../ui/components.js';
import { topicNav } from '../../ui/topics.js';
import { oilBoard, referenceTable, workOrderCard } from './oilBoard.js';
import { view } from '../../ui/viewState.js';

const TOP_MODES = 6;
const TOP_CRANES = 8;

const totalOf = (tally) => RESULTS.reduce((n, result) => n + tally[result], 0);
const segmentsOf = (tally) => RESULTS.map((result) => ({ value: tally[result], tone: RESULT_TONE[result] }));
const resultLegend = () => legend(RESULTS.map((result) => [result, '', `s-${{ ok: 'ok', warn: 'wn', bad: 'bd' }[RESULT_TONE[result]]}`]));

/** One row of the "needs action" list: the component, why, what was advised. */
export function sampleRow(sample, { withCrane = true } = {}) {
  const detail = [
    formatDate(sample.d),
    sample.act,
    sample.wr,
    sample.fm,
  ].filter(Boolean).join(' · ');
  const title = withCrane ? `${sample.sys} · ${sample.rec || sample.rem || sample.res}` : `${sample.sys} · ${sample.res}`;
  return listRow({ id: sample.id, title, detail, value: sample.res, tone: RESULT_TONE[sample.res] === 'ok' ? '' : RESULT_TONE[sample.res] });
}

function attentionList(summary) {
  const choices = [['all', 'All', summary.attention.length]]
    .concat(['Critical', 'Caution'].map((result) => [result, result, summary.attention.filter((s) => s.res === result).length]));
  const shown = view.labf === 'all' ? summary.attention : summary.attention.filter((s) => s.res === view.labf);
  const { step } = PAGE_SIZE.oilLabAttention;
  return html`
    ${sectionHeader('Needs action now', `${summary.attention.length} components · newest result of each`)}
    ${choiceGroup('Result', choices.map(([value, label, count]) => ({ key: 'labf', value, label, count, pressed: view.labf === value })))}
    ${shown.length
      ? html`<div class="rows">${shown.slice(0, view.labN).map((sample) => sampleRow(sample))}</div>
          ${showMoreButton('labN', shown.length - view.labN, step)}`
      : html`<p class="empty">Nothing here. Every component's newest result is fine.</p>`}`;
}

export function renderOilLab() {
  if (!hasOilLab()) {
    return html`${topicNav('oil-lab')}${pageHeader('Oil lab', '')}${emptyStateCard('Open the Data page and upload the QC Oil Analysis Result file.', 'No oil analysis loaded yet')}
      <div class="tools"><a class="btn pri" href="#data">Go to Data</a></div>`;
  }
  const summary = getOilLabSummary();
  const { refs } = getOilLab();
  const largestMonth = Math.max(1, ...summary.months.map((key) => totalOf(summary.byMonth[key])));
  const groups = Object.entries(summary.byGroup).sort((a, b) => totalOf(b[1]) - totalOf(a[1]));
  const largestGroup = Math.max(1, ...groups.map(([, tally]) => totalOf(tally)));
  const modes = Object.entries(summary.modes).sort((a, b) => b[1] - a[1]).slice(0, TOP_MODES);

  return html`
    ${topicNav('oil-lab')}
    ${pageHeader('Oil lab', `What needs oil replacement and sampling, and the lab results. Newest sample ${summary.newest ? formatDate(summary.newest) : 'none'}.`)}
    ${oilBoard()}
    ${sectionHeader('Lab results', `${formatNumber(getOilLab().samples.length)} samples in the file`)}
    ${keyFigures([
      [formatNumber(summary.windowCount), `Samples in ${MONTHS_SHOWN} months`, ''],
      [summary.criticalNow, 'Critical now', summary.criticalNow ? 'bad' : ''],
      [summary.cautionNow, 'Caution now', summary.cautionNow ? 'warn' : ''],
      [summary.changeOil, 'Change oil advised', summary.changeOil ? 'warn' : ''],
    ])}
    <div class="igrid">
      ${insightCard('Results per month', `Last ${MONTHS_SHOWN} months, by sampling date`, html`
        ${segmentBars(summary.months.map((key) => ({
          label: `${monthLongFromKey(key)} ${yearFromKey(key)}`,
          text: totalOf(summary.byMonth[key]),
          segments: segmentsOf(summary.byMonth[key]),
        })), largestMonth)}
        ${resultLegend()}`)}
      ${groups.length ? insightCard('By component', `Last ${MONTHS_SHOWN} months`, html`
        ${segmentBars(groups.map(([name, tally]) => ({
          label: name,
          text: `${totalOf(tally)} · ${tally.Critical} critical`,
          segments: segmentsOf(tally),
        })), largestGroup)}
        ${resultLegend()}`) : ''}
      ${modes.length ? insightCard('Failure modes', 'Caution and critical samples, last 12 months', horizontalBars(
        modes.map(([label, value]) => ({ label, value })), { tone: 'warn' })) : ''}
      ${workOrderCard()}
      ${summary.criticalByCrane.length ? insightCard('Most critical components', 'Components whose newest result is critical, by crane', horizontalBars(
        summary.criticalByCrane.slice(0, TOP_CRANES).map(([id, value]) => ({ label: html`<b>${id}</b>`, value, href: `#${id}` })),
        { tone: 'bad', format: (n) => `${n} critical` })) : ''}
    </div>
    ${attentionList(summary)}
    ${sectionHeader('Reference', 'Tables from the oil analysis file')}
    <div class="igrid">
      ${referenceTable('Alert limits', 'Properties Limit sheet: abnormal and severe limits by parameter', refs.limits)}
      ${referenceTable('Lube chart by fleet', 'QC Mini Chart sheet: oil grade of each component, and gantry gearboxes', refs.lube)}
      ${referenceTable('SANY oil types and volumes', 'SANY sheet', refs.sany)}
    </div>`;
}
