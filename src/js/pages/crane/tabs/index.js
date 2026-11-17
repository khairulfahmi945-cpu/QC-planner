/** The tabs of the crane page, in the order they are shown. count() is the small number beside the label. */
import { isOpenJob } from '../../../domain/purchasing.js';
import { openRequests } from '../../../domain/workRequests.js';
import { renderInspection } from './inspection.js';
import { renderOil } from './oil.js';
import { renderPm } from './pm.js';
import { renderPurchasing } from './purchasing.js';
import { renderRequests } from './requests.js';
import { renderSummary } from './summary.js';
import { renderWirerope } from './wirerope.js';

export const CRANE_TABS = [
  { id: 'sum', label: 'Summary', count: () => '', render: renderSummary },
  { id: 'pm', label: 'PM', count: (c) => c.pm.length, render: renderPm },
  { id: 'pr', label: 'PR / WO', count: (c) => `${c.pr.filter(isOpenJob).length} open`, render: renderPurchasing },
  { id: 'wq', label: 'Work request', count: (c) => `${openRequests(c).length} open`, render: renderRequests },
  { id: 'wr', label: 'Wirerope', count: (c) => c.wr.length + c.sany.length, render: renderWirerope },
  { id: 'ins', label: 'Inspection', count: () => '', render: renderInspection },
  { id: 'oil', label: 'Oil', count: (c) => c.oil.length, render: renderOil },
];
