import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useState } from "react";
import { MsAuthPlugin } from "@recognizebv/capacitor-plugin-msauth";
import {
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import { OneDriveAPI } from "./oneDriveApi";
import { base64ToBlob } from "../../utils/base64";
import mime from "mime";
import { mergeData, revertAssetPaths, SyncData } from "../merge";
import { useStorage } from "@/composable/storage";
import { useNoteStore } from "@/store/note";
import { useLabelStore } from "@/store/label";
import { useFolderStore } from "@/store/folder";

const decodeJwt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = atob(payload);
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const result = await MsAuthPlugin.login({
      clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
      tenant: "common",
      keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
      scopes: ["Files.ReadWrite", "User.Read"],
    });

    const tokenData = decodeJwt(result.accessToken);
    const expirationTime = tokenData?.exp
      ? tokenData.exp * 1000
      : Date.now() + 3600 * 1000;

    await SecureStoragePlugin.set({
      key: "onedrive_access_token",
      value: result.accessToken,
    });

    await SecureStoragePlugin.set({
      key: "onedrive_expiration_time",
      value: expirationTime.toString(),
    });

    return result.accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
};

const getValidAccessToken = async (): Promise<string | null> => {
  try {
    const tokenData = await SecureStoragePlugin.get({
      key: "onedrive_access_token",
    });
    const expiryData = await SecureStoragePlugin.get({
      key: "onedrive_expiration_time",
    });

    const accessToken = tokenData.value;
    const expirationTime = expiryData.value
      ? parseInt(expiryData.value, 10)
      : 0;

    if (!accessToken || Date.now() >= expirationTime) {
      return await refreshAccessToken();
    }

    return accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// OneDrive Auth Hook
// Handles authentication and token renewal 
// ─────────────────────────────────────────────────────────────

export const useOneDrive = () => {
  return { getValidAccessToken, refreshAccessToken };
};

interface SyncState {
  syncInProgress: boolean;
  syncError: string | null;
  lastSyncTime: number | null;
  localVersion: number;
  remoteVersion: number;
}

interface OneDriveSyncHookReturn {
  syncOneDrive: () => Promise<void>;
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
const useOneDriveSync = (): OneDriveSyncHookReturn => {
  const noteStore = useNoteStore.getState();
  const folderStore = useFolderStore.getState();
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

  const syncOneDrive = async () => {
    const { getValidAccessToken } = useOneDrive();
    const accessToken = await getValidAccessToken();

    setSyncState((prev) => ({
      ...prev,
      syncInProgress: true,
      syncError: null,
    }));
    setProgress(0);

    if (!accessToken) {
      throw new Error("Dropbox access token not found");
    }

    try {
      const onedrive = new OneDriveAPI(accessToken);

      try {
        await onedrive.filesGetMetadata(`/${SYNC_FOLDER_NAME}`);
      } catch (error: any) {
        if (error.status === 409) {
          await onedrive.createFolder(`/${SYNC_FOLDER_NAME}`);
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
        const remoteMetadataResponse = await onedrive.downloadFile(
          `/${SYNC_FOLDER_NAME}/data.json`
        );
        const remoteMetadataText = await (
          remoteMetadataResponse as any
        ).fileBlob.text();
        remoteData = JSON.parse(remoteMetadataText);
      } catch {
        // Use empty object
      }

      setProgress(20);

      const mergedData = await mergeData(localData, remoteData);

      await syncOnedriveAssets(onedrive, SYNC_FOLDER_NAME, accessToken);


      setProgress(80);


      await storage.set("notes", mergedData.data.notes);
      await storage.set("labels", mergedData.data.labels);
      await storage.set("folders", mergedData.data.folders);

      noteStore.retrieve();
      labelStore.retrieve();
      folderStore.retrieve();

      await storage.set('notes', mergedData.data.notes);

      const cleanedData = { ...mergedData };
      cleanedData.data.notes = await revertAssetPaths(mergedData.data.notes);

      await onedrive.uploadFile(
        `/${SYNC_FOLDER_NAME}/data.json`,
        JSON.stringify(cleanedData)
      );

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
  return { syncOneDrive, syncState, progress };
};

// ─────────────────────────────────────────────────────────────
// Asset Synchronization Function
// Handles two-way sync of asset folders between device and OneDrive
// ─────────────────────────────────────────────────────────────
async function syncOnedriveAssets(
  onedrive: OneDriveAPI,
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
        await onedrive.filesGetMetadata(remoteRootPath);
      } catch (error: any) {
        if (error.status === 409) {
          try {
            await onedrive.createFolder(remoteRootPath);
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
        const remoteFoldersResponse = await onedrive.listContents(
          remoteRootPath
        );

        remoteSubfolders = remoteFoldersResponse
          .filter((entry) => entry.mimeType === "folder")
          .map((entry) => entry.name);
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
            await onedrive.createFolder(remoteFolderPath);
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
          const remoteFilesResponse = await onedrive.listContents(
            remoteFolderPath
          );
          remoteFiles = remoteFilesResponse
            .filter((entry) => entry.mimeType !== "folder")
            .map((entry) => entry.name);
        } catch (error: any) {
          if (error.status !== 409) {
            console.error(
              `Error listing remote files for ${remoteFolderPath}:`,
              error
            );
          } else {
            console.error(`Remote folder ${remoteFolderPath} doesn't exist`);
          }
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
              } catch (e) {
              }

              await Filesystem.downloadFile({
                url: `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
                  remoteFilePath
                )}:/content`,
                path: localFilePath,
                directory: FilesystemDirectory.Data,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
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

              await onedrive.uploadFile(remoteFilePath, uploadedFile);

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

export default useOneDriveSync;
