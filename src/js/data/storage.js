/**
 * Keeps the last uploaded dataset in this browser so it opens at once next time.
 * IndexedDB holds it (it can be large); localStorage is the fallback where IndexedDB is blocked.
 */
import { STORAGE } from '../config.js';
import { normalizeDataset } from '../domain/dataset.js';
import { normalizeOilLab } from '../domain/oilLab.js';

const withTimeout = (promise, fallback) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), STORAGE.timeoutMs))]);

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(STORAGE.databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORAGE.storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const settle = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

async function readIndexedDb(key) {
  const db = await openDatabase();
  return settle(db.transaction(STORAGE.storeName).objectStore(STORAGE.storeName).get(key));
}

async function writeIndexedDb(key, data) {
  const db = await openDatabase();
  const transaction = db.transaction(STORAGE.storeName, 'readwrite');
  transaction.objectStore(STORAGE.storeName).put(data, key);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function readLocalStorage(localKey) {
  try {
    return JSON.parse(localStorage.getItem(localKey) || 'null');
  } catch {
    return null;
  }
}

async function readSaved({ key, localKey }) {
  try {
    const fromIndexedDb = await readIndexedDb(key);
    if (fromIndexedDb) return fromIndexedDb;
  } catch {
    /* Fall through to localStorage. */
  }
  return readLocalStorage(localKey);
}

async function writeSaved({ key, localKey }, data) {
  try {
    await writeIndexedDb(key, data);
    return true;
  } catch {
    try {
      localStorage.setItem(localKey, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}

const LIVE_SLOT = { key: STORAGE.recordKey, localKey: STORAGE.legacyLocalKey };
const OIL_LAB_SLOT = { key: STORAGE.oilLabKey, localKey: STORAGE.oilLabLocalKey };

/** The saved dataset, or null when there is none or the browser took too long to answer. */
export async function loadSavedDataset() {
  return normalizeDataset(await withTimeout(readSaved(LIVE_SLOT), null));
}

/** Saves the dataset. Resolves true when it was kept, false when the browser refused. */
export const saveDataset = (data) => withTimeout(writeSaved(LIVE_SLOT, data), false);

/** The saved oil analysis results, or null. */
export async function loadSavedOilLab() {
  return normalizeOilLab(await withTimeout(readSaved(OIL_LAB_SLOT), null));
}

export const saveOilLab = (data) => withTimeout(writeSaved(OIL_LAB_SLOT, data), false);
