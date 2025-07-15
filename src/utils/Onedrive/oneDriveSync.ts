import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useState } from "react";
import { MsAuthPlugin } from "@recognizebv/capacitor-plugin-msauth";
import {
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { OneDriveAPI } from "./oneDriveApi";
import { base64ToBlob } from "../../utils/base64";
import mime from "mime";
import { mergeData, revertAssetPaths, SyncData } from "../merge";

const decodeJwt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = atob(payload); // Decode base64 string
    return JSON.parse(decodedPayload); // Parse the JSON
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const result = await MsAuthPlugin.login({
      clientId: import.meta.env.VITE_ONEDRIDE_CLIENT_ID,
      tenant: "common",
      keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
      scopes: ["Files.ReadWrite", "User.Read"],
    });

    const tokenData = decodeJwt(result.accessToken);
    const expirationTime = tokenData?.exp
      ? tokenData.exp * 1000 // Convert `exp` from seconds to milliseconds
      : Date.now() + 3600 * 1000; // Default to 1 hour if `exp` is missing

    // Save the access token and expiration time to secure storage
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

const STORAGE_PATH = "notes/data.json";
const SYNC_FOLDER_NAME = "BeaverNotesSync";

const useOneDriveSync = (setNotesState: any): OneDriveSyncHookReturn => {
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
          // Folder doesn't exist, create it
          await onedrive.createFolder(`/${SYNC_FOLDER_NAME}`);
        } else {
          throw error;
        }
      }

      // Read local data
      let localData: SyncData = { data: { notes: {} } };
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
        // No remote data, use empty object
      }

      setProgress(20);

      // Merge notes
      const mergedData = await mergeData(localData, remoteData);

      // Sync assets and collect logs
      await syncOnedriveAssets(onedrive, SYNC_FOLDER_NAME, accessToken);

      // Log asset sync results

      setProgress(80);

      // Write merged data
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify(mergedData),
        directory: FilesystemDirectory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(mergedData.data.notes);

      // Reverse paths before uploading
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
      // Ensure local root folder exists
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

      // Ensure remote root folder exists
      let remoteRootExists = true;
      try {
        await onedrive.filesGetMetadata(remoteRootPath);
      } catch (error: any) {
        if (error.status === 409) {
          // Folder doesn't exist, create it
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
        continue; // Skip to next asset type
      }

      // Get list of note ID subfolders from Dropbox
      let remoteSubfolders: string[] = [];
      try {
        const remoteFoldersResponse = await onedrive.listContents(
          remoteRootPath
        );

        // Filter for folders (since OneDrive API distinguishes files from folders differently)
        remoteSubfolders = remoteFoldersResponse
          .filter((entry) => entry.mimeType === "folder") // Check for folders
          .map((entry) => entry.name);
      } catch (error: any) {
        console.error(
          `Error listing remote folders in ${remoteRootPath}:`,
          error
        );
        // Continue even with errors - use an empty array
        remoteSubfolders = [];
      }

      // Get list of note ID subfolders locally
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
        // Continue with empty array
      }

      // Convert localSubfolders.files to an array of folder names
      const localFolderNames = localSubfolders.files.map((file) => file.name);

      // Process all unique noteIds from both local and remote
      const allNoteIds = [
        ...new Set([...localFolderNames, ...remoteSubfolders]),
      ];

      for (const noteId of allNoteIds) {
        const localFolderPath = `${localRootPath}/${noteId}`;
        const remoteFolderPath = `${remoteRootPath}/${noteId}`;

        // Ensure local subfolder exists
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

        // Check if remote subfolder exists and create if needed
        let remoteSubfolderExists = remoteSubfolders.includes(noteId);
        if (!remoteSubfolderExists) {
          try {
            await onedrive.createFolder(remoteFolderPath);
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

        // List local files in subfolder
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
          // Continue with empty array
        }

        // List remote files in subfolder
        let remoteFiles: string[] = [];
        try {
          const remoteFilesResponse = await onedrive.listContents(
            remoteFolderPath
          );
          remoteFiles = remoteFilesResponse
            .filter((entry) => entry.mimeType !== "folder") // Only include files
            .map((entry) => entry.name);
        } catch (error: any) {
          // If status is 409, it means folder not found - we can skip
          // Any other error, log it but try to continue
          if (error.status !== 409) {
            console.error(
              `Error listing remote files for ${remoteFolderPath}:`,
              error
            );
          } else {
            console.error(`Remote folder ${remoteFolderPath} doesn't exist`);
          }
          // We'll continue with an empty array
        }

        // Download new files from Dropbox - only if we found remote files
        if (remoteFiles.length > 0) {
          const filesToDownload = remoteFiles.filter(
            (file) =>
              !localFiles.files.some((localFile) => localFile.name === file)
          );

          // Replace the existing download code block with this
          for (const file of filesToDownload) {
            const remoteFilePath = `${remoteFolderPath}/${file}`;
            const localFilePath = `${localFolderPath}/${file}`;

            try {
              // Ensure local directory exists before writing file
              try {
                await Filesystem.mkdir({
                  path: localFolderPath,
                  directory: FilesystemDirectory.Data,
                  recursive: true,
                });
              } catch (e) {
                // Ignore error if directory already exists
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

        // Upload new local files to Dropbox - only if we have local files
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

              // Detect MIME type
              const fileType =
                mime.getType(file.name) || "application/octet-stream";

              // Convert to Blob and create File object
              const blob = base64ToBlob(String(fileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: fileType,
              });

              // Upload the file
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
