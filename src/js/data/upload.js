/** What happens when someone picks the LIVE UPDATE file: read it, show it, save it, share it. */
import { countRecords, setDataset } from '../domain/dataset.js';
import { say } from '../ui/message.js';
import { canPublish, publishDataset } from './shared.js';
import { loadSheetJs } from './sheetjs.js';
import { saveDataset } from './storage.js';
import { parseWorkbook } from './workbook.js';

/** Lets the browser paint the "Reading..." message before the (blocking) parse starts. */
const nextPaint = () => new Promise((resolve) => setTimeout(resolve, 60));

const noPmWarning = ' Warning: no PM rows were found in the monthly sheets, so crane status will be blank.';

async function readFile(file) {
  say('Loading the Excel reader…');
  let XLSX;
  try {
    XLSX = await loadSheetJs();
  } catch {
    say('The Excel reader could not load. Check your internet connection and try again.', 'bad');
    return null;
  }
  say(`Reading ${file.name}. This can take up to 30 seconds on a phone.`);
  await nextPaint();
  try {
    const dataset = parseWorkbook(XLSX, await file.arrayBuffer(), file.name);
    if (!Object.keys(dataset.qcs).length) throw new Error('no cranes found in this file.');
    return dataset;
  } catch (error) {
    say(`Could not read this file: ${error.message}`, 'bad');
    return null;
  }
}

/** Reads the file, replaces what the pages show, and keeps it for next time (and for everyone). */
export async function importWorkbook(file) {
  const dataset = await readFile(file);
  if (!dataset) return;

  const pmRows = countRecords(dataset, 'pm');
  const summary = `Loaded ${Object.keys(dataset.qcs).length} cranes, ${pmRows} PM rows and ${countRecords(dataset, 'wq')} work requests from ${file.name}.`;
  const warning = pmRows ? '' : noPmWarning;

  setDataset(dataset);
  const savedHere = await saveDataset(dataset);

  if (!canPublish()) {
    const where = savedHere ? ' Saved on this device.' : ' Could not save it on this device; it will be gone after you close the page.';
    say(summary + where + warning, savedHere && pmRows ? 'ok' : 'bad');
    return;
  }
  say(`Loaded ${Object.keys(dataset.qcs).length} cranes. Sharing with everyone…`);
  try {
    await publishDataset(dataset, Object.keys(dataset.qcs).length);
    say(`${summary} Everyone who opens this page now sees this file.${warning}`, pmRows ? 'ok' : 'bad');
  } catch (error) {
    say(`Loaded on this device, but sharing failed (${error?.code || 'error'}). Try uploading again.`, 'bad');
  }
}
