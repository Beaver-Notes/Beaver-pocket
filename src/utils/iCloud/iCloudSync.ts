import { useState } from "react";
import {
  base64Encode,
  base64ToBlob,
  blobToBase64,
  blobToString,
} from "../base64";
import mime from "mime";
import iCloud from "./iCloud";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { mergeData, revertAssetPaths, SyncData } from "../merge";

interface SyncState {
  syncInProgress: boolean;
  syncError: string | null;
  lastSyncTime: number | null;
  localVersion: number;
  remoteVersion: number;
}

interface iCloudSyncHooks {
  synciCloud: () => Promise<void>;
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

const STORAGE_PATH = "notes/data.json";
const SYNC_FOLDER_NAME = "BeaverNotesSync";

const useiCloudSync = (setNotesState: any): iCloudSyncHooks => {
  const [progress, setProgress] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>({
    syncInProgress: false,
    syncError: null,
    lastSyncTime: null,
    localVersion: 0,
    remoteVersion: 0,
  });

  const synciCloud = async () => {
    setSyncState((prev) => ({
      ...prev,
      syncInProgress: true,
      syncError: null,
    }));
    setProgress(0);
    try {
      await iCloud.createFolder({ folderName: `${SYNC_FOLDER_NAME}` });

      let localData: SyncData = { notes: {} };
      try {
        const localFileData = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: FilesystemDirectory.Data,
          encoding: FilesystemEncoding.UTF8,
        });
        localData = JSON.parse(localFileData.data as string);
      } catch {
        // No local data, use empty object
      }

      let remoteData: SyncData = { notes: {} };
      try {
        const { fileData: base64Data } = await iCloud.downloadFile({
          fileName: `${SYNC_FOLDER_NAME}/data.json`,
        });
        const fileBlob = base64ToBlob(base64Data, "application/json");
        const fileString = await blobToString(fileBlob);
        remoteData = JSON.parse(fileString);
      } catch {
        // No remote data, use empty object
      }

      setProgress(20);

      const mergedData = await mergeData(localData, remoteData);

      await synciCloudAssets(SYNC_FOLDER_NAME);

      setProgress(80);

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify(mergedData),
        directory: FilesystemDirectory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(mergedData.notes);
      document.dispatchEvent(new Event("reload"));

      const cleanedData = { ...mergedData };
      cleanedData.notes = await revertAssetPaths(mergedData.notes);

      const base64Data = base64Encode(
        JSON.stringify({ data: { notes: cleanedData } })
      );

      await iCloud.uploadFile({
        fileName: `${SYNC_FOLDER_NAME}/data.json`,
        fileData: base64Data,
      });

      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        lastSyncTime: Date.now(),
      }));

      setProgress(100);
    } catch (error) {
      console.error("Dropbox Sync Error:", error);

      setSyncState((prev) => ({
        ...prev,
        syncInProgress: false,
        syncError: error instanceof Error ? error.message : "Unknown error",
      }));

      setProgress(0);
    }
  };

  return { synciCloud, syncState, progress };
};

async function getFolderMetadata(folderPath: string) {
  try {
    const response = await iCloud.checkFolderExists({ folderName: folderPath });

    if (response.exists) {
      return { exists: true, path: folderPath, type: "directory" };
    } else {
      return { exists: false };
    }
  } catch (error) {
    console.error("Error retrieving folder metadata:", error);
    return { exists: false };
  }
}

async function synciCloudAssets(syncFolderName: string): Promise<AssetSyncLog> {
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
          `Error creating local root folder ${localRootPath}:`,
          error
        );
      }

      let remoteRootExists = true;
      try {
        const metadata = await getFolderMetadata(remoteRootPath);
        if (!metadata.exists) {
          await iCloud.createFolder({ folderName: remoteRootPath });
        }
      } catch (error) {
        try {
          await iCloud.createFolder({ folderName: remoteRootPath });
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
        continue; // Skip to next asset type
      }

      let remoteSubfolders: string[] = [];
      try {
        const remoteFolderResponse = await iCloud.listContents({
          folderName: remoteRootPath,
        });
        remoteSubfolders = remoteFolderResponse.files
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
        console.log(
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
            // Continue anyway - the folder might already exist or be created during file writes
          }
        }

        let remoteSubfolderExists = remoteSubfolders.includes(noteId);
        if (!remoteSubfolderExists) {
          try {
            await iCloud.createFolder({ folderName: remoteFolderPath });
            remoteSubfolderExists = true;
          } catch (error: any) {
            if (error.status === 409) {
              // 409 means the folder already exists, which is fine
              remoteSubfolderExists = true;
            } else {
              console.error(
                `Error creating remote folder ${remoteFolderPath}:`,
                error
              );
              // Continue anyway - we'll try to list files in case the folder exists but had another error
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
          const remoteFilesResponse = await iCloud.listContents({
            folderName: remoteFolderPath,
          });
          remoteFiles = remoteFilesResponse.files
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
              } catch (e) {}

              const { fileData: base64FileData } = await iCloud.downloadFile({
                fileName: remoteFilePath,
              });
              const fileBlob = base64ToBlob(
                base64FileData,
                mime.getType(remoteFilePath) as string
              );
              const fileBase64String = await blobToBase64(fileBlob);

              await Filesystem.writeFile({
                path: localFilePath,
                directory: Directory.Data,
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
                directory: Directory.Data,
              });

              await iCloud.uploadFile({
                fileName: remoteFilePath,
                fileData: String(fileData),
              });

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

export default useiCloudSync;
