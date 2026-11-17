/** Starts the dashboard: connects the page's controls to the code behind them. */
import { exportCranes } from './data/exportAction.js';
import { canUpload, connectShared } from './data/shared.js';
import { preloadSheetJs } from './data/sheetjs.js';
import { loadSavedDataset, saveDataset } from './data/storage.js';
import { importWorkbook } from './data/upload.js';
import { craneIds, getCrane, hasDataset, onDatasetChange, setDataset } from './domain/dataset.js';
import { craneStatus } from './domain/crane.js';
import { findCranes } from './domain/search.js';
import { $, delegate, html, render } from './lib/dom.js';
import { crossfade, prefersReducedMotion } from './lib/motion.js';
import { initTheme, isDark, onThemeChange, setTheme } from './lib/theme.js';
import { renderCraneList } from './pages/cranes.js';
import { bindCraneEvents } from './pages/crane/index.js';
import { craneView } from './pages/crane/state.js';
import { goBack, redrawView, route } from './router.js';
import { setSceneTheme } from './scene/index.js';
import { updateThemeButton } from './ui/chrome.js';
import { chip, emptyNote } from './ui/components.js';
import { currentMessage, say } from './ui/message.js';
import { growList, setViewValue, view } from './ui/viewState.js';

const SUGGESTIONS = 12;

/* ---------- Home search ---------- */

function showSuggestions(query) {
  const typed = query.trim();
  $('#homebody').hidden = Boolean(typed);
  if (!typed) {
    $('#sug').innerHTML = '';
    return;
  }
  if (!hasDataset()) {
    render($('#sug'), emptyNote('Upload the live update file first.'));
    return;
  }
  const matches = findCranes(craneIds(), query, SUGGESTIONS);
  render($('#sug'), matches.length
    ? matches.map((id) => html`
        <a class="sug" href="#${id}"><b>${id}</b><span>${getCrane(id).fleet}</span>${chip(craneStatus(getCrane(id)))}</a>`)
    : emptyNote('No crane found. Check the number and try again.'));
}

function bindSearch() {
  $('#q').addEventListener('input', (event) => showSuggestions(event.target.value));
  $('#f').addEventListener('submit', (event) => {
    event.preventDefault();
    const [first] = findCranes(craneIds(), $('#q').value, 1);
    if (first) location.hash = first;
  });
}

/* ---------- Buttons that carry their meaning in data attributes ---------- */

function bindActions() {
  // data-set="key:value": a filter or view choice. Lists start again from their first rows.
  delegate(document, 'click', '[data-set]', (_event, button) => {
    const text = button.dataset.set;
    const split = text.indexOf(':');
    setViewValue(text.slice(0, split), text.slice(split + 1));
    crossfade(redrawView);
  });
  // data-more="key": "Show more" on a list.
  delegate(document, 'click', '[data-more]', (_event, button) => {
    growList(button.dataset.more, +button.dataset.step || 20);
    redrawView();
  });
  // data-jump="id": scroll to a section of the page.
  delegate(document, 'click', '[data-jump]', (_event, button) => {
    document.getElementById(button.dataset.jump)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  });
  // data-act="exall" | "exone": export to Excel.
  delegate(document, 'click', '[data-act]', (_event, button) => {
    if (!hasDataset()) return;
    exportCranes(button.dataset.act === 'exone' ? [craneView.id] : craneIds());
  });
  document.addEventListener('input', (event) => {
    if (event.target.id !== 'cq') return;
    view.cq = event.target.value;
    renderCraneList();
  });
  bindCraneEvents($('#detail'));
  $('#back').addEventListener('click', goBack);
}

/* ---------- Upload ---------- */

/** Some in-app views (a phone app's built-in browser) never open the file picker. Say so. */
function watchForBlockedPicker() {
  let timer = 0;
  const cancel = () => clearTimeout(timer);
  delegate(document, 'click', '.upbtn', () => {
    cancel();
    addEventListener('blur', cancel, { once: true });
    document.addEventListener('visibilitychange', cancel, { once: true });
    timer = setTimeout(
      () => say('The file picker did not open here. This app may block file uploads. Open the same link in Safari or Chrome, or upload from a computer. Everyone sees the upload either way.', 'bad'),
      1800,
    );
  });
  $('#file').addEventListener('change', cancel);
}

function bindUpload() {
  watchForBlockedPicker();
  const picker = $('#file');
  picker.addEventListener('change', () => {
    const [file] = picker.files;
    picker.value = '';
    if (file) importWorkbook(file);
  });
  // The upload button is a label so the file picker opens from a real tap; make it work from the keyboard too.
  document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList?.contains('upbtn')) {
      event.preventDefault();
      event.target.click();
    }
  });
  // Start fetching the Excel library as soon as someone reaches for the button.
  for (const type of ['pointerover', 'focusin', 'touchstart']) {
    delegate(document, type, '.upbtn', preloadSheetJs);
  }
}

/* ---------- Data sources ---------- */

/** What happens when a dataset arrives from this browser's saved copy or from shared storage. */
function useIncoming(dataset) {
  setDataset(dataset);
  saveDataset(dataset);
}

async function connectSharedStorage() {
  await connectShared({
    onDataset: (dataset) => {
      useIncoming(dataset);
      if (!canUpload()) say(`Updated to ${dataset.src}.`, 'ok');
      else if (currentMessage().kind === 'bad' && /shared data/i.test(currentMessage().text)) say('');
    },
    onMessage: say,
    onConnected: () => route(false),
  });
}

async function loadSavedCopy() {
  const saved = await loadSavedDataset();
  // Shared data may have arrived first; do not replace it with an older copy.
  if (saved && !hasDataset()) setDataset(saved);
}

/* ---------- Start ---------- */

export function startApp() {
  initTheme();
  onThemeChange((dark) => {
    updateThemeButton(dark);
    setSceneTheme(dark);
  });
  $('#theme').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    crossfade(() => setTheme(next));
  });

  bindSearch();
  bindActions();
  bindUpload();
  addEventListener('hashchange', () => crossfade(() => route(true)));
  onDatasetChange(() => route(false));

  route(false);
  connectSharedStorage();
  loadSavedCopy();
}
