import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { syntheticDataset } from '../fixtures/dataset.js';
import { syntheticOilLab } from '../fixtures/oilLab.js';
import { launch, openPage } from './helpers/page.js';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const go = async (page, hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(100);
};

test('with no data, Home asks for an upload and the other pages explain why they are empty', async () => {
  const page = await openPage(browser);
  assert.match(await page.textContent('#homebody'), /Upload/i);
  await go(page, 'attention');
  assert.match(await page.textContent('#view'), /No data loaded yet/);
  assert.deepEqual(page.problems, []);
});

test('a saved dataset fills Home and finds a crane by its number', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset });
  await page.waitForSelector('#homebody .hgrid');
  assert.match(await page.textContent('.sc.fleet'), /3/);
  await page.fill('#q', '45');
  assert.equal(await page.textContent('#sug .sug b'), 'Q45');
  assert.deepEqual(page.problems, []);
});

test('every page opens, names itself in the tab title and does not crash', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset });
  await page.waitForSelector('#homebody .hgrid');
  for (const hash of ['attention', 'pm', 'work-requests', 'pr-wo', 'wirerope', 'certificates', 'oil', 'fleets', 'cranes', 'data', 'Q2']) {
    await go(page, hash);
    assert.ok((await page.title()).includes('QC DASHBOARD STATUS'), hash);
  }
  assert.deepEqual(page.problems, []);
});

test('the alerts page lists the crane that is down and the open P1 request', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset });
  await page.waitForSelector('#homebody .hgrid');
  await go(page, 'attention');
  assert.match(await page.textContent('#a-down'), /Q2/);
  assert.match(await page.textContent('#nbadge'), /\d/);
});

test('a crane page shows its tabs and switches between them', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset });
  await page.waitForSelector('#homebody .hgrid');
  await go(page, 'Q2');
  assert.equal(await page.isVisible('#detail'), true);
  await page.click('[data-t="wq"]');
  assert.match(await page.textContent('#panel'), /Spreader fault/);
  assert.equal(await page.getAttribute('[data-t="wq"]', 'aria-selected'), 'true');
});

test('a malformed address shows Home instead of failing', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset });
  await go(page, '%E0%A4%A');
  assert.equal(await page.isVisible('#home'), true);
  assert.deepEqual(page.problems, []);
});

test('the theme button switches between light and dark and says what it shows', async () => {
  const page = await openPage(browser);
  await page.click('#theme');
  assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
  assert.equal(await page.textContent('#thl'), 'Light');
  await page.click('#theme');
  assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
});

test('oil analysis is a separate file: its page, crane tab and Home card appear once it is loaded', async () => {
  const page = await openPage(browser, { dataset: syntheticDataset, oilLab: syntheticOilLab });
  await page.waitForSelector('#homebody .hgrid');
  assert.match(await page.textContent('#homebody'), /Oil lab/);
  await go(page, 'oil-lab');
  assert.match(await page.textContent('#view .kstrip'), /Critical now/);
  assert.match(await page.textContent('#view'), /Needs action now/);
  await go(page, 'Q2');
  await page.click('[data-t="lab"]');
  assert.match(await page.textContent('#panel'), /Change the oil now/);
  assert.deepEqual(page.problems, []);
});

test('the Data page offers both upload buttons, and the Oil lab page works without live data', async () => {
  const page = await openPage(browser, { oilLab: syntheticOilLab });
  await go(page, 'data');
  assert.match(await page.textContent('#view .tools'), /Upload live update file/);
  assert.match(await page.textContent('#view .tools'), /Upload oil analysis file/);
  await go(page, 'oil-lab');
  assert.match(await page.textContent('#view'), /Needs action now/);
  assert.deepEqual(page.problems, []);
});
