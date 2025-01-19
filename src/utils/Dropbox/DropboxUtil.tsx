import { Dropbox } from "dropbox";
import { base64ToBlob } from "../../utils/base64";
import mime from "mime";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { loadNotes } from "../../store/notes";
import { useHandleImportData } from "../../utils/importUtils";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useState } from "react";

const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_DROPBOX_CLIENT_SECRET;
const STORAGE_PATH = "notes/data.json";
const { importUtils } = useHandleImportData();

export const useDropbox = async () => {
  const accessToken = (
    await SecureStoragePlugin.get({ key: "dropbox_access_token" })
  ).value;
  const refreshToken = (
    await SecureStoragePlugin.get({
      key: "dropbox_refresh_token",
    })
  ).value;

  const refreshAccessToken = async () => {
    if (refreshToken) {
      const requestBody = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString();

      try {
        const response = await fetch("https://api.dropbox.com/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: requestBody,
        });

        if (response.ok) {
          const data = await response.json();
          const newAccessToken = data.access_token;

          // Save new access token
          await SecureStoragePlugin.set({
            key: "dropbox_access_token",
            value: newAccessToken,
          });
        } else {
          const errorData = await response.json();
          console.error("Failed to refresh access token:", errorData);
        }
      } catch (error) {
        console.error("Error refreshing access token:", error);
      }
    } else {
      console.error("Refresh token not found");
    }
  };

  const checkTokenExpiration = async () => {
    if (accessToken) {
      try {
        // Send a test request to Dropbox API to check if the token is valid
        const response = await fetch(
          "https://api.dropbox.com/2/users/get_current_account",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await refreshAccessToken();
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
      }
    } else {
      console.error("Access token not found");
    }
  };
  return { checkTokenExpiration, accessToken };
};

export const useExport = (darkMode: boolean, translations: any) => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const exportdata = async () => {
    const { checkTokenExpiration, accessToken } = await useDropbox();
    checkTokenExpiration();
    if (accessToken) {
      try {
        setProgress(0);
        setProgressColor(darkMode ? "#444444" : "#e6e6e6");

        // Sync limit for folders
        const syncLimit = parseInt(
          localStorage.getItem("synclimit") || "5",
          10
        );
        const dbx = new Dropbox({ accessToken });

        // Function to extract date from folder name in the format "Beaver Notes YYYY-MM-DD"
        const extractDateFromFolderName = (folderName: string): Date | null => {
          const datePattern = /Beaver Notes (\d{4}-\d{2}-\d{2})/;
          const match = folderName.match(datePattern);
          return match ? new Date(match[1]) : null;
        };

        // Retrieve folders from Dropbox
        const folderMetadata = await dbx.filesListFolder({ path: "" });
        const folders = folderMetadata.result.entries.filter(
          (entry) => entry[".tag"] === "folder"
        );

        // Extract dates from folder names and sort them by date (oldest first)
        const sortedFolders = folders
          .map((folder) => {
            const date = extractDateFromFolderName(folder.name);
            return { ...folder, date };
          })
          .filter((folder) => folder.date !== null) // Filter out folders with invalid names
          .sort(
            (a, b) => (a.date as Date).getTime() - (b.date as Date).getTime()
          );

        // If folder count exceeds syncLimit, delete the oldest folders
        if (sortedFolders.length > syncLimit) {
          for (let i = 0; i < sortedFolders.length - syncLimit; i++) {
            const folderToDelete = sortedFolders[i];

            // Ensure that path_lower is defined before trying to delete
            if (folderToDelete.path_lower) {
              await dbx.filesDeleteV2({ path: folderToDelete.path_lower });
            } else {
              console.warn(
                `Folder ${folderToDelete.name} does not have a valid path_lower`
              );
            }
          }
        }

        const countFilesInDirectory = async (path: string): Promise<number> => {
          let count = 0;
          const contents = await Filesystem.readdir({
            path,
            directory: Directory.Data,
          });
          for (const item of contents.files) {
            if (item.type === "file") {
              count++;
            } else if (item.type === "directory") {
              count += await countFilesInDirectory(`${path}/${item.name}`);
            }
          }
          return count;
        };

        const noteAssetsPath = "note-assets";
        const fileAssetsPath = "file-assets";

        // Count the number of files in note-assets and file-assets
        let noteFilesCount = 0;
        let fileFilesCount = 0;

        const noteAssetsContents = await Filesystem.readdir({
          path: noteAssetsPath,
          directory: Directory.Data,
        });
        for (const folderName of noteAssetsContents.files) {
          noteFilesCount += await countFilesInDirectory(
            `${noteAssetsPath}/${folderName.name}`
          );
        }

        const filefolderContents = await Filesystem.readdir({
          path: fileAssetsPath,
          directory: Directory.Data,
        });
        for (const item of filefolderContents.files) {
          if (item.type === "file") {
            fileFilesCount++;
          } else if (item.type === "directory") {
            fileFilesCount += await countFilesInDirectory(
              `${fileAssetsPath}/${item.name}`
            );
          }
        }

        // Total files to upload (including data.json)
        const totalFiles = noteFilesCount + fileFilesCount + 1;
        let processedFiles = 0;

        const updateProgress = () => {
          processedFiles++;
          setProgress(Math.round((processedFiles / totalFiles) * 100));
        };

        // Read data.json
        const datafile = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        // Get the current date for folder naming
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10);
        const folderPath = `/Beaver Notes ${formattedDate}`;
        const assetsPath = `${folderPath}/assets`;

        // Check if folder exists in Dropbox, handle deletion if necessary
        try {
          await dbx.filesGetMetadata({ path: folderPath });
          const autoSync = localStorage.getItem("autoSync");
          if (autoSync === "dropbox") {
            await dbx.filesDeleteV2({ path: folderPath });
          } else {
            const userConfirmed = window.confirm(
              translations.dropbox.existingFolder.replace(
                "${folderPath}",
                folderPath
              )
            );
            if (userConfirmed) {
              await dbx.filesDeleteV2({ path: folderPath });
            } else {
              return;
            }
          }
        } catch (error: any) {
          if (error.status !== 409) {
            throw error;
          }
        }

        // Create folders in Dropbox
        await dbx.filesCreateFolderV2({ path: folderPath, autorename: false });
        await dbx.filesCreateFolderV2({ path: assetsPath, autorename: false });

        // Upload the data.json file
        await dbx.filesUpload({
          path: `${folderPath}/data.json`,
          contents: datafile.data,
        });

        updateProgress();

        // Helper function to upload files recursively
        const uploadFolderToDropbox = async (
          localFolderPath: string,
          dropboxFolderPath: string
        ) => {
          const folderContents = await Filesystem.readdir({
            path: localFolderPath,
            directory: Directory.Data,
          });

          for (const item of folderContents.files) {
            const localPath = `${localFolderPath}/${item.name}`;
            const dropboxPath = `${dropboxFolderPath}/${item.name}`;

            if (item.type === "file") {
              // Read the file from local storage
              const fileData = await Filesystem.readFile({
                path: localPath,
                directory: Directory.Data,
              });

              // Determine file type and create a blob
              const fileType = mime.getType(item.name);
              const blob = base64ToBlob(
                String(fileData.data),
                String(fileType)
              );
              const uploadedFile = new File([blob], item.name, {
                type: "application/octet-stream",
              });

              // Upload the file to Dropbox
              await dbx.filesUpload({
                path: dropboxPath,
                contents: uploadedFile,
              });

              updateProgress();
            } else if (item.type === "directory") {
              // Create the directory in Dropbox
              await dbx.filesCreateFolderV2({
                path: dropboxPath,
                autorename: false,
              });
              // Recursively upload the directory's contents
              await uploadFolderToDropbox(localPath, dropboxPath);
            }
          }
        };

        // Upload the contents of file-assets folder to Dropbox
        await dbx.filesCreateFolderV2({
          path: `${folderPath}/file-assets`,
          autorename: false,
        });
        await uploadFolderToDropbox(
          fileAssetsPath,
          `${folderPath}/file-assets`
        );

        // Upload files in the note-assets folder
        for (const folderName of noteAssetsContents.files) {
          const localFolderPath = `${noteAssetsPath}/${folderName.name}`;
          const dropboxFolderPath = `${assetsPath}/${folderName.name}`;

          // Create the directory in Dropbox and upload its contents
          await dbx.filesCreateFolderV2({
            path: dropboxFolderPath,
            autorename: false,
          });
          await uploadFolderToDropbox(localFolderPath, dropboxFolderPath);
        }

        setProgress(100); // Ensure progress reaches 100% when done
      } catch (error) {
        console.error("Error uploading note assets:", error);
        setProgressColor("#ff3333");
        setProgress(0);
      }
    } else {
      console.error("Access token not found!");
    }
  };
  return { exportdata, progress, progressColor };
};

export const useDropboxSync = () => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const syncDropBox = async () => {
    const { checkTokenExpiration, accessToken } = await useDropbox();
    checkTokenExpiration();
    if (accessToken) {
      try {
        setProgress(0);

        // Sync limit for folders
        const syncLimit = parseInt(
          localStorage.getItem("synclimit") || "5",
          10
        );
        const dbx = new Dropbox({ accessToken });

        // Function to extract date from folder name in the format "Beaver Notes YYYY-MM-DD"
        const extractDateFromFolderName = (folderName: string): Date | null => {
          const datePattern = /Beaver Notes (\d{4}-\d{2}-\d{2})/;
          const match = folderName.match(datePattern);
          return match ? new Date(match[1]) : null;
        };

        // Retrieve folders from Dropbox
        const folderMetadata = await dbx.filesListFolder({ path: "" });
        const folders = folderMetadata.result.entries.filter(
          (entry) => entry[".tag"] === "folder"
        );

        // Extract dates from folder names and sort them by date (oldest first)
        const sortedFolders = folders
          .map((folder) => {
            const date = extractDateFromFolderName(folder.name);
            return { ...folder, date };
          })
          .filter((folder) => folder.date !== null) // Filter out folders with invalid names
          .sort(
            (a, b) => (a.date as Date).getTime() - (b.date as Date).getTime()
          );

        // If folder count exceeds syncLimit, delete the oldest folders
        if (sortedFolders.length > syncLimit) {
          for (let i = 0; i < sortedFolders.length - syncLimit; i++) {
            const folderToDelete = sortedFolders[i];

            // Ensure that path_lower is defined before trying to delete
            if (folderToDelete.path_lower) {
              await dbx.filesDeleteV2({ path: folderToDelete.path_lower });
            } else {
              console.warn(
                `Folder ${folderToDelete.name} does not have a valid path_lower`
              );
            }
          }
        }

        const countFilesInDirectory = async (path: string): Promise<number> => {
          let count = 0;
          const contents = await Filesystem.readdir({
            path,
            directory: Directory.Data,
          });
          for (const item of contents.files) {
            if (item.type === "file") {
              count++;
            } else if (item.type === "directory") {
              count += await countFilesInDirectory(`${path}/${item.name}`);
            }
          }
          return count;
        };

        // Get the current date for folder naming
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10);
        const folderPath = `/Beaver Notes ${formattedDate}`;

        // Check if folder exists in Dropbox, handle deletion if necessary
        try {
          await dbx.filesGetMetadata({ path: folderPath });
          await dbx.filesDeleteV2({ path: folderPath });
        } catch (error: any) {
          if (error.status !== 409) {
            throw error;
          }
        }

        await dbx.filesCreateFolderV2({ path: folderPath, autorename: false });

        const changelog = await Filesystem.readFile({
          path: "notes/change-log.json",
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        const changelogData = JSON.parse(changelog.data as string);

        const processAssets = async (
          updatedPaths: string[],
          assetType: string,
          formattedDate: string
        ) => {
          const assetFolder =
            assetType === "note-assets" ? "assets" : "file-assets";

          // Filter assets that were updated
          const updatedAssets = updatedPaths.filter((path) =>
            path.startsWith(assetType)
          );

          await dbx.filesCreateFolderV2({
            path: `/Beaver Notes ${formattedDate}/${assetFolder}`,
            autorename: false,
          });

          await Promise.all(
            updatedAssets.map(async (assetPath) => {
              const folderName = assetPath.split("/")[1]; // Extract folder name
              const folderContents = await Filesystem.readdir({
                path: assetPath,
                directory: Directory.Data,
              });

              // Create the folder in Dropbox
              await dbx.filesCreateFolderV2({
                path: `/Beaver Notes ${formattedDate}/${assetFolder}/${folderName}`,
                autorename: false,
              });

              await Promise.all(
                folderContents.files.map(async (file) => {
                  const filePath = `${assetPath}/${file.name}`;
                  const fileData = await Filesystem.readFile({
                    path: filePath,
                    directory: Directory.Data,
                  });

                  const fileType = mime.getType(file.name); // Get file MIME type

                  // Convert base64 string to Blob
                  const blob = base64ToBlob(
                    String(fileData.data),
                    String(fileType)
                  );

                  // Create a File from the Blob
                  const uploadedFile = new File([blob], file.name, {
                    type: "application/octet-stream", // Or use the correct MIME type
                  });

                  // Upload the file to Dropbox
                  await dbx.filesUpload({
                    path: `/Beaver Notes ${formattedDate}/${assetFolder}/${folderName}/${file.name}`,
                    contents: uploadedFile,
                  });
                })
              );
            })
          );
        };

        const updatedPaths = changelogData
          .filter(
            (entry: { action: string }) =>
              entry.action === "updated" || "created"
          )
          .map((entry: { path: string }) => entry.path);
        if (updatedPaths.includes("notes/data.json")) {
          const datafile = await Filesystem.readFile({
            path: STORAGE_PATH,
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
          });

          await dbx.filesUpload({
            path: `${folderPath}/data.json`,
            contents: datafile.data,
          });
          setProgress(20);
        }

        const assetTypes = ["note-assets", "file-assets"];
        for (let assetType of assetTypes) {
          if (updatedPaths.some((path: string) => path.startsWith(assetType))) {
            await processAssets(updatedPaths, assetType, formattedDate);
            setProgress(assetType === "note-assets" ? 60 : 100); // Update with an appropriate percentage
          }
        }

      } catch (error) {
        console.error("Error uploading note assets:", error);
        setProgressColor("#ff3333");
        setProgress(0);
      }
    } else {
      console.error("Access token not found!");
    }
  };
  return { syncDropBox, progress, progressColor };
};

export const useDropboxImport = (darkMode: boolean, setNotesState: any) => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const importData = async () => {
    const { checkTokenExpiration, accessToken } = await useDropbox();
    checkTokenExpiration();
    if (accessToken) {
      try {
        setProgressColor(darkMode ? "#444444" : "#e6e6e6");

        const dbx = new Dropbox({ accessToken });

        // Function to format date to YYYY-MM-DD
        const formatDate = (date: Date) => {
          return date.toISOString().slice(0, 10);
        };

        // Function to go back 1 day
        const goBackOneDay = (date: Date) => {
          const newDate = new Date(date);
          newDate.setDate(newDate.getDate() - 1);
          return newDate;
        };

        // Try to find a viable folder, going back 1 day at a time (max 30 days)
        let currentDate = new Date();
        let mainFolderPath = `/Beaver Notes ${formatDate(currentDate)}`;
        let folderFound = false;
        const maxAttempts = 30; // Stop after 30 attempts (30 days)
        let attempts = 0;

        while (!folderFound && attempts < maxAttempts) {
          try {
            // Check if the folder exists in Dropbox
            await dbx.filesGetMetadata({ path: mainFolderPath });
            folderFound = true; // Folder exists, break the loop
          } catch (error: any) {
            if (error.status === 409) {
              // Folder not found, go back 1 day and try again
              currentDate = goBackOneDay(currentDate);
              mainFolderPath = `/Beaver Notes ${formatDate(currentDate)}`;
              attempts++;
            } else {
              throw error; // Other Dropbox errors should be handled
            }
          }
        }

        if (!folderFound) {
          throw new Error("No viable folder found in the last 30 days.");
        }

        // Create the folder structure locally
        await Filesystem.mkdir({
          path: `export/Beaver Notes ${formatDate(currentDate)}`,
          directory: FilesystemDirectory.Data,
        });

        // Step 1: Calculate the total number of entries (files + folders)
        const calculateTotalEntries = async (
          folderPath: string
        ): Promise<number> => {
          const response = await dbx.filesListFolder({ path: folderPath });
          let totalEntries = response.result.entries.length;

          for (const entry of response.result.entries) {
            if (entry[".tag"] === "folder") {
              // Recursively count subfolders and files
              totalEntries += await calculateTotalEntries(
                `${folderPath}/${entry.name}`
              );
            }
          }

          return totalEntries;
        };

        const totalEntries = await calculateTotalEntries(mainFolderPath); // Calculate total files + folders
        let processedEntries = 0;

        // Step 2: Create folders recursively and track progress globally
        const createFoldersRecursively = async (
          folderPath: string,
          parentPath = ""
        ) => {
          const response = await dbx.filesListFolder({ path: folderPath });

          for (const entry of response.result.entries) {
            if (entry[".tag"] === "folder") {
              const folderFullPath = `${parentPath}/${entry.name}`.replace(
                /^\/+/,
                ""
              ); // Remove leading slash

              await Filesystem.mkdir({
                path: `export/${mainFolderPath}/${folderFullPath}`,
                directory: FilesystemDirectory.Data,
              });

              processedEntries++;
              setProgress(Math.round((processedEntries / totalEntries) * 100)); // Global progress

              const subFolderPath = `${folderPath}/${entry.name}`;
              await createFoldersRecursively(subFolderPath, folderFullPath);
            } else if (entry[".tag"] === "file") {
              const fileFullPath = `${parentPath}/${entry.name}`.replace(
                /^\/+/,
                ""
              ); // Remove leading slash

              await Filesystem.downloadFile({
                url: `https://content.dropboxapi.com/2/files/download`,
                path: `export/${mainFolderPath}/${fileFullPath}`,
                directory: FilesystemDirectory.Data,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Dropbox-API-Arg": JSON.stringify({ path: entry.path_lower }),
                },
              });

              processedEntries++;
              setProgress(Math.round((processedEntries / totalEntries) * 100)); // Global progress
            }
          }
        };

        // Start importing from the found folder
        await createFoldersRecursively(mainFolderPath);
        await importUtils(setNotesState, loadNotes);

        await Filesystem.rmdir({
          path: `export/Beaver Notes ${formatDate(currentDate)}`,
          directory: FilesystemDirectory.Data,
          recursive: true,
        });
        setProgress(100); // Complete progress

        console.log("Folder deleted successfully!");
      } catch (error) {
        console.error("Error during import or folder deletion:", error);
        setProgress(0); // Reset progress on error
        setProgressColor("#ff3333");
      }
    } else {
      console.error("Access token not found!");
    }
  };
  return { importData, progress, progressColor };
};
