import { Dropbox } from "dropbox";
import {
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { useDropbox } from "./DropboxUtil";
import { useState } from "react";
import { base64ToBlob } from "../../utils/base64";
import mime from "mime";

// Types for improved type safety
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

interface Note {
  id: string;
  content: any;
  updatedAt?: string;
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
const SYNC_FOLDER_NAME = "BeaverNotesSync"; // Fixed folder name instead of date-based

const useDropboxSync = (): DropboxSyncHookReturn => {
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

      // Create sync folder if it doesn't exist
      try {
        await dbx.filesGetMetadata({ path: `/${SYNC_FOLDER_NAME}` });
      } catch (error: any) {
        if (error.status === 409) {
          // Folder doesn't exist, create it
          await dbx.filesCreateFolderV2({
            path: `/${SYNC_FOLDER_NAME}`,
            autorename: false,
          });
        } else {
          throw error;
        }
      }

      // Read local data
      let localData: { data?: { notes?: Record<string, Note> } } = {};
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

      // Read remote data
      let remoteData: { data?: { notes?: Record<string, Note> } } = {};
      try {
        const remoteMetadataResponse = await dbx.filesDownload({
          path: `/${SYNC_FOLDER_NAME}/data.json`,
        });
        const remoteMetadataText = await (
          remoteMetadataResponse.result as any
        ).fileBlob.text();
        remoteData = JSON.parse(remoteMetadataText);
      } catch {
        // No remote data, use empty object
      }

      setProgress(20);

      // Merge notes
      const localNotes = localData.data?.notes || {};
      const remoteNotes = remoteData.data?.notes || {};
      const mergedNotes = mergeNotes(localNotes, remoteNotes);

      // Sync assets and collect logs
      const assetSyncLogs = await syncDropboxAssets(dbx, SYNC_FOLDER_NAME);

      // Log asset sync results
      console.log("Asset Sync Results:", {
        downloaded: assetSyncLogs.downloaded.length,
        uploaded: assetSyncLogs.uploaded.length,
        errors: assetSyncLogs.errors.length,
        details: assetSyncLogs,
      });

      setProgress(80);

      // Write merged data
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes: mergedNotes } }),
        directory: FilesystemDirectory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // Upload merged data to Dropbox
      await dbx.filesUpload({
        path: `/${SYNC_FOLDER_NAME}/data.json`,
        contents: JSON.stringify({ data: { notes: mergedNotes } }),
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

// Modify mergeNotes function to adjust asset paths
function mergeNotes(
  localNotes: Record<string, Note>,
  remoteNotes: Record<string, Note>
): Record<string, Note> {
  const mergedNotes: Record<string, Note> = { ...localNotes };

  for (const [noteId, remoteNote] of Object.entries(remoteNotes)) {
    const localNote = mergedNotes[noteId];

    // Adjust asset paths for imported notes
    if (
      remoteNote.content &&
      typeof remoteNote.content === "object" &&
      "content" in remoteNote.content
    ) {
      if (remoteNote.content.content) {
        remoteNote.content.content = remoteNote.content.content.map(
          (node: any) => {
            if (node.type === "image" && node.attrs && node.attrs.src) {
              node.attrs.src = node.attrs.src.replace(
                "assets://",
                `note-assets/${noteId}/`
              );
            }
            if (
              (node.type === "fileEmbed" ||
                node.type === "Audio" ||
                node.type === "Video") &&
              node.attrs &&
              node.attrs.src
            ) {
              node.attrs.src = node.attrs.src.replace(
                "file-assets://",
                `file-assets/${noteId}/`
              );
            }
            return node;
          }
        );
      }
    }

    // Merge note logic
    if (!localNote) {
      // New note from remote
      mergedNotes[noteId] = remoteNote;
    } else if (
      remoteNote.updatedAt &&
      localNote.updatedAt &&
      new Date(remoteNote.updatedAt) > new Date(localNote.updatedAt)
    ) {
      // Remote note is newer
      mergedNotes[noteId] = remoteNote;
    }
  }

  return mergedNotes;
}

// Update syncDropboxAssets to handle note ID subfolders
async function syncDropboxAssets(
  dbx: Dropbox,
  syncFolderName: string
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

      // Ensure remote root folder exists
      try {
        await dbx.filesGetMetadata({ path: remoteRootPath });
      } catch (error: any) {
        if (error.status === 409) {
          await dbx.filesCreateFolderV2({
            path: remoteRootPath,
            autorename: false,
          });
        } else {
          throw error;
        }
      }

      // Get list of note ID subfolders locally
      let localSubfolders;
      try {
        localSubfolders = await Filesystem.readdir({
          path: localRootPath,
          directory: FilesystemDirectory.Data,
        });
      } catch {
        localSubfolders = { files: [] };
      }

      for (const subfolder of localSubfolders.files) {
        const noteId = subfolder.name;
        const localFolderPath = `${localRootPath}/${noteId}`;
        const remoteFolderPath = `${remoteRootPath}/${noteId}`;

        try {
          // Ensure remote subfolder exists
          try {
            await dbx.filesGetMetadata({ path: remoteFolderPath });
          } catch (error: any) {
            if (error.status === 409) {
              await dbx.filesCreateFolderV2({
                path: remoteFolderPath,
                autorename: false,
              });
            } else {
              throw error;
            }
          }

          // List local files in subfolder
          let localFiles;
          try {
            localFiles = await Filesystem.readdir({
              path: localFolderPath,
              directory: FilesystemDirectory.Data,
            });
          } catch {
            localFiles = { files: [] };
          }

          // List remote files in subfolder
          let remoteFiles: string[] = [];
          try {
            const remoteFilesResponse = await dbx.filesListFolder({
              path: remoteFolderPath,
            });
            remoteFiles = remoteFilesResponse.result.entries
              .filter((entry) => entry[".tag"] === "file")
              .map((entry) => entry.name);
          } catch (error: any) {
            if (error.status !== 409) throw error;
          }

          // Download new files from Dropbox
          const filesToDownload = remoteFiles.filter(
            (file) =>
              !localFiles.files.some((localFile) => localFile.name === file)
          );

          for (const file of filesToDownload) {
            const remoteFilePath = `${remoteFolderPath}/${file}`;
            const localFilePath = `${localFolderPath}/${file}`;

            try {
              const downloadResponse = await dbx.filesDownload({
                path: remoteFilePath,
              });
              const fileBlob = (downloadResponse.result as any).fileBlob;
              const fileBuffer = await fileBlob.arrayBuffer();

              await Filesystem.writeFile({
                path: localFilePath,
                data: fileBuffer,
                directory: FilesystemDirectory.Data,
              });

              syncLog.downloaded.push(`${assetType.remote}/${noteId}/${file}`);
            } catch (error) {
              syncLog.errors.push({
                file: `${assetType.remote}/${noteId}/${file}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "download",
              });
            }
          }

          // Upload new local files to Dropbox
          const filesToUpload = localFiles.files.filter(
            (localFile) => !remoteFiles.includes(localFile.name)
          );

          for (const file of filesToUpload) {
            const localFilePath = `${localFolderPath}/${file.name}`;
            const remoteFilePath = `${remoteFolderPath}/${file.name}`;

            try {
              const fileData = await Filesystem.readFile({
                path: localFilePath,
                directory: FilesystemDirectory.Data,
              });

              if (!fileData.data) {
                throw new Error("File data is empty");
              }

              // Detect MIME type
              const fileType =
                mime.getType(file.name) || "application/octet-stream";

              // Convert to Blob and create File object
              const blob = base64ToBlob(String(fileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: fileType,
              });

              // Upload the file
              await dbx.filesUpload({
                path: remoteFilePath,
                contents: uploadedFile,
                mode: { ".tag": "overwrite" },
              });

              syncLog.uploaded.push(
                `${assetType.local}/${noteId}/${file.name}`
              );
            } catch (error) {
              syncLog.errors.push({
                file: `${assetType.local}/${noteId}/${file.name}`,
                error: error instanceof Error ? error.message : "Unknown error",
                type: "upload",
              });
            }
          }
        } catch (error) {
          console.error(`Error syncing assets for note ${noteId}:`, error);
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
