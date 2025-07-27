import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const METADATA_FILE = "metadata.json";
const pendingChanges = new Map<string, any>();

interface Metadata {
  version: number;
  lastModified: number;
  lastSynced?: number;
  lastPush?: number;
  lastPull?: number;
  isInitialized?: boolean;
}

const state = {
  localVersion: 0,
  syncInProgress: false,
};

async function readMetadata(): Promise<Metadata> {
  try {
    const result = await Filesystem.readFile({
      path: METADATA_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(String(result.data)) as Metadata;
  } catch {
    return {
      version: 0,
      lastModified: 0,
      lastSynced: 0,
      lastPull: 0,
      lastPush: 0,
      isInitialized: false,
    };
  }
}

async function writeMetadata(metadata: Metadata): Promise<void> {
  const fullMetadata: Metadata = {
    version: metadata.version,
    lastModified: metadata.lastModified,
    lastSynced: metadata.lastSynced ?? 0,
    lastPush: metadata.lastPush ?? 0,
    lastPull: metadata.lastPull ?? 0,
    isInitialized: metadata.isInitialized ?? true,
  };

  await Filesystem.writeFile({
    path: METADATA_FILE,
    directory: Directory.Data,
    data: JSON.stringify(fullMetadata),
    encoding: Encoding.UTF8,
  });
}

export async function trackChange(key: string, data: any): Promise<string> {
  const metadata = await readMetadata();
  metadata.version += 1;
  metadata.lastModified = Date.now();
  metadata.isInitialized = true;

  const changeId = Math.random().toString(36).substr(2, 9);
  pendingChanges.set(changeId, {
    key,
    data,
    version: metadata.version,
    timestamp: Date.now(),
  });

  await writeMetadata(metadata);
  state.localVersion = metadata.version;

  if (!state.syncInProgress) scheduleSync();

  return changeId;
}

// Debounce
let syncTimeout: number | undefined = undefined;
let lastScheduled = 0;
const SYNC_DEBOUNCE_MS = 60000;

function scheduleSync(immediate = false): void {
  const now = Date.now();

  if (immediate || now - lastScheduled > SYNC_DEBOUNCE_MS) {
    clearTimeout(syncTimeout);
    document.dispatchEvent(new Event("sync"));
  }
  clearTimeout(syncTimeout)
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = window.setTimeout(() => {
    document.dispatchEvent(new Event("sync"));
  }, SYNC_DEBOUNCE_MS);
}

export function forceSyncNow() {
  return scheduleSync(true);
}

export function getPendingChanges() {
  return pendingChanges;
}

export function getLocalVersion() {
  return state.localVersion;
}
