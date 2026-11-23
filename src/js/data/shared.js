/**
 * Shared storage, available only when the page runs on claude.ai.
 *
 * One upload is stored once there and every viewer loads it, so a phone does not need its own copy.
 * Each upload (the LIVE UPDATE file and the oil analysis file) is a file in the page's asset store; a
 * small database document per upload points at it.
 * Only people with edit access can upload. Everyone else reads the latest file.
 *
 * Outside claude.ai there is no `window.claude`, connectShared() returns false and the page works
 * from this browser's own saved copy instead.
 */
import { SHARED } from '../config.js';
import { getDataset } from '../domain/dataset.js';
import { getOilLab } from '../domain/oilLab.js';

/** The two things that can be uploaded and shared. Each has its own database document. */
export const CHANNELS = {
  live: { documentId: SHARED.documentId, shown: getDataset, valid: (data) => Boolean(data?.qcs), label: 'live update' },
  oilLab: { documentId: SHARED.oilLabDocumentId, shown: getOilLab, valid: (data) => data?.kind === 'oil-lab', label: 'oil analysis' },
};

const state = { db: null, assets: null, received: false, current: {}, loadingAt: {} };

export const isShared = () => state.db !== null;
export const canUpload = () => state.db === null || state.assets !== null;
export const canPublish = () => state.db !== null && state.assets !== null;
/** True once the shared database has answered (or failed to) at least once. */
export const sharedReceived = () => state.received;

const reference = (channel) => state.db.doc(`${SHARED.collection}/${channel.documentId}`);

/** Listens to one shared document and hands every new upload to onDataset. */
function watch(channel, { onDataset, onMessage, onReply, onFailure }) {
  const id = channel.documentId;
  reference(channel).onSnapshot(
    async (snapshot) => {
      if (!snapshot.metadata.fromCache) onReply();
      if (!snapshot.exists) {
        state.current[id] = null;
        return;
      }
      const pointer = snapshot.data();
      state.current[id] = pointer;
      const shown = channel.shown();
      if ((shown && shown.at === pointer.at && shown.src === pointer.src) || state.loadingAt[id] === pointer.at) return;
      state.loadingAt[id] = pointer.at;
      try {
        const response = await fetch(SHARED.blobBase + pointer.asset);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!channel.valid(data)) throw new Error('Not the expected file');
        if (state.current[id] !== pointer) return; // a newer upload arrived while this one was loading
        onDataset(data);
      } catch {
        state.loadingAt[id] = null;
        onMessage(`Could not load the latest shared ${channel.label} data. Reload the page to try again.`, 'bad');
      }
    },
    () => onFailure(),
  );
}

/**
 * Connects to shared storage.
 * @param {{onDataset: (dataset: object) => void, onOilLab: (data: object) => void,
 *   onMessage: (text: string, kind?: string) => void, onConnected: () => void}} handlers
 * @returns {Promise<boolean>} false when shared storage is not available here
 */
export async function connectShared({ onDataset, onOilLab, onMessage, onConnected }) {
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
  if (!state.assets) onMessage('Only people with edit access to this page can upload. You see the latest files they uploaded.');
  onConnected();

  const hasData = () => Boolean(getDataset());
  const unreachable = setTimeout(() => {
    if (!state.received) onMessage(`Can't reach the shared data yet.${hasData() ? ' Showing the copy saved on this device.' : ''}`, 'bad');
  }, SHARED.loadTimeoutMs);
  const markReceived = () => {
    clearTimeout(unreachable);
    state.received = true;
  };
  const failed = () => {
    markReceived();
    onMessage(`Shared data is unavailable right now.${hasData() ? ' Showing the copy saved on this device.' : ''}`, 'bad');
  };

  watch(CHANNELS.live, { onDataset, onMessage, onReply: markReceived, onFailure: failed });
  watch(CHANNELS.oilLab, { onDataset: onOilLab, onMessage, onReply: markReceived, onFailure: markReceived });
  return true;
}

/** Stores an upload for everyone and removes the previous one. Throws when it cannot. */
export async function publishUpload(channel, data, extra = {}) {
  const id = channel.documentId;
  const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const upload = await state.assets.upload(file, { type: 'application/json' });
  const previous = state.current[id]?.asset;
  state.loadingAt[id] = data.at;
  await reference(channel).set({ asset: upload.id, src: data.src, built: data.built, at: data.at, ...extra });
  if (previous && previous !== upload.id) state.assets.delete(previous).catch(() => {});
}
