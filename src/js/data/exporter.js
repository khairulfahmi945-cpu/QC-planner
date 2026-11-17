/** Exporting cranes to an Excel file. */
import { MONTH_NAMES, UNRANKED_PRIORITY } from '../config.js';
import { dataYear, getCrane } from '../domain/dataset.js';
import { latestPmRecord } from '../domain/crane.js';
import { isOpenJob, jobCategory } from '../domain/purchasing.js';
import { openRequests, topPriority } from '../domain/workRequests.js';

const CATEGORY_LABEL = { done: 'Complete', open: 'Open', other: 'Other' };

/** The rows for every sheet of the export. Sheets with no rows are left out by the caller. */
export function buildExportSheets(ids) {
  const sheets = { summary: [], pm: [], purchasing: [], requests: [], wirerope: [], inspection: [], oil: [] };
  for (const id of ids) {
    const crane = getCrane(id);
    const latest = latestPmRecord(crane);
    const top = topPriority(crane);

    sheets.summary.push({
      QC: id,
      Fleet: crane.fleet,
      Type: crane.desc,
      'PMA no': crane.pma,
      'Serial no': crane.serial,
      'PMA/CF expiry': crane.pmaExp,
      'Latest status': latest ? latest.st : '',
      'Latest PM month': latest ? latest.m : '',
      'Open PR/WO': crane.pr.filter(isOpenJob).length,
      'Open work requests': openRequests(crane).length,
      'Highest open criticality': top < UNRANKED_PRIORITY ? `P${top}` : '',
      'SOS coupling': crane.sos ? crane.sos.s : '',
    });
    for (const r of crane.wq) {
      sheets.requests.push({
        QC: id, 'Work request': r.no, Date: r.d, Time: r.tm, Description: r.ds, Criticality: r.pri,
        Status: r.st, Type: r.ty, 'Equipment code': r.code, 'Work order': r.wo, 'WO status': r.wos, Remark: r.rm,
      });
    }
    for (const r of crane.pm) {
      sheets.pm.push({
        QC: id, Month: MONTH_NAMES[r.m], 'QC status': r.st, 'Previous PM': r.ls,
        'PM done': r.a.join(', '), Status: r.s, Remark: r.r, ...r.p,
      });
    }
    for (const j of crane.pr) {
      sheets.purchasing.push({
        QC: id, Category: CATEGORY_LABEL[jobCategory(j)], Date: j.d, Job: j.j, Vendor: j.v, Cost: j.rm,
        WO: j.wo, PR: j.pr, PO: j.po, GRN: j.grn, 'Service code': j.sc, 'Job status': j.st,
        'PR/PO status': j.ps, 'Planner update': j.pu,
      });
    }
    for (const r of crane.wr) {
      sheets.wirerope.push({
        QC: id, 'Plan group': r.mo, Job: r.j, Status: r.js, Availability: r.av, 'Plan date': r.pd,
        'Current moves': r.cur, 'Recommended moves': r.rec, 'Over moves': r.over, 'Over %': r.pct,
        WO: r.wo, PR: r.pr, CWO: r.cwo, 'Item code': r.item,
      });
    }
    for (const s of crane.sany) {
      sheets.wirerope.push({
        QC: id, 'Plan group': 'SANY update', Job: `SANY ${s.ty || ''} wirerope`, Status: s.st, 'Plan date': s.d,
        'Current moves': s.cur, 'Recommended moves': s.lim, 'Item code': s.item,
      });
    }
    for (const q of crane.fyk) sheets.inspection.push({ QC: id, Quarter: q.q, Actual: q.a, 'Next plan': q.n });
    for (const o of crane.oil) {
      sheets.oil.push({ QC: id, 'Plan date': o.d, Work: o.ds, WO: o.wo, Status: o.s, Completed: o.c });
    }
  }
  return sheets;
}

/** Builds the workbook. SheetJS is passed in. */
export function buildExportWorkbook(XLSX, ids) {
  const sheets = buildExportSheets(ids);
  const workbook = XLSX.utils.book_new();
  const order = [
    ['Summary', sheets.summary], [`PM ${dataYear()}`, sheets.pm], ['PR-WO', sheets.purchasing],
    ['Work request', sheets.requests], ['Wirerope', sheets.wirerope], ['Inspection', sheets.inspection], ['Oil', sheets.oil],
  ];
  for (const [name, rows] of order) {
    if (rows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  return workbook;
}

/**
 * Saves the file. Uses the claude.ai save dialog when it is there, a normal download otherwise.
 * @returns {Promise<'saved' | 'declined'>} throws when the file could not be written
 */
export async function saveWorkbook(XLSX, workbook, fileName) {
  let dialog = null;
  try {
    dialog = await window.claude?.use?.('downloads');
  } catch {
    /* Not available here. */
  }
  if (!dialog) {
    XLSX.writeFile(workbook, fileName);
    return 'saved';
  }
  try {
    await dialog.save({ filename: fileName, data: XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) });
    return 'saved';
  } catch (error) {
    if (error?.code === 'declined') return 'declined';
    throw error;
  }
}
