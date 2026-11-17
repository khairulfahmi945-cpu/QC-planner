/** One crane: a 3D banner with its status, then tabs. */
import { describeUpload, getCrane } from '../../domain/dataset.js';
import { craneStatus, isDown } from '../../domain/crane.js';
import { priorityTone, topPriority } from '../../domain/workRequests.js';
import { PAGE_SIZE, UNRANKED_PRIORITY } from '../../config.js';
import { $, cx, delegate, html, render } from '../../lib/dom.js';
import { chip } from '../../ui/components.js';
import { CRANE_TABS } from './tabs/index.js';
import { craneView } from './state.js';

/** The banner (its 3D scene is mounted by the caller) and the export button. */
export function renderCraneHeader() {
  const id = craneView.id;
  const crane = getCrane(id);
  const down = isDown(crane);
  const top = topPriority(crane);
  return html`
    <div class="banner" id="banner">
      <div class="gl" id="gl2"></div><div class="shade"></div><span class="drag">Drag to rotate</span>
      <div class="plate">
        <span class="pid">${id}</span>
        <div>
          <div class="fl">${crane.fleet || 'Fleet not listed'}</div>
          ${chip(craneStatus(crane))}${top < UNRANKED_PRIORITY ? chip(`P${top} open WR`, priorityTone(top)) : ''}<span class="${cx('mode', down && 'down')}"><i></i>${down ? 'Boom up, crane parked' : 'Working cycle'}</span>
          <div class="upd">Data updated ${describeUpload()}</div>
        </div>
      </div>
    </div>
    <button class="btn" data-act="exone" type="button">Export ${id} (Excel)</button>`;
}

/** What the 3D scene needs to know about this crane. */
export function craneSceneOptions() {
  const crane = getCrane(craneView.id);
  return { id: craneView.id, sub: crane.fleet || '', down: isDown(crane), close: true };
}

export function renderCraneBody() {
  const crane = getCrane(craneView.id);
  const tab = CRANE_TABS.find((t) => t.id === craneView.tab) || CRANE_TABS[0];
  return html`
    <div class="tabs" role="tablist">${CRANE_TABS.map((t) => {
      const count = t.count(crane);
      return html`<button role="tab" data-t="${t.id}" aria-selected="${String(craneView.tab === t.id)}">${t.label}${count !== '' ? html`<small>${count}</small>` : ''}</button>`;
    })}</div>
    <div role="tabpanel" id="panel">${tab.render(crane)}</div>`;
}

export const redrawCraneBody = () => render($('#dbody'), renderCraneBody());

/** Tab clicks, list filters and "Show more" buttons. */
export function bindCraneEvents(root) {
  delegate(root, 'click', '[data-t]', (_event, button) => {
    craneView.tab = button.dataset.t;
    redrawCraneBody();
    const body = $('#dbody');
    if (body.getBoundingClientRect().top < 0) body.scrollIntoView({ block: 'start' });
  });
  delegate(root, 'click', '[data-pr]', (_event, button) => {
    craneView.purchasingFilter = button.dataset.pr;
    craneView.purchasingLimit = PAGE_SIZE.cranePurchasing.first;
    redrawCraneBody();
  });
  delegate(root, 'click', '[data-wq]', (_event, button) => {
    craneView.requestFilter = button.dataset.wq;
    craneView.requestLimit = PAGE_SIZE.craneWorkRequests.first;
    redrawCraneBody();
  });
  const grow = (selector, key, step) => delegate(root, 'click', selector, () => {
    craneView[key] += step;
    redrawCraneBody();
  });
  grow('#more', 'purchasingLimit', PAGE_SIZE.cranePurchasing.step);
  grow('#moreq', 'requestLimit', PAGE_SIZE.craneWorkRequests.step);
  grow('#moreo', 'oilLimit', PAGE_SIZE.craneOil.step);
}
