/** Light / dark mode. No saved choice means "follow the device". */
import { STORAGE } from '../config.js';

const root = document.documentElement;
const deviceQuery = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

export const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : deviceQuery.matches);

const read = () => {
  try {
    const saved = localStorage.getItem(STORAGE.themeKey);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
};

const save = (theme) => {
  try {
    localStorage.setItem(STORAGE.themeKey, theme);
  } catch {
    /* Storage can be blocked. The choice then lasts for this visit only. */
  }
};

let lastValue = null;
const notify = () => {
  const dark = isDark();
  if (dark === lastValue) return;
  lastValue = dark;
  listeners.forEach((listener) => listener(dark));
};

/** Calls listener(isDark) now and whenever the theme changes. */
export function onThemeChange(listener) {
  listeners.add(listener);
  lastValue = isDark();
  listener(lastValue);
}

export function setTheme(theme) {
  save(theme);
  root.dataset.theme = theme;
  notify();
}

export function initTheme() {
  const saved = read();
  if (saved) root.dataset.theme = saved;
  deviceQuery.addEventListener('change', notify);
  // The host page can also set data-theme, so watch the attribute.
  new MutationObserver(notify).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
