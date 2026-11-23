/** Shared constants. Anything someone might want to tune is named here instead of buried in code. */

export const APP_NAME = 'QC DASHBOARD STATUS';
export const APP_TITLE = 'QC Dashboard Status';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

/** Version of the stored data shape. Bump when the parser output changes in an incompatible way. */
export const DATA_VERSION = 2;

/** Limits that decide what is flagged. Percentages are of the recommended rope moves. */
export const THRESHOLDS = {
  /** A PMA / CF certificate is "due" when it expires within this many days. */
  pmaDueDays: 60,
  /** Wirerope: draws the bar amber from here. */
  ropeWatchPct: 90,
  /** Wirerope: listed in Alerts from here. */
  ropeAlertPct: 95,
  /** Wirerope: at or past the recommended number of moves. */
  ropeLimitPct: 100,
  /** The next quarterly inspection counts as "coming up" within this many days. */
  inspectionSoonDays: 30,
};

/** Priority number used for work requests that have none. Lower is more critical. */
export const UNRANKED_PRIORITY = 9;

/** How many rows lists show first, and how many more each "Show more" adds. */
export const PAGE_SIZE = {
  alertsPreview: 6,
  workRequests: { first: 30, step: 30 },
  largestJobs: { first: 10, step: 10, max: 60 },
  pendingRopes: { first: 20, step: 20 },
  expiredCertificates: { first: 8, step: 20 },
  dueCertificates: { first: 8, step: 20 },
  oilJobs: { first: 10, step: 20, max: 100 },
  oilLabAttention: { first: 8, step: 20 },
  craneOilLab: { first: 10, step: 20 },
  craneWorkRequests: { first: 40, step: 40 },
  cranePurchasing: { first: 40, step: 40 },
  craneOil: { first: 8, step: 16 },
  searchSuggestions: 12,
};

/** Scripts loaded on demand from cdnjs, which the claude.ai sandbox allows. */
export const LIBRARIES = {
  three: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  sheetjs: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
};

/** Browser storage. The names are kept so data saved by earlier versions still opens. */
export const STORAGE = {
  databaseName: 'qc-lookup',
  storeName: 'kv',
  recordKey: 'data',
  oilLabKey: 'oilLab',
  legacyLocalKey: 'qcD',
  oilLabLocalKey: 'qcOilLab',
  themeKey: 'qcTheme',
  timeoutMs: 4000,
};

/** The one place in the shared database that holds the current upload (claude.ai only). */
export const SHARED = {
  collection: 'live',
  documentId: 'current', // the LIVE UPDATE upload
  oilLabDocumentId: 'oil-lab', // the oil analysis upload
  blobBase: '/_blob/',
  loadTimeoutMs: 10000,
};
