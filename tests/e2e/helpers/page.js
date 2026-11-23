/** Opens the built page in a browser with the network cut off and, optionally, a saved dataset. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const PAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../index.html');

export async function launch() {
  return chromium.launch();
}

/**
 * @param {import('playwright').Browser} browser
 * @param {{dataset?: object, oilLab?: object, viewport?: {width: number, height: number}, colorScheme?: 'light'|'dark'}} [options]
 */
export async function openPage(browser, { dataset, oilLab, viewport = { width: 390, height: 844 }, colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport, colorScheme, reducedMotion: 'reduce' });
  // No network: the dashboard must work without fonts, three.js or the Excel library.
  await context.route(/^https?:/, (route) => route.abort());
  if (dataset) await context.addInitScript((data) => localStorage.setItem('qcD', JSON.stringify(data)), dataset);
  if (oilLab) await context.addInitScript((data) => localStorage.setItem('qcOilLab', JSON.stringify(data)), oilLab);
  const page = await context.newPage();
  page.problems = [];
  page.on('pageerror', (error) => page.problems.push(error.message));
  await page.goto(`file://${PAGE}`);
  return page;
}
