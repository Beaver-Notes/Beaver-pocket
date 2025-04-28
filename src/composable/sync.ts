import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const METADATA_FILE = "metadata.json";
const pendingChanges = new Map<string, any>();
let debounceTimeout: number | undefined;

interface Metadata {
  version: number;
  lastModified: number;
}

const state = { localVersion: 0, syncInProgress: false };

async function readMetadata(): Promise<Metadata> {
  try {
    const result = await Filesystem.readFile({
      path: METADATA_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(String(result.data)) as Metadata;
  } catch {
    return { version: 0, lastModified: 0 };
  }
}

async function writeMetadata(metadata: Metadata): Promise<void> {
  await Filesystem.writeFile({
    path: METADATA_FILE,
    directory: Directory.Data,
    data: JSON.stringify(metadata),
    encoding: Encoding.UTF8,
  });
}

export async function trackChange(key: string, data: any): Promise<string> {
  const metadata = await readMetadata();
  metadata.version += 1;
  metadata.lastModified = Date.now();

  const changeId = Math.random().toString(36).substr(2, 9);
  pendingChanges.set(changeId, {
    key,
    data,
    version: metadata.version,
    timestamp: Date.now(),
  });

  await writeMetadata(metadata);
  state.localVersion = metadata.version;

  if (!state.syncInProgress) scheduleSyncWithDebounce();

  return changeId;
}

function scheduleSyncWithDebounce(): void {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    alert("Syncing changes...");
    document.dispatchEvent(new Event("sync"));
  }, 500);
}
