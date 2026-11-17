/** The "Export (Excel)" buttons. */
import { getDataset } from '../domain/dataset.js';
import { say } from '../ui/message.js';
import { buildExportWorkbook, saveWorkbook } from './exporter.js';
import { loadSheetJs } from './sheetjs.js';

/** Exports the given cranes. One crane gets its own file name; several share the "all" name. */
export async function exportCranes(ids) {
  const { built } = getDataset();
  const fileName = ids.length === 1 ? `QC-${ids[0]}-${built}.xlsx` : `QC-all-${built}.xlsx`;
  let XLSX;
  try {
    XLSX = await loadSheetJs();
  } catch {
    say('The Excel writer could not load. Check your internet connection and try again.', 'bad');
    return;
  }
  try {
    const result = await saveWorkbook(XLSX, buildExportWorkbook(XLSX, ids), fileName);
    if (result === 'saved') say(`Export ready: ${fileName}`, 'ok');
  } catch (error) {
    say(error?.code ? `Could not save the file (${error.code}).` : 'Could not save the file.', 'bad');
  }
}
