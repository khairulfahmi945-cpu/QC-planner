/** The Alerts page: everything that needs someone to act, grouped by reason. */
import { PAGE_SIZE } from '../config.js';
import { getAlertSummary } from '../domain/alerts.js';
import { html } from '../lib/dom.js';
import { listRows, pageHeader, sectionHeader } from '../ui/components.js';
import { isExpanded } from '../ui/viewState.js';

const jumpButtons = (sections) => html`
  <div class="filters" role="group" aria-label="Jump to a section">${sections.map((section) => html`
    <button type="button" data-jump="a-${section.key}">${section.shortTitle} <small>${section.rows.length}</small></button>`)}
  </div>`;

function alertSection(section) {
  const limit = isExpanded(section.key) ? section.rows.length : PAGE_SIZE.alertsPreview;
  return html`
    <section class="asec" id="a-${section.key}">
      ${sectionHeader(section.title, section.rows.length)}
      ${listRows(section.rows.slice(0, limit), (row) => row.tone || section.tone)}
      ${section.rows.length > limit
        ? html`<button type="button" class="more" data-set="ao-${section.key}:1">Show all ${section.rows.length}</button>`
        : ''}
    </section>`;
}

export function renderAlerts() {
  const { sections, craneCount, redCount } = getAlertSummary();
  if (!sections.length) return pageHeader('Alerts', 'Nothing needs attention in the current file.');
  return html`
    ${pageHeader('Alerts', `${craneCount} cranes have something to act on. ${redCount} of them have a red alert.`)}
    ${jumpButtons(sections)}
    ${sections.map(alertSection)}`;
}
