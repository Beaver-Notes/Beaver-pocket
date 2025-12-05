import { useState } from "react";
import { base64ToBlob } from "../../utils/base64";
import { mergeData, revertAssetPaths, SyncData } from "../merge";
import {
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import mime from "mime";
import { driveService } from "./GoogleOauth";
import { GoogleDriveAPI } from "./GoogleDriveAPI";
import { useStorage } from "@/composable/storage";
import { useNoteStore } from "@/store/note";
import { useLabelStore } from "@/store/label";
import { useFolderStore } from "@/store/folder";

interface SyncState {
  syncInProgress: boolean;
  syncError: string | null;
  lastSyncTime: number | null;
  localVersion: number;
  remoteVersion: number;
}

interface DriveSyncHookReturn {
  syncDrive: () => Promise<void>;
  syncState: SyncState;
  progress: number;
}

interface AssetSyncLog {
  downloaded: string[];
  uploaded: string[];
  errors: {
    file: string;
    error: string;
    type: "download" | "upload";
  }[];
}

const SYNC_FOLDER_NAME = "BeaverNotesSync";


// ─────────────────────────────────────────────────────────────
// Google Drive Auth Hook
// Handles authentication and token renewal 
// ─────────────────────────────────────────────────────────────
export const useDrive = () => {
  const [user, setUser] = useState<any | null>(null);

  const loadAccessToken = async () => {
    try {
      await driveService.initialize();
      if (driveService.isAuthenticated()) {
        setUser({
          authentication: {
            accessToken: driveService.getAccessToken(),
          },
        });
        const accessToken = driveService.getAccessToken();
        if (!accessToken) {
          throw new Error("No access token available");
        }
        const driveAPI = new GoogleDriveAPI(accessToken);
        return driveAPI;
      }
    } catch (error) {
      console.error("Failed to load access token or user info", error);
      setUser(null);
    }
  };

  return { user, loadAccessToken };
};

// ─────────────────────────────────────────────────────────────
// Google Drive Sync Hook
// Handles syncing of notes, labels, deleted IDs, and assets
// ─────────────────────────────────────────────────────────────
export const useDriveSync = (): DriveSyncHookReturn => {
  const drive = useDrive();
  const storage = useStorage();
  const folderStore = useFolderStore.getState();
  const noteStore = useNoteStore.getState();
  const labelStore = useLabelStore.getState();
  const [syncState, setSyncState] = useState<SyncState>({
    syncInProgress: false,
    syncError: null,
    lastSyncTime: null,
    localVersion: 0,
    remoteVersion: 0,
  });
  const [progress, setProgress] = useState(0);

  const syncDrive = async () => {

    const driveAPI = await drive.loadAccessToken();
    if (!driveAPI) {
      console.warn("Drive API is not initialized. Please sign in.");
      setSyncState((prev) => ({
        ...prev,
        syncError: "Drive API not initialized. Please sign in.",
      }));
      return;
    }
    setSyncState((prev) => ({
      ...prev,
      syncInProgress: true,
      syncError: null,
    }));
    setProgress(0);

    try {
      let folderId = await driveAPI.checkFolderExists(SYNC_FOLDER_NAME);
      if (!folderId) {
        folderId = await driveAPI.createFolder(SYNC_FOLDER_NAME);
        if (!folderId) throw new Error("Failed to create sync folder");
      }

      let localData: SyncData = { data: { notes: {} } };

      localData.data.notes = noteStore.data ?? {};
      localData.data.folders = folderStore.data ?? {};
      localData.data.labels = labelStore.labels ?? [];
      localData.data.deletedIds = noteStore.deleted ?? {};

      let remoteData: SyncData = { data: { notes: {} } };
      const contents = await driveAPI.listContents(folderId);
      const dataFile = contents.find(
        (file: { name: string }) => file.name === "data.json"
      );

      if (dataFile) {
        try {
          const fileContent = await driveAPI.downloadFile(dataFile.id);
          remoteData = JSON.parse(
            typeof fileContent === "string"
              ? fileContent
              : await (fileContent as Blob).text()
          );
        } catch (e) {
          console.warn("Failed to download or parse remote data.json:", e);
        }
      } else {
      }

      setProgress(20);

      const mergedData = await mergeData(localData, remoteData);

      await syncGoogleDriveAssets(driveAPI, folderId);

      setProgress(80);

      await storage.set("notes", mergedData.data.notes);
      await storage.set("labels", mergedData.data.labels);
      await storage.set("folders", mergedData.data.folders);

      noteStore.retrieve();
      labelStore.retrieve();
      folderStore.retrieve();

      const cleanedData = { ...mergedData };

      cleanedData.data.notes = await revertAssetPaths(mergedData.data.notes);

      await driveAPI.uploadFile(
        "data.json",
        JSON.stringify(cleanedData),
        folderId,
        "application/json"
      );

      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        lastSyncTime: Date.now(),
        syncError: null,
      }));
      setProgress(100);
    } catch (error: any) {
      console.error("Google Drive Sync Error:", error?.message || error);
      console.error("Stack trace:", error?.stack || JSON.stringify(error));
      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        syncError: error instanceof Error ? error.message : "Unknown error",
      }));
      setProgress(0);
    }
  };

  return { syncDrive, syncState, progress };
};

// ─────────────────────────────────────────────────────────────
// Asset Synchronization Function
// Handles two-way sync of asset folders between device and google drive
// ─────────────────────────────────────────────────────────────
export async function syncGoogleDriveAssets(
  driveAPI: GoogleDriveAPI,
  folderId: string
): Promise<AssetSyncLog> {
  const assetTypes = [
    { local: "note-assets", remote: "assets" },
    { local: "file-assets", remote: "file-assets" },
  ];

  const syncLog: AssetSyncLog = {
    downloaded: [],
    uploaded: [],
    errors: [],
  };

  for (const assetType of assetTypes) {
    const localRootPath = `${assetType.local}`;
    let remoteRootId: string | null = null;

    try {
      await Filesystem.mkdir({
        path: localRootPath,
        directory: FilesystemDirectory.Data,
        recursive: true,
      }).catch(() => { });

      remoteRootId = await driveAPI.checkFolderExists(
        assetType.remote,
        folderId
      );
      if (!remoteRootId) {
        remoteRootId = await driveAPI.createFolder(assetType.remote, folderId);
      }

      if (!remoteRootId) {
        console.error(
          ` Failed to get/create remote root folder for ${assetType.remote}`
        );
        continue;
      }

      let localSubfolders: string[] = [];
      try {
        const listing = await Filesystem.readdir({
          path: localRootPath,
          directory: FilesystemDirectory.Data,
        });
        localSubfolders = listing.files.map((f) => f.name);
      } catch { }

      const remoteFolderContents = await driveAPI.listContents(remoteRootId);
      const remoteSubfolders = remoteFolderContents
        .filter(
          (item) => item.mimeType === "application/vnd.google-apps.folder"
        )
        .reduce((map, folder) => {
          map[folder.name] = folder.id;
          return map;
        }, {} as Record<string, string>);

      const allNoteIds = Array.from(
        new Set([...localSubfolders, ...Object.keys(remoteSubfolders)])
      );

      for (const noteId of allNoteIds) {
        const localFolderPath = `${localRootPath}/${noteId}`;
        let remoteNoteFolderId = remoteSubfolders[noteId] ?? null;

        if (!localSubfolders.includes(noteId)) {
          await Filesystem.mkdir({
            path: localFolderPath,
            directory: FilesystemDirectory.Data,
            recursive: true,
          }).catch(() => { });
        }

        if (!remoteNoteFolderId) {
          const createdFolderId = await driveAPI.createFolder(
            noteId,
            remoteRootId
          );
          if (!createdFolderId) continue;
          remoteNoteFolderId = createdFolderId;
        }

        if (!remoteNoteFolderId) continue;

        let localFiles: string[] = [];
        try {
          const res = await Filesystem.readdir({
            path: localFolderPath,
            directory: FilesystemDirectory.Data,
          });
          localFiles = res.files.map((f) => f.name);
        } catch { }

        const remoteFiles = await driveAPI.listContents(remoteNoteFolderId);
        const remoteFileMap = new Map(remoteFiles.map((f) => [f.name, f.id]));

        for (const [name, id] of remoteFileMap) {
          if (!localFiles.includes(name)) {
            try {
              const content = await driveAPI.downloadFile(id);
              let fileData: string | Blob;
              if (typeof content === "string" || content instanceof Blob) {
                fileData = content;
              } else if (content instanceof ArrayBuffer) {
                fileData = new Blob([content]);
              } else {
                throw new Error("Unsupported file content type");
              }
              await Filesystem.writeFile({
                path: `${localFolderPath}/${name}`,
                data: fileData,
                directory: FilesystemDirectory.Data,
              });

              syncLog.downloaded.push(`${assetType.remote}/${noteId}/${name}`);
            } catch (error) {
              console.error(`Download error for ${name}:`, error);
              syncLog.errors.push({
                file: `${assetType.remote}/${noteId}/${name}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "download",
              });
            }
          }
        }

        for (const fileName of localFiles) {
          if (!remoteFileMap.has(fileName)) {
            try {
              const fileData = await Filesystem.readFile({
                path: `${localFolderPath}/${fileName}`,
                directory: FilesystemDirectory.Data,
              });
              const mimeType =
                mime.getType(fileName) || "application/octet-stream";
              const blob = base64ToBlob(String(fileData.data), mimeType);

              await driveAPI.uploadFile(
                fileName,
                blob,
                remoteNoteFolderId,
                mimeType
              );

              syncLog.uploaded.push(`${assetType.local}/${noteId}/${fileName}`);
            } catch (error) {
              console.error(`Upload error for ${fileName}:`, error);
              syncLog.errors.push({
                file: `${assetType.local}/${noteId}/${fileName}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "upload",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing ${assetType.local}:`, error);
    }
  }

  return syncLog;
}

export default useDriveSync;
