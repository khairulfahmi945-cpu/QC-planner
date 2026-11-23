/** Which crane is open, which tab is showing and how much of each list is revealed. */
import { PAGE_SIZE } from '../../config.js';
import { getCrane } from '../../domain/dataset.js';
import { isOpenJob } from '../../domain/purchasing.js';
import { isOpenRequest } from '../../domain/workRequests.js';

export const craneView = {
  id: null,
  tab: 'sum',
  purchasingFilter: 'open',
  requestFilter: 'open',
  purchasingLimit: PAGE_SIZE.cranePurchasing.first,
  requestLimit: PAGE_SIZE.craneWorkRequests.first,
  oilLimit: PAGE_SIZE.craneOil.first,
  labLimit: PAGE_SIZE.craneOilLab.first,
};

/** Opens a crane on its Summary tab. Lists start on "Open" when the crane has open items. */
export function openCrane(id) {
  const crane = getCrane(id);
  Object.assign(craneView, {
    id,
    tab: 'sum',
    purchasingFilter: crane.pr.some(isOpenJob) ? 'open' : 'all',
    requestFilter: crane.wq.some(isOpenRequest) ? 'open' : 'all',
    purchasingLimit: PAGE_SIZE.cranePurchasing.first,
    requestLimit: PAGE_SIZE.craneWorkRequests.first,
    oilLimit: PAGE_SIZE.craneOil.first,
    labLimit: PAGE_SIZE.craneOilLab.first,
  });
}
