import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { syntheticDataset } from '../fixtures/dataset.js';
import { syntheticOilLab } from '../fixtures/oilLab.js';
import { launch, openPage } from './helpers/page.js';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

async function violations(page) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }));
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
}

for (const colorScheme of ['light', 'dark']) {
  for (const hash of ['', 'attention', 'pm', 'wirerope', 'cranes', 'data', 'oil-lab', 'Q2']) {
    test(`no WCAG A/AA violations on #${hash || 'home'} (${colorScheme})`, async () => {
      const page = await openPage(browser, { dataset: syntheticDataset, oilLab: syntheticOilLab, colorScheme });
      await page.waitForSelector('#homebody .hgrid');
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForTimeout(150);
      assert.deepEqual(await violations(page), []);
    });
  }
}
