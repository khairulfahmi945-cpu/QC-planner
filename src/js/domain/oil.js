/** Oil jobs. The sheet describes them as "OIL SAMPLING : <parts> OIL REPLACEMENT : <parts>". */
import { isIsoDate } from '../lib/dates.js';

const JOB_PATTERN = /OIL\s+SAMPLING\s*:?\s*(.*?)\s*OIL\s+REPLACEMENT\s*:?\s*(.*)$/i;
const MAX_PART_LENGTH = 24;

function splitParts(text) {
  return String(text || '')
    .toUpperCase()
    .split(/[/,&+]|\bAND\b/)
    .map((part) => part.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => part && part.length <= MAX_PART_LENGTH);
}

/** Which components were sampled and which had their oil replaced. */
export function oilParts(description) {
  const match = JOB_PATTERN.exec(description || '');
  return match ? { sampled: splitParts(match[1]), replaced: splitParts(match[2]) } : { sampled: [], replaced: [] };
}

/** The completed date, or the plan date when there is no completed one. */
export const oilDate = (job) => (isIsoDate(job.c) ? job.c : isIsoDate(job.d) ? job.d : '');
