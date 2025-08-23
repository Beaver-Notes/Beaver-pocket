import { Dropbox } from "dropbox";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { useDropbox } from "./DropboxApi";
import { useState } from "react";
import { base64ToBlob } from "../../utils/base64";
import mime from "mime";
import { mergeData, revertAssetPaths, SyncData } from "../merge";
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

interface DropboxSyncHookReturn {
  syncDropbox: () => Promise<void>;
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
// Dropbox Sync Hook
// Handles syncing of notes, labels, deleted IDs, and assets
// ─────────────────────────────────────────────────────────────
const useDropboxSync = (): DropboxSyncHookReturn => {
  const folderStore = useFolderStore.getState();
  const noteStore = useNoteStore.getState();
  const labelStore = useLabelStore.getState();
  const storage = useStorage();
  const [syncState, setSyncState] = useState<SyncState>({
    syncInProgress: false,
    syncError: null,
    lastSyncTime: null,
    localVersion: 0,
    remoteVersion: 0,
  });
  const [progress, setProgress] = useState(0);

  const syncDropbox = async () => {
    const { checkTokenExpiration, accessToken } = await useDropbox();
    setSyncState((prev) => ({
      ...prev,
      syncInProgress: true,
      syncError: null,
    }));
    setProgress(0);

    try {
      checkTokenExpiration();
      if (!accessToken) {
        throw new Error("Dropbox access token not found");
      }
      const dbx = new Dropbox({ accessToken });

      try {
        await dbx.filesGetMetadata({ path: `/${SYNC_FOLDER_NAME}` });
      } catch (error: any) {
        if (error.status === 409) {
          await dbx.filesCreateFolderV2({
            path: `/${SYNC_FOLDER_NAME}`,
            autorename: false,
          });
        } else {
          throw error;
        }
      }

      let localData: SyncData = { data: { notes: {} } };

      localData.data.notes = noteStore.data ?? {};
      localData.data.folders = folderStore.data ?? {};
      localData.data.labels = labelStore.labels ?? [];
      localData.data.deletedIds = noteStore.deleted ?? {};

      let remoteData: SyncData = { data: { notes: {} } };
      try {
        const remoteMetadataResponse = await dbx.filesDownload({
          path: `/${SYNC_FOLDER_NAME}/data.json`,
        });
        const remoteMetadataText = await (
          remoteMetadataResponse.result as any
        ).fileBlob.text();
        remoteData = JSON.parse(remoteMetadataText);
      } catch {
        // Use empty object
      }

      setProgress(20);

      const mergedData = await mergeData(localData, remoteData);

      await syncDropboxAssets(dbx, SYNC_FOLDER_NAME, accessToken);

      setProgress(80);

      await storage.set("notes", mergedData.data.notes);
      noteStore.retrieve();

      const cleanedData = { ...mergedData };
      cleanedData.data.notes = await revertAssetPaths(mergedData.data.notes);

      await dbx.filesUpload({
        path: `/${SYNC_FOLDER_NAME}/data.json`,
        contents: JSON.stringify(cleanedData),
        mode: { ".tag": "overwrite" },
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

  return { syncDropbox, syncState, progress };
};

// ─────────────────────────────────────────────────────────────
// Asset Synchronization Function
// Handles two-way sync of asset folders between device and Dropbox
// ─────────────────────────────────────────────────────────────
async function syncDropboxAssets(
  dbx: Dropbox,
  syncFolderName: string,
  accessToken: string
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
    const remoteRootPath = `/${syncFolderName}/${assetType.remote}`;

    try {
      console.log(`Starting sync for ${assetType.local} assets`);

      try {
        await Filesystem.mkdir({
          path: localRootPath,
          directory: FilesystemDirectory.Data,
          recursive: true,
        });
      } catch (error) {
        console.log(
          `Local root folder ${localRootPath} already exists or couldn't be created`
        );
      }

      let remoteRootExists = true;
      try {
        await dbx.filesGetMetadata({ path: remoteRootPath });
      } catch (error: any) {
        if (error.status === 409) {
          try {
            await dbx.filesCreateFolderV2({
              path: remoteRootPath,
              autorename: false,
            });
          } catch (e) {
            console.error(
              `Failed to create remote root folder: ${remoteRootPath}`,
              e
            );
            remoteRootExists = false;
          }
        } else {
          console.error(
            `Error checking remote root folder: ${remoteRootPath}`,
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
        const remoteFoldersResponse = await dbx.filesListFolder({
          path: remoteRootPath,
        });
        remoteSubfolders = remoteFoldersResponse.result.entries
          .filter((entry) => entry[".tag"] === "folder")
          .map((entry) => entry.name);

        console.log(
          `Found ${remoteSubfolders.length} remote subfolders for ${
            assetType.local
          }: ${remoteSubfolders.join(", ")}`
        );
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
        console.log(
          `Found ${localSubfolders.files.length} local subfolders for ${assetType.local}`
        );
      } catch (error) {
        console.log(
          `No local subfolders found for ${localRootPath} or directory doesn't exist`
        );
      }

      const localFolderNames = localSubfolders.files.map((file) => file.name);

      const allNoteIds = [
        ...new Set([...localFolderNames, ...remoteSubfolders]),
      ];
      console.log(
        `Processing ${allNoteIds.length} unique note IDs for ${assetType.local}`
      );

      for (const noteId of allNoteIds) {
        const localFolderPath = `${localRootPath}/${noteId}`;
        const remoteFolderPath = `${remoteRootPath}/${noteId}`;

        console.log(`Processing note ID: ${noteId}`);
        console.log(`Local path: ${localFolderPath}`);
        console.log(`Remote path: ${remoteFolderPath}`);

        if (!localFolderNames.includes(noteId)) {
          console.log(`Creating missing local folder: ${localFolderPath}`);
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
            console.log(`Creating remote folder ${remoteFolderPath}`);
            await dbx.filesCreateFolderV2({
              path: remoteFolderPath,
              autorename: false,
            });
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
          console.log(
            `Found ${localFiles.files.length} local files in ${localFolderPath}`
          );
        } catch (error) {
          console.log(
            `No local files found in ${localFolderPath} or directory doesn't exist yet`
          );
        }

        let remoteFiles: string[] = [];
        try {
          const remoteFilesResponse = await dbx.filesListFolder({
            path: remoteFolderPath,
          });
          remoteFiles = remoteFilesResponse.result.entries
            .filter((entry) => entry[".tag"] === "file")
            .map((entry) => entry.name);

          console.log(
            `Found ${
              remoteFiles.length
            } remote files in ${remoteFolderPath}: ${remoteFiles.join(", ")}`
          );
        } catch (error: any) {
          if (error.status !== 409) {
            console.error(
              `Error listing remote files for ${remoteFolderPath}:`,
              error
            );
          } else {
            console.log(`Remote folder ${remoteFolderPath} doesn't exist`);
          }
        }

        if (remoteFiles.length > 0) {
          const filesToDownload = remoteFiles.filter(
            (file) =>
              !localFiles.files.some((localFile) => localFile.name === file)
          );

          console.log(
            `Need to download ${filesToDownload.length} files from ${remoteFolderPath}`
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
              } catch (e) {
              }

              await Filesystem.downloadFile({
                url: `https://content.dropboxapi.com/2/files/download`,
                path: localFilePath,
                directory: FilesystemDirectory.Data,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Dropbox-API-Arg": JSON.stringify({ path: remoteFilePath }),
                },
              });

              syncLog.downloaded.push(`${assetType.remote}/${noteId}/${file}`);
              console.log(
                `Successfully downloaded: ${assetType.remote}/${noteId}/${file}`
              );
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

          console.log(
            `Need to upload ${filesToUpload.length} files to ${remoteFolderPath}`
          );

          for (const file of filesToUpload) {
            const localFilePath = `${localFolderPath}/${file.name}`;
            const remoteFilePath = `${remoteFolderPath}/${file.name}`;

            console.log(`Uploading ${localFilePath} to ${remoteFilePath}`);

            try {
              const fileData = await Filesystem.readFile({
                path: localFilePath,
                directory: FilesystemDirectory.Data,
              });

              if (!fileData.data) {
                throw new Error("File data is empty");
              }

              const fileType =
                mime.getType(file.name) || "application/octet-stream";

              const blob = base64ToBlob(String(fileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: fileType,
              });

              await dbx.filesUpload({
                path: remoteFilePath,
                contents: uploadedFile,
                mode: { ".tag": "overwrite" },
              });

              syncLog.uploaded.push(
                `${assetType.local}/${noteId}/${file.name}`
              );
              console.log(
                `Successfully uploaded: ${assetType.local}/${noteId}/${file.name}`
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

      console.log(`Completed sync for ${assetType.local} assets`);
    } catch (error) {
      console.error(`Error syncing ${assetType.local} assets:`, error);
    }
  }

  return syncLog;
}

export default useDropboxSync;
