/**
 * Shows the animated 3D crane in a frame (the home hero or a crane's banner).
 * three.js is large, so it is fetched only when a frame is on screen, after the page has painted,
 * and not at all on a data-saver or very slow connection. Without it the frame keeps its drawn
 * fallback and nothing else changes.
 */
import { LIBRARIES } from '../config.js';
import { loadScript } from '../lib/loader.js';
import { Q3D } from './crane-scene.js';

let mounted = { host: null, key: '' };
let latest = 0;

function connectionAllowsScene() {
  const connection = navigator.connection;
  return !(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
}

/** Waits until the browser is idle (or a moment has passed) so the first paint is not delayed. */
const whenIdle = () =>
  new Promise((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(resolve, { timeout: 1200 });
    else setTimeout(resolve, 200);
  });

/**
 * @param {Element} frame element that gets the "has-gl" class once the scene is running
 * @param {Element} host   element the canvas goes into
 * @param {object} options what to paint on the crane: {id, sub, down, close}
 * @param {boolean} dark   current theme
 */
export async function showScene(frame, host, options, dark) {
  const request = ++latest;
  const key = JSON.stringify(options);
  if (mounted.host === host && mounted.key === key && host.querySelector('canvas')) {
    frame.classList.add('has-gl');
    return;
  }
  if (!connectionAllowsScene()) return;
  await whenIdle();
  if (request !== latest) return; // the reader moved on while this waited

  try {
    await loadScript(LIBRARIES.three);
  } catch {
    return; // offline or blocked: keep the fallback picture
  }
  if (request !== latest || !host.isConnected) return;

  const ok = Q3D.mount(host, options);
  mounted = ok ? { host, key } : { host: null, key: '' };
  if (ok) Q3D.setTheme(dark);
  frame.classList.toggle('has-gl', ok);
}

export const setSceneTheme = (dark) => Q3D.setTheme(dark);
