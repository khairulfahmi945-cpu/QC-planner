/** A table on wide screens that turns into labelled cards on a phone, so nothing scrolls sideways. */
import { cx, html } from '../lib/dom.js';

/**
 * @param {{label: string, cell: (row: any) => any, className?: string}[]} columns
 * @param {any[]} rows
 */
export const responsiveTable = (columns, rows, className) => html`
  <table class="${cx('rtb', className)}">
    <thead><tr>${columns.map((column) => html`<th>${column.label}</th>`)}</tr></thead>
    <tbody>${rows.map((row) => html`
      <tr>${columns.map((column) => html`
        <td data-l="${column.label}"${column.className ? html` class="${column.className}"` : ''}>${column.cell(row)}</td>`)}</tr>`)}
    </tbody>
  </table>`;
