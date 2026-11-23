/** What happens when someone picks a file: read it, show it, save it, share it. Two kinds of file: LIVE UPDATE and oil analysis. */
import { countRecords, setDataset } from '../domain/dataset.js';
import { setOilLab } from '../domain/oilLab.js';
import { say } from '../ui/message.js';
import { CHANNELS, canPublish, publishUpload } from './shared.js';
import { loadSheetJs } from './sheetjs.js';
import { saveDataset, saveOilLab } from './storage.js';
import { parseOilWorkbook } from './oilLabReader.js';
import { parseWorkbook } from './workbook.js';

/** Lets the browser paint the "Reading..." message before the (blocking) parse starts. */
const nextPaint = () => new Promise((resolve) => setTimeout(resolve, 60));

const noPmWarning = ' Warning: no PM rows were found in the monthly sheets, so crane status will be blank.';

/** Loads the Excel reader and turns the file into data. Returns null (after saying why) when it fails. */
async function readFile(file, parse, isEmpty) {
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
    const data = parse(XLSX, await file.arrayBuffer(), file.name);
    if (isEmpty(data)) throw new Error('no rows were found in this file.');
    return data;
  } catch (error) {
    say(`Could not read this file: ${error.message}`, 'bad');
    return null;
  }
}

/** Reads the file, replaces what the pages show, and keeps it for next time (and for everyone). */
export async function importWorkbook(file) {
  const dataset = await readFile(file, parseWorkbook, (data) => !Object.keys(data.qcs).length);
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
    await publishUpload(CHANNELS.live, dataset, { cranes: Object.keys(dataset.qcs).length });
    say(`${summary} Everyone who opens this page now sees this file.${warning}`, pmRows ? 'ok' : 'bad');
  } catch (error) {
    say(`Loaded on this device, but sharing failed (${error?.code || 'error'}). Try uploading again.`, 'bad');
  }
}

/** Reads the oil analysis file, replaces what the Oil lab pages show, and keeps it (and shares it). */
export async function importOilLab(file) {
  const lab = await readFile(file, parseOilWorkbook, (data) => !data.samples.length);
  if (!lab) return;

  const years = Object.keys(lab.sheets).length;
  const summary = `Loaded ${lab.samples.length} oil samples from ${years} result sheets in ${file.name}.`;
  setOilLab(lab);
  const savedHere = await saveOilLab(lab);

  if (!canPublish()) {
    const where = savedHere ? ' Saved on this device.' : ' Could not save it on this device; it will be gone after you close the page.';
    say(summary + where, savedHere ? 'ok' : 'bad');
    return;
  }
  say(`Loaded ${lab.samples.length} oil samples. Sharing with everyone…`);
  try {
    await publishUpload(CHANNELS.oilLab, lab, { samples: lab.samples.length });
    say(`${summary} Everyone who opens this page now sees these results.`, 'ok');
  } catch (error) {
    say(`Loaded on this device, but sharing failed (${error?.code || 'error'}). Try uploading again.`, 'bad');
  }
}
