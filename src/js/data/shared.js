/**
 * Shared storage, available only when the page runs on claude.ai.
 *
 * One upload is stored once there and every viewer loads it, so a phone does not need its own copy.
 * The dataset itself is a file in the page's asset store; a small database document points at it.
 * Only people with edit access can upload. Everyone else reads the latest file.
 *
 * Outside claude.ai there is no `window.claude`, connectShared() returns false and the page works
 * from this browser's own saved copy instead.
 */
import { SHARED } from '../config.js';
import { getDataset } from '../domain/dataset.js';

const state = { db: null, assets: null, current: null, loadingAt: null, received: false };

export const isShared = () => state.db !== null;
export const canUpload = () => state.db === null || state.assets !== null;
export const canPublish = () => state.db !== null && state.assets !== null;
/** True once the shared database has answered (or failed to) at least once. */
export const sharedReceived = () => state.received;

const reference = (db) => db.doc(`${SHARED.collection}/${SHARED.documentId}`);

/**
 * Connects to shared storage.
 * @param {{onDataset: (dataset: object) => void, onMessage: (text: string, kind?: string) => void,
 *   onConnected: () => void, onFirstReply?: () => void}} handlers
 * @returns {Promise<boolean>} false when shared storage is not available here
 */
export async function connectShared({ onDataset, onMessage, onConnected, onFirstReply }) {
  const claude = window.claude;
  if (!claude?.use) return false;

  let db = null;
  try {
    db = await claude.use('db');
  } catch {
    /* Not a claude.ai view. */
  }
  if (!db) return false;
  state.db = db;
  try {
    state.assets = await claude.use('assets');
  } catch {
    /* Viewers without edit access get no asset store. */
  }
  if (!state.assets) onMessage('Only people with edit access to this page can upload. You see the latest file they uploaded.');
  onConnected();

  const hasData = () => Boolean(getDataset());
  const unreachable = setTimeout(() => {
    if (!state.received) onMessage(`Can't reach the shared data yet.${hasData() ? ' Showing the copy saved on this device.' : ''}`, 'bad');
  }, SHARED.loadTimeoutMs);

  const markReceived = () => {
    clearTimeout(unreachable);
    if (!state.received) onFirstReply?.();
    state.received = true;
  };

  reference(db).onSnapshot(
    async (snapshot) => {
      if (!snapshot.metadata.fromCache) markReceived();
      if (!snapshot.exists) {
        state.current = null;
        return;
      }
      const pointer = snapshot.data();
      state.current = pointer;
      const shown = getDataset();
      if ((shown && shown.at === pointer.at && shown.src === pointer.src) || state.loadingAt === pointer.at) return;
      state.loadingAt = pointer.at;
      try {
        const response = await fetch(SHARED.blobBase + pointer.asset);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dataset = await response.json();
        if (!dataset?.qcs) throw new Error('Not a dataset');
        if (state.current !== pointer) return; // a newer upload arrived while this one was loading
        onDataset(dataset);
      } catch {
        state.loadingAt = null;
        onMessage('Could not load the latest shared data. Reload the page to try again.', 'bad');
      }
    },
    () => {
      markReceived();
      onMessage(`Shared data is unavailable right now.${hasData() ? ' Showing the copy saved on this device.' : ''}`, 'bad');
    },
  );
  return true;
}

/** Stores the dataset for everyone and removes the previous upload. Throws when it cannot. */
export async function publishDataset(dataset, craneCount) {
  const file = new Blob([JSON.stringify(dataset)], { type: 'application/json' });
  const upload = await state.assets.upload(file, { type: 'application/json' });
  const previous = state.current?.asset;
  state.loadingAt = dataset.at;
  await reference(state.db).set({
    asset: upload.id,
    src: dataset.src,
    built: dataset.built,
    at: dataset.at,
    cranes: craneCount,
  });
  if (previous && previous !== upload.id) state.assets.delete(previous).catch(() => {});
}
