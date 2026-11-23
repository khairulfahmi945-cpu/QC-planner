/** Home: the 3D hero and search sit above; this renders the summary cards below them. */
import { MONTH_NAMES, THRESHOLDS } from '../config.js';
import { getAlertRows, getAlertSummary } from '../domain/alerts.js';
import { describeUpload, getDataset } from '../domain/dataset.js';
import { getOilLabSummary } from '../domain/oilLab.js';
import { getFleet } from '../domain/fleet.js';
import { monthLongFromKey, todayIso } from '../lib/dates.js';
import { $$, html } from '../lib/dom.js';
import { compactNumber, formatNumber, percentOf } from '../lib/format.js';
import { countUp } from '../lib/motion.js';
import { canUpload, isShared } from '../data/shared.js';
import { meter, ring } from '../ui/charts.js';
import { currentMessage, messageMarkup } from '../ui/message.js';

const DOT = { bad: 's-bd', warn: 's-wn', ok: 's-ok' };

function summaryCard({ href, label, value, caption, bar = '', tone = '' }, index) {
  return html`
    <a class="sc" href="${href}" style="--i:${index + 1}">
      <span class="sl">${tone ? html`<i class="dot ${DOT[tone]}"></i>` : ''}${label}</span>
      <b class="sn">${value}</b>
      <span class="st">${caption}</span>
      ${bar}
      <span class="go" aria-hidden="true">›</span>
    </a>`;
}

function fleetCard(fleet) {
  const operating = percentOf(fleet.operatingCount, fleet.count);
  return html`
    <a class="sc fleet" href="#cranes" style="--i:0">
      ${ring(operating, fleet.operatingCount / Math.max(1, fleet.count), 'in operation')}
      <div class="fk">
        <span class="sl">Fleet status</span>
        <div class="kpis">
          <div><b data-n="${fleet.count}">${fleet.count}</b><span>Cranes</span></div>
          <div><b data-n="${fleet.operatingCount}">${fleet.operatingCount}</b><span>In operation</span></div>
          <div class="k-bad"><b data-n="${fleet.downIds.length}">${fleet.downIds.length}</b><span>Down</span></div>
        </div>
        <span class="st">See every crane</span>
      </div>
      <span class="go" aria-hidden="true">›</span>
    </a>`;
}

/** "3 down, 4 P1 requests, 28 PMA expired, 3 ropes over limit" */
function alertReasons(fleet, overLimit) {
  return [
    [fleet.downIds.length, 'down'],
    [getAlertRows('p1').length, 'P1 requests'],
    [getAlertRows('pmaexp').length, 'PMA expired'],
    [overLimit, overLimit === 1 ? 'rope over limit' : 'ropes over limit'],
  ]
    .filter(([count]) => count)
    .map(([count, text]) => `${count} ${text}`)
    .join(', ');
}

/** The newest month with completed oil jobs, how many there were, and couplings still due. */
function oilFigures(fleet) {
  const today = todayIso();
  const months = fleet.oilJobs
    .filter((job) => job.date && job.date <= today)
    .map((job) => job.date.slice(0, 7))
    .sort();
  const latest = months.length ? months[months.length - 1] : '';
  return {
    latest,
    jobsThen: latest ? fleet.oilJobs.filter((job) => job.date.slice(0, 7) === latest).length : 0,
    couplingsDue: fleet.couplings.filter((coupling) => /due/i.test(coupling.s)).length,
  };
}

/** The Home card for the oil analysis file (only when it has been uploaded): what needs oil or a sample. */
function oilLabSummaryCard(lab) {
  const { board } = lab;
  const planned = board.rows.length;
  const tone = board.changeCells ? 'bad' : board.sampleCells ? 'warn' : 'ok';
  if (!planned) {
    return { href: '#oil-lab', label: 'Oil lab', value: lab.criticalNow, tone: lab.criticalNow ? 'bad' : 'ok', caption: `critical now · ${lab.cautionNow} caution` };
  }
  return {
    href: '#oil-lab',
    label: 'Oil lab',
    value: board.changeCells,
    tone,
    caption: `components need oil replacement · ${board.sampleCells} need sampling`,
    bar: meter([[board.changeCells, 'bad'], [board.sampleCells, 'warn']], board.changeCells + board.sampleCells),
  };
}

function summaryCards(fleet) {
  const { redCount } = getAlertSummary();
  const [p1, p2, p3, unranked] = fleet.requestsByRank;
  const done = fleet.pm.done.length;
  const planned = fleet.pm.plan.length;
  const doneValue = fleet.jobValues.done || 0;
  const worstRope = fleet.ropesNearLimit[0];
  const overLimit = fleet.ropesNearLimit.filter((rope) => rope.pct >= THRESHOLDS.ropeLimitPct).length;
  const { expired, due, valid } = fleet.certificates;
  const oil = oilFigures(fleet);
  const reasons = alertReasons(fleet, overLimit);
  const ropeJobs = fleet.doneRopeJobs.length + fleet.pendingRopeJobs.length;
  const lab = getOilLabSummary();

  return [
    {
      href: '#attention',
      label: 'Needs attention',
      value: redCount,
      tone: redCount ? 'bad' : 'ok',
      caption: `cranes with a red alert${reasons ? `: ${reasons}` : ''}`,
    },
    {
      href: '#pm',
      label: `PM ${fleet.month ? MONTH_NAMES[fleet.month] : ''}`,
      value: html`${percentOf(done, fleet.count)}<small>%</small>`,
      caption: `done · ${done} of ${fleet.count} cranes`,
      bar: meter([[done, 'ok'], [planned, 'warn']], fleet.count),
    },
    {
      href: '#work-requests',
      label: 'Work requests',
      value: formatNumber(fleet.openRequests.length),
      tone: p1 ? 'bad' : '',
      caption: `open · ${p1} at P1`,
      bar: meter([[p1, 'bad'], [p2, 'warn'], [p3 + unranked, 'ok']], fleet.openRequests.length),
    },
    {
      href: '#pr-wo',
      label: 'PR / WO',
      value: html`<small class="pre">MYR</small>${compactNumber(fleet.openJobValue)}`,
      caption: `open · ${formatNumber(fleet.openJobs.length)} jobs`,
      bar: meter([[doneValue, 'ok'], [fleet.openJobValue, 'warn']], doneValue + fleet.openJobValue),
    },
    {
      href: '#wirerope',
      label: 'Wirerope',
      value: formatNumber(fleet.pendingRopeJobs.length),
      tone: overLimit ? 'bad' : worstRope && worstRope.pct >= THRESHOLDS.ropeAlertPct ? 'warn' : '',
      caption: `pending${worstRope ? ` · ${worstRope.id} at ${worstRope.pct.toFixed(0)}%` : ''}`,
      bar: meter([[fleet.doneRopeJobs.length, 'ok'], [fleet.pendingRopeJobs.length, 'warn']], ropeJobs),
    },
    {
      href: '#certificates',
      label: 'PMA / CF',
      value: expired.length,
      tone: expired.length ? 'bad' : due.length ? 'warn' : '',
      caption: `expired · ${due.length} due within ${THRESHOLDS.pmaDueDays} days`,
      bar: meter([[valid.length, 'ok'], [due.length, 'warn'], [expired.length, 'bad']], fleet.count),
    },
    {
      href: '#oil',
      label: 'Oil & coupling',
      value: oil.jobsThen,
      caption: oil.latest
        ? `oil jobs in ${monthLongFromKey(oil.latest)}${oil.couplingsDue ? ` · ${oil.couplingsDue} couplings due` : ''}`
        : 'no oil records',
    },
    ...(lab ? [oilLabSummaryCard(lab)] : []),
    {
      href: '#fleets',
      label: 'Fleets',
      value: Object.keys(fleet.fleets).length,
      caption: 'crane batches compared side by side',
    },
  ];
}

/** Shown while there is no dataset: how to get one. */
function emptyHome() {
  const upload = canUpload();
  let text = html`Upload the latest <b>LIVE UPDATE</b> Excel file (.xlsx). The page saves it on this device and opens it automatically next time.`;
  if (!upload) {
    text = html`Waiting for an editor to upload the latest <b>LIVE UPDATE</b> file. It appears here automatically.`;
  } else if (isShared()) {
    text = html`Upload the latest <b>LIVE UPDATE</b> Excel file (.xlsx). Everyone who opens this page sees it straight away.`;
  }
  return html`
    <article class="card empty-state">
      <h3>No data loaded yet</h3>
      <p>${text}</p>
      ${upload ? html`<div class="tools"><label class="btn pri upbtn" for="file" tabindex="0" role="button">Upload live update file</label></div>` : ''}
      ${messageMarkup()}
    </article>`;
}

export function renderHome() {
  const dataset = getDataset();
  if (!dataset) return emptyHome();
  const fleet = getFleet();
  return html`
    ${currentMessage().kind === 'bad' ? messageMarkup() : ''}
    <div class="hgrid">
      ${fleetCard(fleet)}
      ${summaryCards(fleet).map(summaryCard)}
    </div>
    <p class="upd foot">Data from <b>${dataset.src}</b>, uploaded <b>${describeUpload()}</b>. <a href="#data">Manage data</a></p>`;
}

/** Counts the headline numbers up once the cards are on screen. */
export function afterHomeRender(root) {
  $$('b[data-n]', root).forEach((element) => countUp(element, +element.dataset.n));
}
