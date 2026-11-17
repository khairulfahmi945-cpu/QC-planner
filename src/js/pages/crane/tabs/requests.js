import { UNRANKED_PRIORITY } from '../../../config.js';
import {
  isOpenRequest, priorityLabel, priorityRank, priorityTone,
} from '../../../domain/workRequests.js';
import { cx, html } from '../../../lib/dom.js';
import { formatDate } from '../../../lib/dates.js';
import {
  chip, chipRow, detailList, detailRow, emptyNote,
} from '../../../ui/components.js';
import { craneView } from '../state.js';

const FILTERS = [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']];

export function renderRequests(crane) {
  const requests = [...crane.wq].sort((a, b) =>
    Number(isOpenRequest(b)) - Number(isOpenRequest(a))
    || priorityRank(a) - priorityRank(b)
    || String(b.d).localeCompare(String(a.d)));
  const groups = {
    open: requests.filter(isOpenRequest),
    closed: requests.filter((request) => !isOpenRequest(request)),
    all: requests,
  };
  const shown = groups[craneView.requestFilter] || requests;
  const filters = html`
    <div class="seg">${FILTERS.map(([key, label]) => html`
      <button data-wq="${key}" aria-pressed="${String(craneView.requestFilter === key)}">${label} (${groups[key].length})</button>`)}
    </div>`;
  if (!shown.length) return html`${filters}${emptyNote('No work requests in this view.')}`;

  const left = shown.length - craneView.requestLimit;
  return html`
    ${filters}
    ${shown.slice(0, craneView.requestLimit).map((request) => {
      const rank = priorityRank(request);
      return html`
        <article class="${cx('card', rank < UNRANKED_PRIORITY && `crit-${rank}`)}">
          <h3>${request.ds || 'No description'}</h3>
          ${chipRow(chip(priorityLabel(request), priorityTone(rank)), chip(request.st), chip(request.ty))}
          ${detailList(
            detailRow('Criticality', request.pri),
            detailRow('Work request', request.no),
            detailRow('Date', formatDate(request.d) + (request.tm ? `, ${request.tm}` : '')),
            detailRow('Equipment code', request.code),
            detailRow('Work order', request.wo),
            detailRow('WO status', request.wos),
            detailRow('Remark', request.rm),
          )}
        </article>`;
    })}
    ${left > 0 ? html`<button class="more" id="moreq">Show more (${left} left)</button>` : ''}`;
}
