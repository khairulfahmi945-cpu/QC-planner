/** Charts drawn with plain HTML and CSS: bars, meters, rings. */
import { cx, html, raw } from '../lib/dom.js';
import { formatNumber } from '../lib/format.js';

/** Fill tones and the CSS class that paints each. */
const FILL = {
  ok: 's-ok', warn: 's-wn', bad: 's-bd', normal: 's-tl', muted: 's-mu', pending: 's-pd', none: 's-no',
};
export const fillClass = (tone) => FILL[tone] || FILL.normal;

/** A bar made of one or more segments. segments: [{pct, tone, digits?}] drawn as given. */
export const meterSegments = (segments) => html`
  <div class="meter">${segments.map(({ pct, tone, digits = 1 }) =>
    html`<i class="${fillClass(tone)}" style="--w:${pct.toFixed(digits)}%"></i>`)}</div>`;

/** A bar split into parts of a total. parts: [[value, tone], ...]; parts of zero are skipped. */
export const meter = (parts, total) =>
  meterSegments(
    parts
      .filter(([value]) => value > 0)
      .map(([value, tone]) => ({ pct: (value / Math.max(1e-9, total)) * 100, tone, digits: 2 })),
  );

/** A one-segment bar capped at 100%. */
export const progressBar = (pct, tone, digits = 1) =>
  meterSegments([{ pct: Math.min(100, pct), tone, digits }]);

/** A small bar with a number after it, for table cells. */
export const barWithText = (pct, tone, text, digits = 0) =>
  html`<div class="tm">${progressBar(pct, tone, digits)}${text}</div>`;

/**
 * Horizontal bars, one per item, scaled to the largest.
 * items: [{label, value, tone?, href?}]; label may be text or markup.
 */
export function horizontalBars(items, { format = formatNumber, tone = 'normal' } = {}) {
  const largest = Math.max(1e-9, ...items.map((item) => item.value));
  return html`<div class="hbars">${items.map((item) => {
    const inner = html`
      <span>${item.label}</span><b>${format(item.value, item)}</b>
      ${meterSegments([{ pct: (item.value / largest) * 100, tone: item.tone || tone }])}`;
    return item.href
      ? html`<a class="hb" href="${item.href}">${inner}</a>`
      : html`<div class="hb">${inner}</div>`;
  })}</div>`;
}

/**
 * Horizontal bars with a text value, each made of coloured segments measured against one scale.
 * rows: [{label, text, segments: [{value, tone}]}]
 */
export const segmentBars = (rows, scale) => html`
  <div class="hbars">${rows.map(({ label, text, segments }) => html`
    <div class="hb"><span>${label}</span><b>${text}</b>${meterSegments(
      segments.map(({ value, tone }) => ({ pct: (value / scale) * 100, tone })),
    )}</div>`)}
  </div>`;

/**
 * Vertical bars.
 * items: [{label, top, height, current?, title?, tone?, stack?: {pct, tone}}]
 *   height is a percent of the chart; stack paints the top `pct` of the bar in another tone.
 */
export function verticalBars(items, { description, wideLabels = false } = {}) {
  return html`
    <div class="${cx('vbars', wideLabels && 'yr', items.length > 12 && 'dense')}" role="img" aria-label="${description}">
      ${items.map((item, index) => html`
        <div class="${cx('vb', item.current && 'cur')}" title="${item.title || ''}">
          <b>${item.top}</b>
          <i class="${cx(item.stack && 'st', item.tone && fillClass(item.tone))}" style="--h:${Math.max(0, item.height).toFixed(1)}%;--i:${index}">${
            item.stack ? raw(`<u class="${fillClass(item.stack.tone)}" style="height:${item.stack.pct.toFixed(1)}%"></u>`) : ''}</i>
          <span>${item.label}</span>
        </div>`)}
    </div>`;
}

/** A ring showing a share, with the number counted up in the middle. */
export function ring(percent, fraction, label) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, fraction)));
  return html`
    <div class="ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="${radius}" class="trk"/>
        <circle cx="60" cy="60" r="${radius}" class="val" style="--c:${circumference.toFixed(1)};--o:${offset.toFixed(1)}"/>
      </svg>
      <div class="rc"><b data-n="${percent}">${percent}</b><small>%</small><span>${label}</span></div>
    </div>`;
}
