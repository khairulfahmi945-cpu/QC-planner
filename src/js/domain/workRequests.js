/** Work requests. Criticality is the Priority column: Priority 1 is the most critical. */
import { UNRANKED_PRIORITY } from '../config.js';

export function priorityRank(request) {
  const match = /priority\s*(\d)/i.exec(request.pri || '');
  return match ? +match[1] : UNRANKED_PRIORITY;
}

/** "P2 · Major impact" for a short badge. Unranked requests show the sheet's own text. */
export function priorityLabel(request) {
  const rank = priorityRank(request);
  if (rank === UNRANKED_PRIORITY) return request.pri || '';
  if (/minor/i.test(request.pri)) return `P${rank} · Minor`;
  return /major/i.test(request.pri) ? `P${rank} · Major impact` : `P${rank}`;
}

export const priorityTone = (rank) => (rank === 1 ? 'bad' : rank === 2 ? 'warn' : 'ok');

export const isOpenRequest = (request) => !/clos|cancel|complet|reject/i.test(request.st || '');

export const openRequests = (crane) => crane.wq.filter(isOpenRequest);

/** The most critical open request's rank for a crane, or UNRANKED_PRIORITY when none is open. */
export const topPriority = (crane) =>
  Math.min(UNRANKED_PRIORITY, ...openRequests(crane).map(priorityRank));

export const hasOpenP1 = (crane) => topPriority(crane) === 1;
