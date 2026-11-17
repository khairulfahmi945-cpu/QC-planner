/** The one-line status message shown under the upload button (and in the empty state). */
import { html } from '../lib/dom.js';

let current = { text: '', kind: '' };

/** Shows a message. kind is '', 'ok' or 'bad'. */
export function say(text, kind = '') {
  current = { text: text || '', kind };
  document.querySelectorAll('.msg').forEach((element) => {
    element.textContent = current.text;
    element.className = `msg ${current.kind}`;
  });
}

export const currentMessage = () => current;

/** The message as markup, for pages that render it themselves. */
export const messageMarkup = () => html`<p class="msg ${current.kind}" role="status">${current.text}</p>`;
