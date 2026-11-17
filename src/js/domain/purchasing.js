/** PR / WO jobs from the PR sheet. */
import { parseNumber } from '../lib/format.js';

const FINISHED = /complete|clos|done|cancel/i;

/** Open means it has a status that is not completed, closed or cancelled. */
export const isOpenJob = (job) => Boolean(job.st) && !FINISHED.test(job.st);

/** 'done' | 'open' | 'other' (cancelled, returned or no status). */
export function jobCategory(job) {
  if (/complete|clos|done/i.test(job.st)) return 'done';
  return isOpenJob(job) ? 'open' : 'other';
}

/** Finer grouping used for the value breakdown. */
export function jobGroup(job) {
  const status = job.st;
  if (/complete|clos|done/i.test(status)) return 'done';
  if (/cancel/i.test(status)) return 'cancel';
  if (/return/i.test(status)) return 'returned';
  if (/plan|progress/i.test(status)) return 'plan';
  if (/open/i.test(status)) return 'open';
  return status ? 'other' : 'none';
}

/** The amount in MYR from the RM column. Zero when the cell is empty or not an MYR amount. */
export function jobAmount(job) {
  if (!/MYR/i.test(job.rm || '')) return 0;
  return parseNumber(String(job.rm).replace(/MYR/i, '')) || 0;
}
