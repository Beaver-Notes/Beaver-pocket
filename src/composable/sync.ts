import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const METADATA_FILE = "metadata.json";
const pendingChanges = new Map<string, any>();

interface Metadata {
  version: number;
  lastModified: number;
}

interface Change {
  key: string;
  data: any;
  version: number;
  timestamp: number;
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
  } catch (error) {
    return { version: 0, lastModified: 0 }; // Default metadata if file doesn't exist
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

  // Increment local version
  metadata.version += 1;
  metadata.lastModified = Date.now();

  // Store the change with version info
  const changeId = generateChangeId();
  pendingChanges.set(changeId, {
    key,
    data,
    version: metadata.version,
    timestamp: Date.now(),
  } as Change);

  // Update metadata file
  await writeMetadata(metadata);
  state.localVersion = metadata.version;

  // Schedule sync if not already syncing
  if (!state.syncInProgress) {
    scheduleSyncWithDebounce();
  }

  return changeId;
}

function generateChangeId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function scheduleSyncWithDebounce(): void {
  document.dispatchEvent(new Event("sync"));
}
