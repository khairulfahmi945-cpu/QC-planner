/** Insights: every crane batch side by side. */
import { getCrane } from '../../domain/dataset.js';
import { isDown, pmaStatus, pmStateIn } from '../../domain/crane.js';
import { getFleet } from '../../domain/fleet.js';
import { isOpenJob } from '../../domain/purchasing.js';
import { isOpenRequest, priorityRank } from '../../domain/workRequests.js';
import { html } from '../../lib/dom.js';
import { barWithText, horizontalBars } from '../../ui/charts.js';
import { caption, chip, insightCard, pageHeader } from '../../ui/components.js';
import { responsiveTable } from '../../ui/table.js';
import { topicNav } from '../../ui/topics.js';

const sum = (items, count) => items.reduce((total, item) => total + count(item), 0);

function summarizeFleets(fleet) {
  return Object.entries(fleet.fleets).map(([name, ids]) => {
    const cranes = ids.map(getCrane);
    const openRequests = (crane) => crane.wq.filter(isOpenRequest);
    return {
      name,
      cranes: cranes.length,
      down: cranes.filter(isDown).length,
      pmDone: ids.filter((id) => pmStateIn(getCrane(id), fleet.month) === 'done').length,
      openRequests: sum(cranes, (c) => openRequests(c).length),
      openP1: sum(cranes, (c) => openRequests(c).filter((r) => priorityRank(r) === 1).length),
      openJobs: sum(cranes, (c) => c.pr.filter(isOpenJob).length),
      expired: cranes.filter((c) => pmaStatus(c) === 'expired').length,
      pendingRopes: sum(cranes, (c) => c.wr.filter((job) => /pend/i.test(job.js)).length),
    };
  });
}

const alertChip = (count, tone) => (count ? chip(String(count), tone) : '0');

export function renderFleets() {
  const fleet = getFleet();
  const rows = summarizeFleets(fleet);
  const perCrane = (value) => (row) => value(row) / row.cranes;
  const ranked = (value) => [...rows].sort((a, b) => perCrane(value)(b) - perCrane(value)(a));
  const busiest = ranked((r) => r.openRequests)[0];

  const barsFor = (value, tone) => horizontalBars(
    ranked(value).map((row) => ({
      label: html`${row.name} <small>${row.cranes} cranes</small>`,
      value: perCrane(value)(row),
      tone: tone?.(row),
    })),
    { format: (v) => v.toFixed(1) },
  );

  return html`
    ${topicNav('fleets')}
    ${pageHeader('Fleets', 'Each crane batch side by side. Counts are per fleet, so larger fleets naturally have more.')}
    <article class="card flat">${responsiveTable([
      { label: 'Fleet', cell: (row) => html`<b>${row.name}</b>` },
      { label: 'Cranes', cell: (row) => row.cranes },
      { label: 'Down', cell: (row) => alertChip(row.down, 'bad') },
      { label: `PM ${fleet.month || ''} done`, cell: (row) => barWithText((row.pmDone / row.cranes) * 100, 'ok', `${row.pmDone}/${row.cranes}`) },
      { label: 'Open work requests', cell: (row) => row.openRequests },
      { label: 'Open P1', cell: (row) => alertChip(row.openP1, 'bad') },
      { label: 'Open PR / WO', cell: (row) => row.openJobs },
      { label: 'PMA / CF expired', cell: (row) => alertChip(row.expired, 'warn') },
      { label: 'Ropes pending', cell: (row) => row.pendingRopes },
    ], rows, 'ft')}</article>
    <div class="igrid">
      ${insightCard('Open work requests per crane', 'Average for each fleet', html`
        ${barsFor((r) => r.openRequests, (row) => (row.openP1 ? 'bad' : 'normal'))}
        ${caption(`Red bars have an open P1 request.${busiest?.openRequests ? ` ${busiest.name} has the most per crane.` : ''}`)}`)}
      ${insightCard('Open PR / WO per crane', 'Average for each fleet', barsFor((r) => r.openJobs, () => 'warn'))}
    </div>`;
}
