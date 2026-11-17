/**
 * Which page is showing. The address (#pm, #Q45, ...) says what to show; this draws it, keeps the
 * header and navigation in step, and remembers where the reader was scrolled.
 */
import { getAlertSummary } from './domain/alerts.js';
import { getCrane, hasDataset } from './domain/dataset.js';
import { $, html, render } from './lib/dom.js';
import { isDark } from './lib/theme.js';
import { renderCraneBody, renderCraneHeader, craneSceneOptions } from './pages/crane/index.js';
import { craneView, openCrane } from './pages/crane/state.js';
import { afterHomeRender, renderHome } from './pages/home.js';
import { viewFor } from './pages/index.js';
import { showScene } from './scene/index.js';
import { updateChrome } from './ui/chrome.js';
import { isTopic } from './ui/topics.js';

const HOME_SCENE = { id: 'QC', sub: 'Quay crane', down: false };

const state = {
  page: 'home', // 'home', 'crane', or a key of the views
  lastTopic: 'pm', // the Insights topic last visited
  cameFrom: 'home', // the page a crane was opened from, for the Back button
  scroll: {}, // scroll position by page, restored when coming back from a crane
};

export const currentPage = () => state.page;

/** Reads the address. A malformed one counts as Home. */
function readAddress() {
  let text = '';
  try {
    text = decodeURIComponent(location.hash.slice(1));
  } catch {
    /* "#%E0%A4%A" and the like */
  }
  return { key: text.toLowerCase(), id: text.toUpperCase() };
}

function drawView(animate) {
  const element = $('#view');
  element.classList.toggle('still', !animate);
  const view = viewFor(state.page);
  if (!hasDataset() && state.page !== 'data') {
    render(element, html`
      <div class="phead"><h2>No data loaded yet</h2></div>
      <article class="card empty-state"><p>Open the Data page to upload the latest LIVE UPDATE file.</p><div class="tools"><a class="btn pri" href="#data">Go to Data</a></div></article>`);
    return;
  }
  render(element, view.render());
  view.after?.();
}

function drawHome() {
  const body = $('#homebody');
  render(body, renderHome());
  afterHomeRender(body);
  showScene($('#hero'), $('#gl1'), HOME_SCENE, isDark());
}

function drawCrane() {
  // Opening a crane clears the search box on Home.
  $('#q').value = '';
  $('#sug').innerHTML = '';
  $('#homebody').hidden = false;
  render($('#dhead'), renderCraneHeader());
  render($('#dbody'), renderCraneBody());
  showScene($('#banner'), $('#gl2'), craneSceneOptions(), isDark());
}

function navKeyFor(page) {
  if (page === 'home') return 'home';
  return page === 'crane' ? 'cranes' : viewFor(page).nav;
}

/** Which page an address asks for. Cranes win over named pages; anything unknown is Home. */
function resolvePage(key, id) {
  if (hasDataset() && getCrane(id)) return 'crane';
  return viewFor(key) ? key : 'home';
}

const showAreas = (page) => {
  $('#home').hidden = page !== 'home';
  $('#view').hidden = page === 'home' || page === 'crane';
  $('#detail').hidden = page !== 'crane';
};

function refreshChrome() {
  const onCrane = state.page === 'crane';
  updateChrome({
    navKey: navKeyFor(state.page),
    lastTopic: state.lastTopic,
    title: onCrane ? `${craneView.id} · ${getCrane(craneView.id).fleet || 'Crane'}` : '',
    pageName: onCrane ? craneView.id : state.page !== 'home' && $('#view h2')?.textContent,
    showBack: onCrane,
    alertCount: hasDataset() ? getAlertSummary().redCount : 0,
  });
}

/** Coming back from a crane returns to where the list was; any other move starts at the top. */
function restoreScroll(previous) {
  const returning = previous === 'crane' && state.page === state.cameFrom && state.scroll[state.page] != null;
  window.scrollTo(0, returning ? state.scroll[state.page] : 0);
}

/**
 * Draws whatever the address asks for.
 * @param {boolean} navigated true when the address changed; false to redraw the same page
 *   (for example when new data arrives)
 */
export function route(navigated) {
  const { key, id } = readAddress();
  const previous = state.page;
  if (navigated) state.scroll[previous] = window.scrollY;

  state.page = resolvePage(key, id);
  if (isTopic(state.page)) state.lastTopic = state.page;
  if (state.page === 'crane' && previous !== 'crane') state.cameFrom = previous;
  showAreas(state.page);

  if (state.page === 'home') {
    drawHome();
  } else if (state.page === 'crane') {
    if (navigated || craneView.id !== id) openCrane(id);
    drawCrane();
  } else {
    drawView(navigated);
  }

  refreshChrome();
  if (navigated) {
    restoreScroll(previous);
    // Keyboard and screen-reader focus follows the reader to the new page.
    $('main').focus({ preventScroll: true });
  }
}

/** Redraws the page the reader is on, with no entrance animation (filters, "show more"). */
export const redrawView = () => drawView(false);

/** The Back button on a crane page returns to where the crane was opened from. */
export function goBack() {
  location.hash = state.cameFrom === 'home' || state.cameFrom === 'crane' ? '' : state.cameFrom;
}
