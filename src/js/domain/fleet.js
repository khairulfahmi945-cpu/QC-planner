/**
 * Everything fleet-wide that more than one page needs, worked out once per upload and day.
 * Pages read this instead of looping over the cranes themselves.
 */
import { todayIso } from '../lib/dates.js';
import { craneIds, dataYear, getCrane, getDataset } from './dataset.js';
import { isDown, isOperating, nextInspection, pmaDaysLeft, pmaStatus, pmStateIn } from './crane.js';
import { completeStreak, completionByMonth, currentPmMonth } from './pm.js';
import { isOpenRequest, priorityRank } from './workRequests.js';
import { isOpenJob, jobAmount, jobGroup } from './purchasing.js';
import { ropeType, ropesNearLimit } from './wirerope.js';
import { oilDate } from './oil.js';

const byDaysLeft = (a, b) => pmaDaysLeft(getCrane(a)) - pmaDaysLeft(getCrane(b));

/** A job shared by several cranes is listed once, with every crane it belongs to. */
function collectJobs(ids) {
  const byKey = new Map();
  const jobs = [];
  for (const id of ids) {
    for (const job of getCrane(id).pr) {
      const key = `${job.wo}|${job.pr}|${job.j}|${job.d}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { job, ids: [], group: jobGroup(job) };
        byKey.set(key, entry);
        jobs.push(entry);
      }
      if (!entry.ids.includes(id)) entry.ids.push(id);
    }
  }
  return jobs;
}

function tally(entries, keyOf, valueOf = () => 1) {
  const totals = {};
  for (const entry of entries) totals[keyOf(entry)] = (totals[keyOf(entry)] || 0) + valueOf(entry);
  return totals;
}

function groupByFleet(ids) {
  const fleets = {};
  for (const id of ids) (fleets[getCrane(id).fleet || 'Other'] ||= []).push(id);
  return fleets;
}

export function summarizeFleet() {
  const ids = craneIds();
  const cranes = ids.map(getCrane);
  const month = currentPmMonth(cranes, dataYear());

  const pm = { done: [], plan: [], pend: [], none: [] };
  for (const id of ids) pm[pmStateIn(getCrane(id), month)].push(id);
  const pmByMonth = completionByMonth(cranes);

  const requests = ids.flatMap((id) => getCrane(id).wq.map((request) => ({ id, ...request })));
  const openRequests = requests.filter(isOpenRequest);
  const requestsByRank = [1, 2, 3].map((rank) => openRequests.filter((r) => priorityRank(r) === rank).length);
  requestsByRank.push(openRequests.length - requestsByRank.reduce((a, b) => a + b, 0)); // no priority

  const jobs = collectJobs(ids);
  const openJobs = jobs.filter((entry) => isOpenJob(entry.job));

  const ropeJobs = ids.flatMap((id) =>
    getCrane(id).wr.map((job) => ({ id, type: ropeType(job.j), ...job })),
  );

  const certificates = { valid: [], due: [], expired: [], none: [] };
  for (const id of ids) certificates[pmaStatus(getCrane(id))].push(id);
  certificates.expired.sort(byDaysLeft);
  certificates.due.sort(byDaysLeft);

  const inspections = ids
    .map((id) => ({ id, ...nextInspection(getCrane(id)) }))
    .filter((entry) => entry.quarter);

  return {
    ids,
    cranes,
    count: ids.length,
    month,
    downIds: ids.filter((id) => isDown(getCrane(id))),
    operatingCount: cranes.filter(isOperating).length,
    pm,
    pmByMonth,
    completeStreak: completeStreak(pmByMonth, month),
    requests,
    openRequests,
    requestsByRank,
    jobs,
    jobCounts: tally(jobs, (e) => e.group),
    jobValues: tally(jobs, (e) => e.group, (e) => jobAmount(e.job)),
    openJobs,
    openJobValue: openJobs.reduce((sum, e) => sum + jobAmount(e.job), 0),
    ropeJobs,
    pendingRopeJobs: ropeJobs.filter((job) => /pend/i.test(job.js)),
    doneRopeJobs: ropeJobs.filter((job) => /done|complete/i.test(job.js)),
    ropesNearLimit: ropesNearLimit(ids.map((id) => [id, getCrane(id)])),
    certificates,
    inspections,
    overdueInspections: inspections
      .filter((entry) => entry.daysLeft !== null && entry.daysLeft < 0)
      .sort((a, b) => a.daysLeft - b.daysLeft),
    oilJobs: ids.flatMap((id) => getCrane(id).oil.map((job) => ({ id, date: oilDate(job), ...job }))),
    couplings: ids.filter((id) => getCrane(id).sos).map((id) => ({ id, ...getCrane(id).sos })),
    fleets: groupByFleet(ids),
  };
}

let cache = { dataset: null, day: '', fleet: null };

/** The fleet summary for the current dataset. Recomputed when the data or the day changes. */
export function getFleet() {
  const dataset = getDataset();
  const day = todayIso();
  if (cache.dataset !== dataset || cache.day !== day || !cache.fleet) {
    cache = { dataset, day, fleet: summarizeFleet() };
  }
  return cache.fleet;
}
