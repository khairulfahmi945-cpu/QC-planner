/** The Insights topics: one page each, reached from the chips at the top of every topic page. */
import { html } from '../lib/dom.js';

export const TOPICS = [
  ['pm', 'PM'],
  ['work-requests', 'Work requests'],
  ['pr-wo', 'PR / WO'],
  ['wirerope', 'Wirerope'],
  ['certificates', 'Inspection'],
  ['oil', 'Oil'],
  ['fleets', 'Fleets'],
];

export const isTopic = (key) => TOPICS.some(([id]) => id === key);

export const topicNav = (current) => html`
  <nav class="topics" aria-label="Insight topics">${TOPICS.map(([id, label]) =>
    html`<a href="#${id}"${id === current ? html` aria-current="page"` : ''}>${label}</a>`)}
  </nav>`;
