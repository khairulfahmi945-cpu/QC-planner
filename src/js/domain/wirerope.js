/** Wirerope jobs and the SANY update sheet. */
import { THRESHOLDS } from '../config.js';
import { parseNumber } from '../lib/format.js';

export function ropeType(jobDescription) {
  const text = String(jobDescription || '').toUpperCase();
  if (/CATENARY/.test(text)) return 'Catenary';
  if (/TROLLEY/.test(text)) return 'Trolley';
  if (/BOOM/.test(text)) return 'Boom';
  return /HOIST/.test(text) ? 'Main hoist' : 'Other';
}

export const ROPE_TYPES = ['Main hoist', 'Trolley', 'Catenary', 'Boom', 'Other'];

/** 'bad' at the limit, 'warn' when close, 'normal' otherwise. */
export function ropeTone(percentOfLimit) {
  if (percentOfLimit >= THRESHOLDS.ropeLimitPct) return 'bad';
  return percentOfLimit >= THRESHOLDS.ropeWatchPct ? 'warn' : 'normal';
}

/** Moves so far as a percent of the recommended moves. Null when either number is missing. */
export function ropeLifeUsed(currentMoves, recommendedMoves) {
  const current = parseNumber(currentMoves);
  const recommended = parseNumber(recommendedMoves);
  return current && recommended ? (current / recommended) * 100 : null;
}

/**
 * Ropes that are not yet replaced, with how close each is to its limit, most worn first.
 * Comes from pending wirerope jobs and from SANY rows that are not completed.
 */
export function ropesNearLimit(cranes) {
  const list = [];
  for (const [id, crane] of cranes) {
    for (const job of crane.wr) {
      const current = parseNumber(job.cur);
      const limit = parseNumber(job.rec);
      if (/pend/i.test(job.js) && current && limit) {
        list.push({ id, type: ropeType(job.j), current, limit, pct: (current / limit) * 100, note: job.mo || '', sany: false });
      }
    }
    for (const rope of crane.sany) {
      const current = parseNumber(rope.cur);
      const limit = parseNumber(rope.lim);
      if (current && limit && !/complete|done/i.test(rope.st)) {
        list.push({ id, type: rope.ty || 'Wirerope', current, limit, pct: (current / limit) * 100, note: rope.st || '', sany: true });
      }
    }
  }
  return list.sort((a, b) => b.pct - a.pct);
}
