import { create } from "zustand";
import { Preferences } from "@capacitor/preferences";
import type { FolderRef } from "@daniele-rolli/capacitor-scoped-storage";
import { ScopedStorage } from "@daniele-rolli/capacitor-scoped-storage";
import { AES } from "crypto-es/lib/aes.js";
import { Utf8 } from "crypto-es/lib/core.js";
import { useStorage } from "@/composable/storage"; // your existing key/value storage abstraction
import { useNoteStore } from "@/store/note";
import { useFolderStore } from "@/store/folder";

// ------------------------------
// Constants & helpers
// ------------------------------
const storage = useStorage();
const SYNC_DEBOUNCE_MS = 60_000;
const SYNC_FOLDER_PREF_KEY = "sync-folder"; // JSON stringified FolderRef
const AUTO_SYNC_PREF_KEY = "autoSync"; // "true" | "false"

// File layout (inside the selected folder)
const METADATA_JSON = "metadata.json";
const DATA_JSON = "data.json";
const NOTE_ASSETS_DIR = "note-assets";
const FILE_ASSETS_DIR = "file-assets";

function generateChangeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function getAutoSyncFlag() {
    const { value } = await Preferences.get({ key: AUTO_SYNC_PREF_KEY });
    return value === "true";
}

// ------------------------------
// Sync store (Zustand)
// ------------------------------
interface SyncState {
    dataDir: string; // reserved — keep parity with original API
    password?: string;
    fontSize: string;
    withPassword: boolean;
    lastSyncTime: number | null;
    syncInProgress: boolean;
    syncError: string | null;
    remoteVersion: number;
    localVersion: number;
    isFirstSync: boolean;
    pendingCount: number;
    status: "idle" | "syncing" | "success" | "error";
}

export const useSyncStore = create<SyncState>(() => ({
    dataDir: "",
    password: undefined,
    fontSize: "16",
    withPassword: false,
    lastSyncTime: null,
    syncInProgress: false,
    syncError: null,
    remoteVersion: 0,
    localVersion: 0,
    isFirstSync: false,
    pendingCount: 0,
    status: "idle",
}));

// ------------------------------
// Internal state
// ------------------------------
const pendingChanges = new Map<string, { key: string; data: any; version: number; timestamp: number }>();
let syncTimeout: any = null;
let lastScheduled = 0;

let passwordProvider: (() => Promise<string | null>) | null = null;
export function setPasswordProvider(fn: () => Promise<string | null>) {
    passwordProvider = fn;
}

// ------------------------------
// Sync folder selection API
// ------------------------------
export async function pickAndSaveSyncFolder(): Promise<FolderRef> {
    const { folder } = await ScopedStorage.pickFolder();
    await Preferences.set({ key: SYNC_FOLDER_PREF_KEY, value: JSON.stringify(folder) });
    return folder;
}

export async function getSavedSyncFolder(): Promise<FolderRef | null> {
    const { value } = await Preferences.get({ key: SYNC_FOLDER_PREF_KEY });
    if (!value) return null;
    try {
        return JSON.parse(value) as FolderRef;
    } catch {
        return null;
    }
}

// ------------------------------
// Public API (trackChange + sync controls)
// ------------------------------
export async function trackChange(key: string, data: any) {
    // Ensure metadata exists and bump local version
    const metadata = await storage.get(
        "syncMetadata",
        { version: 0, isInitialized: false },
        "settings"
    );

    // First sync guard (no remote yet)
    if (!metadata.isInitialized && !useSyncStore.getState().isFirstSync) {
        const folder = await getSavedSyncFolder();
        if (folder) {
            try {
                const exists = await existsFile(folder, METADATA_JSON);
                if (exists) {
                    const remoteMeta = await readJson(folder, METADATA_JSON);
                    if (remoteMeta?.version > 0) {
                        return null; // remote already initialized — force a pull first
                    }
                }
            } catch {
                // ignore
            }
        }
    }

    metadata.version += 1;
    metadata.lastModified = Date.now();
    metadata.isInitialized = true;

    const changeId = generateChangeId();
    pendingChanges.set(changeId, {
        key,
        data,
        version: metadata.version,
        timestamp: Date.now(),
    });

    await storage.set("syncMetadata", metadata, "settings");
    useSyncStore.setState({ localVersion: metadata.version, pendingCount: pendingChanges.size });

    if (!useSyncStore.getState().syncInProgress && (await getAutoSyncFlag())) {
        scheduleSync();
    }

    return changeId;
}

export function configureSyncPassword(usePassword: boolean, password?: string) {
    useSyncStore.setState({ withPassword: usePassword, password });
}

export function forceSyncNow() {
    return scheduleSync(true);
}

export function getSyncStatus() {
    const s = useSyncStore.getState();
    return {
        status: s.status,
        lastSynced: s.lastSyncTime ? new Date(s.lastSyncTime) : null,
        localVersion: s.localVersion,
        remoteVersion: s.remoteVersion,
        pendingChanges: s.pendingCount,
    };
}

// ------------------------------
// Scheduling
// ------------------------------
function scheduleSync(immediate = false) {
    const now = Date.now();

    if (immediate || now - lastScheduled > SYNC_DEBOUNCE_MS) {
        clearTimeout(syncTimeout);
        lastScheduled = now;
        return syncData();
    }

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        lastScheduled = Date.now();
        syncData();
    }, SYNC_DEBOUNCE_MS);
}

// ------------------------------
// Core sync
// ------------------------------
export async function syncData() {
    const store = useSyncStore.getState();
    if (store.syncInProgress) return;

    const folder = await getSavedSyncFolder();
    if (!folder) return;

    try {
        useSyncStore.setState({ syncInProgress: true, status: "syncing", syncError: null });

        // Ensure folder structure
        await ensureDir(folder, ".");
        await ensureDir(folder, NOTE_ASSETS_DIR);
        await ensureDir(folder, FILE_ASSETS_DIR);

        // Load local metadata
        const localMetadata = await storage.get(
            "syncMetadata",
            { version: 0, isInitialized: false },
            "settings"
        );
        useSyncStore.setState({ localVersion: localMetadata.version });

        // Pull remote metadata if present
        let remoteMetadata: any = { version: 0 };
        let hasRemote = false;
        if (await existsFile(folder, METADATA_JSON)) {
            remoteMetadata = await readJson(folder, METADATA_JSON);
            useSyncStore.setState({ remoteVersion: Number(remoteMetadata?.version || 0) });
            hasRemote = true;
        }

        if (hasRemote && remoteMetadata.version > 0) {
            await pullChanges(folder, remoteMetadata.version);
        }

        const newVersion = Math.max(useSyncStore.getState().localVersion, useSyncStore.getState().remoteVersion) + 1;
        await pushChanges(folder, newVersion);

        // Assets: on mobile we store directly under the scoped folder, so nothing to mirror.
        // We still ensure the dirs exist above.

        useSyncStore.setState({ lastSyncTime: Date.now(), status: "success" });

        // Refresh stores
        const noteStore = useNoteStore.getState();
        const folderStore = useFolderStore.getState();
        await Promise.all([noteStore.retrieve(), folderStore.retrieve()]);
    } catch (error: any) {
        console.error("Sync error:", error);
        useSyncStore.setState({ status: "error", syncError: error?.message || String(error) });
    } finally {
        useSyncStore.setState({ syncInProgress: false, pendingCount: pendingChanges.size });
    }
}

async function pullChanges(folder: FolderRef, remoteVersion: number) {
    let remoteData: any;
    try {
        remoteData = await readJson(folder, DATA_JSON);
    } catch (e: any) {
        throw new Error(`Invalid data: ${e?.message || e}`);
    }

    let importedData = remoteData?.data;

    const state = useSyncStore.getState();
    if (typeof importedData === "string") {
        // Encrypted: ask for password via provider if not set
        let password = state.password;
        if (!password && passwordProvider) {
            password = (await passwordProvider()) || undefined;
        }
        if (!password) return; // user canceled

        try {
            const bytes = AES.decrypt(importedData, password);
            const decrypted = bytes.toString(Utf8);
            importedData = JSON.parse(decrypted);
            useSyncStore.setState({ password, withPassword: true });
        } catch {
            throw new Error("Invalid password");
        }
    } else {
        useSyncStore.setState({ withPassword: false });
    }

    if (!importedData || typeof importedData !== "object") {
        throw new Error("Invalid data payload");
    }

    await mergePulledData(importedData);

    await storage.set(
        "syncMetadata",
        {
            version: remoteVersion,
            lastSynced: Date.now(),
            lastPull: Date.now(),
            isInitialized: true,
        },
        "settings"
    );

    useSyncStore.setState({ localVersion: remoteVersion, remoteVersion });
    pendingChanges.clear();
}

async function pushChanges(folder: FolderRef, localVersion: number) {
    const dataToSync = await prepareDataToSync();
    let finalData: any = dataToSync;

    const { withPassword, password } = useSyncStore.getState();
    if (withPassword && password) {
        finalData = AES.encrypt(JSON.stringify(dataToSync), password).toString();
    }

    const metadata = {
        version: localVersion,
        lastSynced: Date.now(),
        lastPush: Date.now(),
        lastModified: Date.now(),
    };

    await writeJson(folder, DATA_JSON, { data: finalData });
    await writeJson(folder, METADATA_JSON, metadata);

    useSyncStore.setState({ remoteVersion: localVersion });
    pendingChanges.clear();
}

// ------------------------------
// Assets helpers
// ------------------------------
export async function ensureAssetDirs() {
    const folder = await getSavedSyncFolder();
    if (!folder) return;
    await ensureDir(folder, NOTE_ASSETS_DIR);
    await ensureDir(folder, FILE_ASSETS_DIR);
}

// Utility to list entries under note-assets or file-assets
export async function listAssetDir(kind: "note" | "file") {
    const folder = await getSavedSyncFolder();
    if (!folder) return [] as string[];
    const base = kind === "note" ? NOTE_ASSETS_DIR : FILE_ASSETS_DIR;
    const { entries } = await ScopedStorage.readdir({ folder, path: base });
    return entries.map((e) => e.name);
}

// ------------------------------
// Data prep & merge logic (ported)
// ------------------------------
async function prepareDataToSync() {
    const keys = [
        "notes",
        "folders",
        "labels",
        "lockStatus",
        "isLocked",
        "settings",
        "deletedIds",
        "deletedFolderIds",
    ] as const;
    const result: Record<string, any> = {};

    for (const key of keys) {
        const defaultValue = ["notes", "folders", "lockStatus", "isLocked"].includes(key as any)
            ? {}
            : [];
        result[key] = await storage.get(key, defaultValue);
    }
    return result;
}

async function mergePulledData(imported: any) {
    const keys = [
        "notes",
        "folders",
        "labels",
        "lockStatus",
        "isLocked",
        "settings",
        "deletedIds",
        "deletedFolderIds",
    ];

    const currentDeletedIds = await storage.get("deletedIds", {});
    const importedDeletedIds = imported.deletedIds || {};
    const mergedDeletedIds: Record<string, number> = { ...currentDeletedIds };

    for (const [id, ts] of Object.entries(importedDeletedIds)) {
        const timestamp = Number(ts);
        if (!mergedDeletedIds[id] || timestamp > mergedDeletedIds[id]) {
            mergedDeletedIds[id] = timestamp;
        }
    }

    const currentDeletedFolderIds = await storage.get("deletedFolderIds", {});
    const importedDeletedFolderIds = imported.deletedFolderIds || {};
    const mergedDeletedFolderIds: Record<string, number> = { ...currentDeletedFolderIds };

    for (const [id, ts] of Object.entries(importedDeletedFolderIds)) {
        const timestamp = Number(ts);
        if (!mergedDeletedFolderIds[id] || timestamp > mergedDeletedFolderIds[id]) {
            mergedDeletedFolderIds[id] = timestamp;
        }
    }

    const currentNotes = await storage.get("notes", {});
    const incomingNotes = imported.notes || {};

    // If a note lives under a deleted folder, null the folderId (both sides)
    for (const [noteId, note] of Object.entries({ ...currentNotes, ...incomingNotes }) as any) {
        if ((note as any).folderId && mergedDeletedFolderIds[(note as any).folderId]) {
            const folderDeletionTime = mergedDeletedFolderIds[(note as any).folderId];
            const noteUpdateTime = (note as any).updatedAt ? new Date((note as any).updatedAt).getTime() : 0;
            if (folderDeletionTime > noteUpdateTime) {
                if (currentNotes[noteId]) currentNotes[noteId] = { ...currentNotes[noteId], folderId: null };
                if (incomingNotes[noteId]) incomingNotes[noteId] = { ...incomingNotes[noteId], folderId: null };
            }
        }
    }

    await storage.set("deletedIds", mergedDeletedIds);
    await storage.set("deletedFolderIds", mergedDeletedFolderIds);

    for (const key of keys) {
        if (key === "deletedIds" || key === "deletedFolderIds") continue;

        const current = await storage.get(key, ["notes", "folders"].includes(key) ? {} : []);
        const incoming = imported[key];
        if (!incoming) continue;

        if (key === "notes") {
            const mergedNotes: Record<string, any> = {};

            for (const [id, note] of Object.entries(currentNotes)) {
                if (
                    mergedDeletedIds[id] &&
                    (note as any).updatedAt &&
                    mergedDeletedIds[id] >= new Date((note as any).updatedAt).getTime()
                ) {
                    continue;
                }
                if ((note as any).folderId && mergedDeletedFolderIds[(note as any).folderId]) {
                    (note as any).folderId = null;
                }
                mergedNotes[id] = note;
            }

            for (const [id, incomingNote] of Object.entries(incomingNotes)) {
                if (
                    mergedDeletedIds[id] &&
                    (incomingNote as any).updatedAt &&
                    mergedDeletedIds[id] >= new Date((incomingNote as any).updatedAt).getTime()
                ) {
                    continue;
                }
                if ((incomingNote as any).folderId && mergedDeletedFolderIds[(incomingNote as any).folderId]) {
                    (incomingNote as any).folderId = null;
                }
                const currentNote = mergedNotes[id];
                if (
                    !currentNote ||
                    ((incomingNote as any).updatedAt &&
                        (currentNote as any)?.updatedAt &&
                        new Date((incomingNote as any).updatedAt) > new Date((currentNote as any).updatedAt))
                ) {
                    mergedNotes[id] = incomingNote;
                }
            }

            await storage.set("notes", mergedNotes);
        } else if (key === "folders") {
            const mergedFolders: Record<string, any> = {};

            for (const [id, folder] of Object.entries(current)) {
                if (
                    mergedDeletedFolderIds[id] &&
                    (folder as any).updatedAt &&
                    mergedDeletedFolderIds[id] >= (folder as any).updatedAt
                ) {
                    continue;
                }
                mergedFolders[id] = folder;
            }

            for (const [id, incomingFolder] of Object.entries(incoming)) {
                if (
                    mergedDeletedFolderIds[id] &&
                    (incomingFolder as any).updatedAt &&
                    mergedDeletedFolderIds[id] >= (incomingFolder as any).updatedAt
                ) {
                    continue;
                }
                const currentFolder = mergedFolders[id];
                if (
                    !currentFolder ||
                    ((incomingFolder as any).updatedAt &&
                        (currentFolder as any)?.updatedAt &&
                        (incomingFolder as any).updatedAt > (currentFolder as any).updatedAt)
                ) {
                    mergedFolders[id] = incomingFolder;
                }
            }

            await storage.set("folders", mergedFolders);
        } else if (Array.isArray(current) && Array.isArray(incoming)) {
            await storage.set(key, [...new Set([...(current as any[]), ...(incoming as any[])])]);
        } else if (typeof current === "object" && typeof incoming === "object") {
            const merged = { ...current, ...incoming } as Record<string, any>;
            if (key === "lockStatus") {
                for (const id of Object.keys(mergedDeletedIds)) delete merged[id];
                for (const id of Object.keys(mergedDeletedFolderIds)) delete merged[id];
            }
            await storage.set(key, merged);
        }
    }
}

// ------------------------------
// Low-level FS helpers (Scoped Storage)
// ------------------------------
async function ensureDir(folder: FolderRef, path: string) {
    // recursive true to create parents
    await ScopedStorage.mkdir({ folder, path, recursive: true });
}

async function existsFile(folder: FolderRef, path: string) {
    const res = await ScopedStorage.exists({ folder, path });
    return !!res?.exists && !res.isDirectory;
}

async function readJson(folder: FolderRef, path: string) {
    const { data } = await ScopedStorage.readFile({ folder, path, encoding: "utf8" });
    return JSON.parse(data || "null");
}

async function writeJson(folder: FolderRef, path: string, obj: any) {
    const json = JSON.stringify(obj, null, 2);
    await ScopedStorage.writeFile({ folder, path, data: json, encoding: "utf8" });
}
