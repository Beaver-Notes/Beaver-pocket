import { useState } from "react";
import { WebDavService } from "./webDavApi";
import {
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import { base64Encode, blobToBase64, blobToString } from "../base64";
import { mergeData, revertAssetPaths, SyncData } from "../merge";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useStorage } from "@/composable/storage";
import { useNoteStore } from "@/store/note";
import { useLabelStore } from "@/store/label";

interface SyncState {
  syncInProgress: boolean;
  syncError: string | null;
  lastSyncTime: number | null;
  localVersion: number;
  remoteVersion: number;
}

interface WebDAVSyncHookReturn {
  syncWebDAV: () => Promise<void>;
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
// Webdav Sync Hook
// Handles syncing of notes, labels, deleted IDs, and assets
// ─────────────────────────────────────────────────────────────
const useWebDAVSync = (): WebDAVSyncHookReturn => {
  const noteStore = useNoteStore.getState();
  const labelStore = useLabelStore.getState();
  const storage = useStorage();
  const [progress, setProgress] = useState<number>(0);
  const [syncState, setSyncState] = useState<SyncState>({
    syncInProgress: false,
    syncError: null,
    lastSyncTime: null,
    localVersion: 0,
    remoteVersion: 0,
  });

  const syncWebDAV = async () => {
    const baseUrl = await SecureStoragePlugin.get({ key: "baseurl" });
    const username = await SecureStoragePlugin.get({ key: "username" });
    const password = await SecureStoragePlugin.get({ key: "password" });
    const webDavService = new WebDavService({
      baseUrl: baseUrl.value,
      username: username.value,
      password: password.value,
    });

    setSyncState((prev) => ({
      ...prev,
      syncInProgress: true,
      syncError: null,
    }));
    setProgress(0);

    try {
      const folderPath = `${SYNC_FOLDER_NAME}`;

      const exists = await webDavService.folderExists(folderPath);
      if (!exists) {
        await webDavService.createFolder(folderPath);
      }

      let localData: SyncData = { data: { notes: {} } };

      localData.data.notes = noteStore.data ?? {};
      localData.data.labels = labelStore.labels ?? [];
      localData.data.deletedIds = noteStore.deleted ?? {};

      let remoteData: SyncData = { data: { notes: {} } };
      try {
        const fileData = await webDavService.get(`${folderPath}/data.json`);
        const fileString = await blobToString(fileData);
        remoteData = JSON.parse(fileString);
      } catch {
        // Use empty object
      }

      setProgress(20);

      const mergedData = await mergeData(localData, remoteData);

      await syncWebDAVAssets(folderPath, webDavService);

      setProgress(80);

      await storage.set("notes", mergedData.data.notes);
      noteStore.retrieve();

      const cleanedData = { ...mergedData };
      cleanedData.data.notes = await revertAssetPaths(mergedData.data.notes);

      const base64Data = base64Encode(JSON.stringify(cleanedData));

      await webDavService.upload(`${folderPath}/data.json`, base64Data);

      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        lastSyncTime: Date.now(),
      }));

      setProgress(100);
    } catch (error) {
      console.error("Sync Error:", error);

      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        syncError: error instanceof Error ? error.message : "Unknown error",
      }));

      setProgress(0);
    }
  };

  return { syncWebDAV, syncState, progress };
};

async function getFolderMetadata(
  folderPath: string,
  webDavService: WebDavService
) {
  try {
    const response = await webDavService.folderExists(folderPath);

    if (response) {
      return { exists: true, path: folderPath, type: "directory" };
    } else {
      return { exists: false };
    }
  } catch (error) {
    console.error("Error retrieving folder metadata:", error);
    return { exists: false };
  }
}

// ─────────────────────────────────────────────────────────────
// Asset Synchronization Function
// Handles two-way sync of asset folders between device and WebDAV
// ─────────────────────────────────────────────────────────────
async function syncWebDAVAssets(
  syncFolderName: string,
  webDavService: WebDavService
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
    const remoteRootPath = `${syncFolderName}/${assetType.remote}`;

    try {
      try {
        await Filesystem.mkdir({
          path: localRootPath,
          directory: FilesystemDirectory.Data,
          recursive: true,
        });
      } catch (error) {
        console.error(
          `Local root folder ${localRootPath} already exists or couldn't be created`
        );
      }

      let remoteRootExists = true;
      try {
        const metadata = await getFolderMetadata(remoteRootPath, webDavService);
        if (!metadata.exists) {
          await webDavService.createFolder(remoteRootPath);
        }
      } catch (error) {
        try {
          await webDavService.createFolder(remoteRootPath);
        } catch (error) {
          console.error(
            `Error creating remote root folder ${remoteRootPath}:`,
            error
          );
          remoteRootExists = false;
        }
      }

      if (!remoteRootExists) {
        console.error(
          `Cannot proceed with sync for ${assetType.local} - remote folder issue`
        );
        continue;
      }

      let remoteSubfolders: string[] = [];
      try {
        const remoteFolderResponse = await webDavService.getDirectoryContent(
          remoteRootPath
        );
        remoteSubfolders = remoteFolderResponse
          .filter((file) => file.type === "directory")
          .map((file) => file.name);
      } catch (error: any) {
        console.error(
          `Error listing remote folders in ${remoteRootPath}:`,
          error
        );
        remoteSubfolders = [];
      }

      let localSubfolders: { files: { name: string }[] } = { files: [] };
      try {
        localSubfolders = await Filesystem.readdir({
          path: localRootPath,
          directory: FilesystemDirectory.Data,
        });
      } catch (error) {
        console.error(
          `No local subfolders found for ${localRootPath} or directory doesn't exist`
        );
      }

      const localFolderNames = localSubfolders.files.map((file) => file.name);

      const allNoteIds = [
        ...new Set([...localFolderNames, ...remoteSubfolders]),
      ];

      for (const noteId of allNoteIds) {
        const localFolderPath = `${localRootPath}/${noteId}`;
        const remoteFolderPath = `${remoteRootPath}/${noteId}`;

        if (!localFolderNames.includes(noteId)) {
          try {
            await Filesystem.mkdir({
              path: localFolderPath,
              directory: FilesystemDirectory.Data,
              recursive: true,
            });
          } catch (error) {
            console.error(
              `Error creating local folder ${localFolderPath}:`,
              error
            );
          }
        }

        let remoteSubfolderExists = remoteSubfolders.includes(noteId);
        if (!remoteSubfolderExists) {
          try {
            await webDavService.createFolder(remoteFolderPath);
            remoteSubfolderExists = true;
          } catch (error: any) {
            if (error.status === 409) {
              remoteSubfolderExists = true;
            } else {
              console.error(
                `Error creating remote folder ${remoteFolderPath}:`,
                error
              );
            }
          }
        }

        let localFiles: { files: { name: string }[] } = { files: [] };
        try {
          localFiles = await Filesystem.readdir({
            path: localFolderPath,
            directory: FilesystemDirectory.Data,
          });
        } catch (error) {
          console.error(
            `No local files found in ${localFolderPath} or directory doesn't exist yet`
          );
        }

        let remoteFiles: string[] = [];
        try {
          const remoteFilesResponse = await webDavService.getDirectoryContent(
            remoteFolderPath
          );
          remoteFiles = remoteFilesResponse
            .filter((file) => file.type === "file")
            .map((file) => file.name);
        } catch (error: any) {
          console.error(`Remote folder ${remoteFolderPath} doesn't exist`);
        }

        if (remoteFiles.length > 0) {
          const filesToDownload = remoteFiles.filter(
            (file) =>
              !localFiles.files.some((localFile) => localFile.name === file)
          );

          for (const file of filesToDownload) {
            const remoteFilePath = `${remoteFolderPath}/${file}`;
            const localFilePath = `${localFolderPath}/${file}`;

            try {
              try {
                await Filesystem.mkdir({
                  path: localFolderPath,
                  directory: FilesystemDirectory.Data,
                  recursive: true,
                });
              } catch (e) { }

              const fileData = await webDavService.get(remoteFilePath);
              const fileBase64String = await blobToBase64(fileData);

              await Filesystem.writeFile({
                path: localFilePath,
                directory: FilesystemDirectory.Data,
                data: fileBase64String,
              });

              syncLog.downloaded.push(`${assetType.remote}/${noteId}/${file}`);
            } catch (error) {
              console.error(`Error downloading ${remoteFilePath}:`, error);
              syncLog.errors.push({
                file: `${assetType.remote}/${noteId}/${file}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "download",
              });
            }
          }
        }

        if (localFiles.files.length > 0 && remoteSubfolderExists) {
          const filesToUpload = localFiles.files.filter(
            (localFile) => !remoteFiles.includes(localFile.name)
          );

          for (const file of filesToUpload) {
            const localFilePath = `${localFolderPath}/${file.name}`;
            const remoteFilePath = `${remoteFolderPath}/${file.name}`;

            try {
              const { data: fileData } = await Filesystem.readFile({
                path: localFilePath,
                directory: FilesystemDirectory.Data,
              });

              await webDavService.upload(remoteFilePath, String(fileData));

              syncLog.uploaded.push(
                `${assetType.local}/${noteId}/${file.name}`
              );
            } catch (error) {
              console.error(`Error uploading ${localFilePath}:`, error);
              syncLog.errors.push({
                file: `${assetType.local}/${noteId}/${file.name}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "upload",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing ${assetType.local} assets:`, error);
    }
  }

  return syncLog;
}

export default useWebDAVSync;
