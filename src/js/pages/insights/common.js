/** Pieces several Insights pages share. */
import { html } from '../../lib/dom.js';
import { monthShortFromKey, yearFromKey } from '../../lib/dates.js';

/** Axis label for a month key: the month, with the year under January and under the first bar. */
export const monthAxisLabel = (key, index) =>
  html`${monthShortFromKey(key)}${index === 0 || key.slice(5) === '01' ? html`<small>${yearFromKey(key)}</small>` : ''}`;
