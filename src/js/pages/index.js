/**
 * Every page that renders into the main area, by the address that opens it (#pm, #cranes, ...).
 * standalone pages do not need the LIVE UPDATE data (they have their own file).
 * nav names the item in the bottom bar / header that stays highlighted for the page.
 * Home and a single crane have their own areas and are handled by the router.
 */
import { renderAlerts } from './alerts.js';
import { renderCraneList, renderCranes } from './cranes.js';
import { renderDataPage } from './dataPage.js';
import { renderFleets } from './insights/fleets.js';
import { renderInspection } from './insights/inspection.js';
import { renderOil } from './insights/oil.js';
import { renderOilLab } from './insights/oilLab.js';
import { renderPm } from './insights/pm.js';
import { renderPurchasing } from './insights/purchasing.js';
import { renderWirerope } from './insights/wirerope.js';
import { renderWorkRequests } from './insights/workRequests.js';

const VIEWS = {
  attention: { nav: 'attention', render: renderAlerts },
  pm: { nav: 'insights', render: renderPm },
  'work-requests': { nav: 'insights', render: renderWorkRequests },
  'pr-wo': { nav: 'insights', render: renderPurchasing },
  wirerope: { nav: 'insights', render: renderWirerope },
  certificates: { nav: 'insights', render: renderInspection },
  oil: { nav: 'insights', render: renderOil },
  'oil-lab': { nav: 'insights', render: renderOilLab, standalone: true },
  fleets: { nav: 'insights', render: renderFleets },
  cranes: { nav: 'cranes', render: renderCranes, after: renderCraneList },
  data: { nav: 'data', render: renderDataPage },
};

/** The view for an address key, or null. Own keys only, so "#constructor" is not a page. */
export const viewFor = (key) => (Object.prototype.hasOwnProperty.call(VIEWS, key) ? VIEWS[key] : null);
