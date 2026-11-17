/** Small building blocks shared by every page. Each returns escaped markup (see lib/dom.js). */
import { cx, html, isBlank } from '../lib/dom.js';

/** A reasonable chip colour for a status word from the sheets ("DONE", "LONG DOWN", "WAITING PO"). */
export function statusTone(text) {
  if (/long down|exceed|reject|expired|overdue|not avail/i.test(text)) return 'bad';
  if (/^ops$|complete|done|closed|available|valid/i.test(text)) return 'ok';
  if (/open|pend|wait|due|progress|partial|sched|plan/i.test(text)) return 'warn';
  return '';
}

/** Draws nothing for empty text, so `chip(x) || '–'` gives a fallback. */
export function chip(text, tone) {
  if (!text) return '';
  return html`<span class="${cx('chip', tone || statusTone(text))}">${text}</span>`;
}

export const chipRow = (...chips) => html`<div class="chips">${chips}</div>`;

/** One "label  value" line. Left out when the value is empty. */
export const detailRow = (label, value) =>
  isBlank(value) ? '' : html`<div class="kv"><dt>${label}</dt><dd>${value}</dd></div>`;

export const detailList = (...rows) => html`<dl>${rows}</dl>`;

export const emptyNote = (text) => html`<p class="empty">${text}</p>`;

/** A card on the Insights pages. */
export const insightCard = (title, subtitle, body, { wide = false } = {}) => html`
  <article class="${cx('card', 'ins', wide && 'wide')}">
    <h3>${title}</h3>
    ${subtitle ? html`<p class="sub">${subtitle}</p>` : ''}
    ${body}
  </article>`;

export const caption = (text) => html`<p class="cap">${text}</p>`;

export const subheading = (text) => html`<h4>${text}</h4>`;

/** Page title with an optional line under it. */
export const pageHeader = (title, intro) => html`
  <div class="phead">
    <h2>${title}</h2>
    ${intro ? html`<p>${intro}</p>` : ''}
  </div>`;

/** Section title with a count beside it. */
export const sectionHeader = (title, count) => html`
  <div class="sech"><h3>${title}</h3><small>${count}</small></div>`;

/** A row of headline numbers. items: [value, label, tone?] */
export const keyFigures = (items) => html`
  <div class="kstrip">${items.map(([value, label, tone]) => html`
    <div class="${tone ? `k-${tone}` : ''}"><b>${value}</b><span>${label}</span></div>`)}
  </div>`;

/** A coloured dot and label, then a number (legends, group headings). */
export const legend = (items) => html`
  <div class="lg">${items.map(([label, value, fill]) => html`
    <span><i class="${fill}"></i>${label}${value === '' || value == null ? '' : html` <b>${value}</b>`}</span>`)}
  </div>`;

/** A link to a crane, as a list row. */
export const listRow = ({ id, title, detail, value, tone }) => html`
  <a class="${cx('row', tone)}" href="#${id}">
    <b class="rid">${id}</b>
    <div class="rb"><p class="rm">${title}</p>${detail ? html`<p class="rs">${detail}</p>` : ''}</div>
    ${value ? html`<span class="rv">${value}</span>` : html`<span class="go" aria-hidden="true">›</span>`}
  </a>`;

export const listRows = (rows, toneOf) =>
  html`<div class="rows">${rows.map((row) => listRow({ ...row, tone: toneOf ? toneOf(row) : row.tone }))}</div>`;

/** A crane id that links to its page. */
export const craneLink = (id) => html`<a class="cid" href="#${id}">${id}</a>`;

/** "Show N more (M left)" button. `key` names the list in the view state. */
export const showMoreButton = (key, left, step) =>
  left > 0
    ? html`<button type="button" class="more" data-more="${key}" data-step="${step}">Show ${Math.min(step, left)} more (${left} left)</button>`
    : '';

/** A button that sets one view-state value (a filter, a view mode). */
export const choiceButton = ({ key, value, label, count, pressed }) => html`
  <button type="button" data-set="${key}:${value}" aria-pressed="${String(Boolean(pressed))}">${label}${count == null ? '' : html` <small>${count}</small>`}</button>`;

export const choiceGroup = (label, choices, className = 'filters') =>
  html`<div class="${className}" role="group" aria-label="${label}">${choices.map(choiceButton)}</div>`;

/** Small crane chips that link to the crane, optionally with a note (a date, a status). */
export const craneChips = (items) => html`
  <div class="cchips">${items.map(({ id, note, down, title }) => html`
    <a class="${cx('cchip', down && 'dn')}" href="#${id}"${title ? html` title="${title}"` : ''}>${id}${note ? html`<small>${note}</small>` : ''}</a>`)}
  </div>`;

/** A card telling the reader there is nothing to show yet (or that a sheet is missing). */
export const emptyStateCard = (body, title = 'No data loaded yet') => html`
  <article class="card empty-state"><h3>${title}</h3><p>${body}</p></article>`;
