/** SheetJS reads and writes Excel files. It is large, so it is fetched only when a file is used. */
import { LIBRARIES } from '../config.js';
import { loadScript } from '../lib/loader.js';

export const sheetJsLoaded = () => Boolean(window.XLSX);

/** Starts the download early (for example when the upload button is touched). Never throws. */
export const preloadSheetJs = () => loadScript(LIBRARIES.sheetjs).catch(() => {});

/** @returns {Promise<object>} the SheetJS library */
export async function loadSheetJs() {
  if (!window.XLSX) await loadScript(LIBRARIES.sheetjs);
  return window.XLSX;
}
