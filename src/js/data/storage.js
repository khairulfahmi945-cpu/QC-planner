/**
 * Keeps the last uploaded dataset in this browser so it opens at once next time.
 * IndexedDB holds it (it can be large); localStorage is the fallback where IndexedDB is blocked.
 */
import { STORAGE } from '../config.js';
import { normalizeDataset } from '../domain/dataset.js';

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

async function readIndexedDb() {
  const db = await openDatabase();
  return settle(db.transaction(STORAGE.storeName).objectStore(STORAGE.storeName).get(STORAGE.recordKey));
}

async function writeIndexedDb(data) {
  const db = await openDatabase();
  const transaction = db.transaction(STORAGE.storeName, 'readwrite');
  transaction.objectStore(STORAGE.storeName).put(data, STORAGE.recordKey);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function readLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.legacyLocalKey) || 'null');
  } catch {
    return null;
  }
}

async function readSaved() {
  try {
    const fromIndexedDb = await readIndexedDb();
    if (fromIndexedDb) return fromIndexedDb;
  } catch {
    /* Fall through to localStorage. */
  }
  return readLocalStorage();
}

async function writeSaved(data) {
  try {
    await writeIndexedDb(data);
    return true;
  } catch {
    try {
      localStorage.setItem(STORAGE.legacyLocalKey, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}

/** The saved dataset, or null when there is none or the browser took too long to answer. */
export async function loadSavedDataset() {
  return normalizeDataset(await withTimeout(readSaved(), null));
}

/** Saves the dataset. Resolves true when it was kept, false when the browser refused. */
export const saveDataset = (data) => withTimeout(writeSaved(data), false);
