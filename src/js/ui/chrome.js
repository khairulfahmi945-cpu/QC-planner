/** The parts of the page that stay put: header title, back button, navigation and theme button. */
import { APP_NAME } from '../config.js';
import { $, $$ } from '../lib/dom.js';

/**
 * @param {{navKey: string, lastTopic: string, title?: string, showBack: boolean, alertCount: number}} state
 */
export function updateChrome({ navKey, lastTopic, title, showBack, alertCount }) {
  for (const link of $$('#nav a')) {
    if (link.dataset.n === navKey) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  // The Insights item reopens the topic the reader was last on.
  $('#nins').setAttribute('href', `#${lastTopic}`);

  const badge = $('#nbadge');
  badge.textContent = alertCount;
  badge.hidden = !alertCount;

  $('#back').hidden = !showBack;
  $('.bar h1').textContent = title || APP_NAME;
}

/** Shows which theme the button will switch to. */
export function updateThemeButton(dark) {
  $('#theme').classList.toggle('is-dark', dark);
  $('#thl').textContent = dark ? 'Light' : 'Dark';
  $('#theme').setAttribute('aria-pressed', dark);
}
