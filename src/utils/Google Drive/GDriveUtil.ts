import { useState } from "react";
import { GoogleDriveAPI } from "../../utils/Google Drive/GoogleDriveAPI";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import {
  Directory,
  Encoding,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { base64ToBlob } from "../../utils/base64";
import { loadNotes } from "../../store/notes";
import { useHandleImportData } from "../importUtils";
import mime from "mime";

const { importUtils } = useHandleImportData();

export const useDrive = () => {
  const [user, setUser] = useState<any | null>(null);
  const [driveAPI, setDriveAPI] = useState<GoogleDriveAPI | null>(null);

  const loadAccessToken = async () => {
    try {
      const result = await SecureStoragePlugin.get({ key: "access_token" });
      if (result.value) {
        const userInfo = await GoogleAuth.refresh(); // Initial refresh
        setUser({ ...userInfo, authentication: { accessToken: result.value } });
        setDriveAPI(new GoogleDriveAPI(result.value)); // Initialize GoogleDriveAPI with access token
        console.log("Access token loaded from secure storage.");
      }
    } catch (error) {
      console.log(
        "No access token found in secure storage or failed to refresh."
      );
    }
  };
  return { user, driveAPI, loadAccessToken };
};

export const useExport = (darkMode: boolean) => {
  const { driveAPI, loadAccessToken } = useDrive();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const exportdata = async () => {
    loadAccessToken();
    if (!driveAPI) return;
    try {
      alert("starting");
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");

      const autoSync = localStorage.getItem("autoSync");
      const syncLimit = parseInt(localStorage.getItem("synclimit") || "5", 10);

      let totalItems = 0; // Track total number of items to upload
      let uploadedItems = 0; // Track uploaded items for progress calculation

      // Helper function to update the progress bar
      const updateProgress = () => {
        if (totalItems > 0) {
          const progressPercentage = Math.round(
            (uploadedItems / totalItems) * 100
          );
          setProgress(progressPercentage);
        }
      };

      // Helper function to count all items (files and folders) in a directory
      const countFolderItems = async (localFolderPath: string) => {
        const folderContents = await Filesystem.readdir({
          path: localFolderPath,
          directory: Directory.Data,
        });

        for (const item of folderContents.files) {
          if (item.type === "file") {
            totalItems++;
          } else if (item.type === "directory") {
            totalItems++; // Count the directory itself
            await countFolderItems(`${localFolderPath}/${item.name}`); // Recursively count subfolder items
          }
        }
      };

      // Helper function to recursively upload folder contents with progress updates
      const uploadFolderContents = async (
        localFolderPath: string,
        driveFolderId: string
      ) => {
        const folderContents = await Filesystem.readdir({
          path: localFolderPath,
          directory: Directory.Data,
        });

        const uploadPromises = folderContents.files.map(async (item) => {
          if (item.type === "file") {
            // Read the local file as binary (base64 encoded) and convert to Blob
            const fileData = await Filesystem.readFile({
              path: `${localFolderPath}/${item.name}`,
              directory: Directory.Data,
            });

            const fileType = mime.getType(item.name); // Determine MIME type
            const blob = base64ToBlob(String(fileData.data), String(fileType)); // Convert base64 to Blob

            // Upload the file to the corresponding Google Drive folder
            await driveAPI.uploadFile(
              item.name,
              blob,
              driveFolderId,
              fileType || "application/octet-stream"
            );

            uploadedItems++; // Increment uploaded items count
            updateProgress(); // Update progress
          } else if (item.type === "directory") {
            // Create a corresponding folder on Google Drive if it doesn't exist
            const newDriveFolderId = await driveAPI.checkFolderExists(
              item.name,
              driveFolderId
            );
            const newFolderId =
              newDriveFolderId ||
              (await driveAPI.createFolder(item.name, driveFolderId));

            uploadedItems++; // Count the directory itself as uploaded
            updateProgress();

            // Recursively upload the contents of the subfolder
            await uploadFolderContents(
              `${localFolderPath}/${item.name}`,
              String(newFolderId)
            );
          }
        });

        // Wait for all uploads in the folder to complete
        await Promise.all(uploadPromises);
      };

      // Count total items to upload (data.json, note-assets, file-assets)
      await countFolderItems("note-assets");
      await countFolderItems("file-assets");
      totalItems += 1; // Count data.json file
      totalItems += 2; // Count note-assets and file-assets folders themselves

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const datedFolderPath = `Beaver Notes ${formattedDate}`;

      // Check if the root "beaver-pocket" folder exists in Google Drive
      let rootFolderId = await driveAPI.checkFolderExists("beaver-pocket");
      if (!rootFolderId) {
        rootFolderId = await driveAPI.createFolder("beaver-pocket");
      }

      if (rootFolderId === null) {
        throw new Error("Root folder ID could not be determined.");
      }

      const existingFolders = await driveAPI.listContents(rootFolderId);
      const datedFolders = existingFolders.filter((folder) =>
        folder.name.startsWith("Beaver Notes")
      );

      // Sort dated folders by creation date (assuming `createdTime` is available)
      datedFolders.sort((a, b) => {
        const dateA = new Date(a.createdTime || 0).getTime(); // Fallback to 0 if createdTime is not present
        const dateB = new Date(b.createdTime || 0).getTime();
        return dateA - dateB;
      });

      // Delete the oldest folders if they exceed the sync limit
      while (datedFolders.length > syncLimit) {
        const folderToDelete = datedFolders.shift(); // Get the oldest folder
        if (folderToDelete) {
          await driveAPI.deleteFolder(folderToDelete.id);
        }
      }

      // Check if the "Beaver Notes YYYY-MM-DD" folder already exists
      let datedFolderId = await driveAPI.checkFolderExists(
        datedFolderPath,
        rootFolderId
      );

      // If folder exists and autoSync is not set, ask the user for confirmation
      if (datedFolderId && autoSync !== "googledrive") {
        const confirmDelete = window.confirm(
          `The folder "${datedFolderPath}" already exists. Do you want to delete it and start fresh?`
        );
        if (!confirmDelete) {
          setProgress(0);
          return; // Exit if user cancels
        }
      }

      // If autoSync is set to "googledrive", or user confirmed deletion, delete the existing folder
      if (datedFolderId) {
        await driveAPI.deleteFolder(datedFolderId);
        datedFolderId = null; // Reset folder ID after deletion
      }

      // Create the "Beaver Notes YYYY-MM-DD" folder inside "beaver-pocket"
      if (!datedFolderId) {
        datedFolderId = await driveAPI.createFolder(
          datedFolderPath,
          rootFolderId
        );
      }

      // Upload the main data.json file to the "Beaver Notes YYYY-MM-DD" folder
      const dataFile = await Filesystem.readFile({
        path: "notes/data.json",
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const dataBlob = new Blob([dataFile.data], { type: "application/json" });
      await driveAPI.uploadFile(
        "data.json",
        dataBlob,
        String(datedFolderId),
        "application/json"
      );

      uploadedItems++; // Increment progress for data.json
      updateProgress();

      // Create the "note-assets" and "file-assets" folders inside "Beaver Notes YYYY-MM-DD"
      const noteAssetsFolderId = await driveAPI.createFolder(
        "note-assets",
        datedFolderId
      );
      const fileAssetsFolderId = await driveAPI.createFolder(
        "file-assets",
        datedFolderId
      );

      uploadedItems += 2; // Increment progress for the note-assets and file-assets folder creation
      updateProgress();

      // Recursively upload contents of the local "note-assets" folder to the corresponding Google Drive folder
      await uploadFolderContents("note-assets", String(noteAssetsFolderId));

      // Recursively upload contents of the local "file-assets" folder to the corresponding Google Drive folder
      await uploadFolderContents("file-assets", String(fileAssetsFolderId));

      setProgress(100); // Ensure progress is set to 100% when done
    } catch (error) {
      console.error("Error exporting data:", error);
      setProgressColor("#ff3333");
      setProgress(0);
      alert(error);
    }
  };
  return { exportdata, progress, progressColor };
};

export const useDriveSync = () => {
  const { driveAPI, loadAccessToken } = useDrive();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const syncGdrive = async () => {
    loadAccessToken();
    if (!driveAPI) return;

    try {
      alert("starting");
      setProgress(0);
      const syncLimit = parseInt(localStorage.getItem("synclimit") || "5", 10);

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const datedFolderPath = `Beaver Notes ${formattedDate}`;

      let rootFolderId = await driveAPI.checkFolderExists("beaver-pocket");
      if (!rootFolderId) {
        rootFolderId = await driveAPI.createFolder("beaver-pocket");
      }
      if (!rootFolderId) {
        throw new Error("Root folder ID could not be determined.");
      }

      const existingFolders = await driveAPI.listContents(rootFolderId);
      const datedFolders = existingFolders.filter((folder) =>
        folder.name.startsWith("Beaver Notes")
      );

      // Sort and delete oldest folders exceeding sync limit
      datedFolders.sort((a, b) => {
        const dateA = new Date(a.createdTime || 0).getTime();
        const dateB = new Date(b.createdTime || 0).getTime();
        return dateA - dateB;
      });

      while (datedFolders.length > syncLimit) {
        const folderToDelete = datedFolders.shift();
        if (folderToDelete) {
          await driveAPI.deleteFolder(folderToDelete.id);
        }
      }

      // Check if the "Beaver Notes YYYY-MM-DD" folder already exists
      let datedFolderId = await driveAPI.checkFolderExists(
        datedFolderPath,
        rootFolderId
      );

      // Automatically delete the folder if it exists
      if (datedFolderId) {
        await driveAPI.deleteFolder(datedFolderId);
        datedFolderId = null; // Reset folder ID after deletion
      }

      // Create the "Beaver Notes YYYY-MM-DD" folder inside "beaver-pocket"
      if (!datedFolderId) {
        datedFolderId = await driveAPI.createFolder(
          datedFolderPath,
          rootFolderId
        );
      }

      const changelog = await Filesystem.readFile({
        path: "notes/change-log.json",
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      const changelogData = JSON.parse(changelog.data as string);
      const updatedPaths = changelogData
        .filter(
          (entry: { action: string }) => entry.action === "updated" || "created"
        )
        .map((entry: { path: string }) => entry.path);

      if (updatedPaths.includes("notes/data.json")) {
        const datafile = await Filesystem.readFile({
          path: "notes/data.json",
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        const dataBlob = new Blob([datafile.data], {
          type: "application/json",
        });

        await driveAPI.uploadFile(
          "data.json",
          dataBlob,
          String(datedFolderId),
          "application/json"
        );
        setProgress(20);
      }

      const processAssets = async (
        updatedPaths: string[],
        assetType: string,
        assetFolderId: string
      ) => {
        const updatedAssets = updatedPaths.filter((path) =>
          path.startsWith(assetType)
        );

        for (const assetPath of updatedAssets) {
          const folderName = assetPath.split("/")[1]; // Extract folder name

          const driveFolderId = await driveAPI.createFolder(
            folderName,
            assetFolderId
          );

          const folderContents = await Filesystem.readdir({
            path: assetPath,
            directory: Directory.Data,
          });

          for (const item of folderContents.files) {
            if (item.type === "file") {
              const filePath = `${assetPath}/${item.name}`;
              const fileData = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Data,
              });

              const fileType = mime.getType(item.name); // Determine MIME type
              const blob = base64ToBlob(
                String(fileData.data),
                String(fileType)
              );

              await driveAPI.uploadFile(
                item.name,
                blob,
                String(driveFolderId),
                fileType || "application/octet-stream"
              );
            }
          }
        }
      };

      const assetTypes = ["note-assets", "file-assets"];
      for (let assetType of assetTypes) {
        const assetFolder =
          assetType === "note-assets" ? "assets" : "file-assets";
        let assetFolderId = await driveAPI.createFolder(
          assetFolder,
          datedFolderId
        );

        if (updatedPaths.some((path: string) => path.startsWith(assetType))) {
          await processAssets(updatedPaths, assetType, String(assetFolderId));

          // Update progress after processing each asset type
          if (assetType === "note-assets") {
            setProgress(60); // Set to 60% after note-assets are processed
          } else if (assetType === "file-assets") {
            setProgress(90); // Set to 90% after file-assets are processed
          }
        }
      }

      // Final progress set to 100%
      setProgress(100);
    } catch (error) {
      console.error("Error syncing data:", error);
      setProgressColor("#ff3333");
      setProgress(0);
    }
  };
  return { syncGdrive, progress, progressColor };
};

export const useDriveImport = (darkMode: boolean, setNotesState: any) => {
  const { driveAPI, loadAccessToken } = useDrive();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const downloadFolderContents = async (
    driveFolderId: string,
    localFolderPath: string
  ) => {
    const folderContents = await driveAPI!.listContents(driveFolderId);

    // Get the access token from SecureStoragePlugin
    const token = await SecureStoragePlugin.get({
      key: "access_token",
    });

    for (const item of folderContents) {
      let subFolderPath = localFolderPath;

      if (item.mimeType === "application/vnd.google-apps.folder") {
        // Handle the renaming of "note-assets" to "assets"
        if (item.name === "note-assets") {
          subFolderPath = `${localFolderPath}/assets`;
        } else {
          subFolderPath = `${localFolderPath}/${item.name}`;
        }

        // Recursively download the folder contents
        await Filesystem.mkdir({
          path: subFolderPath,
          directory: Directory.Data,
          recursive: true, // Create the folder recursively if it doesn't exist
        });

        await downloadFolderContents(item.id, subFolderPath);
      } else {
        // It's a file, download the file from Google Drive and save it locally
        const fileDownloadUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;

        await Filesystem.downloadFile({
          url: fileDownloadUrl,
          path: `${localFolderPath}/${item.name}`, // Ensure files are saved in the correct folder
          directory: FilesystemDirectory.Data,
          headers: {
            Authorization: `Bearer ${token.value}`, // Add the access token to the headers
          },
        });
      }
    }
  };
  const importData = async () => {
    loadAccessToken();
    if (!driveAPI) {
      console.error("Drive API is not initialized.");
      return;
    }

    try {
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const datedFolderPath = `Beaver Notes ${formattedDate}`;

      // Check if the "Beaver Notes YYYY-MM-DD" folder exists on Google Drive
      let rootFolderId = await driveAPI!.checkFolderExists("beaver-pocket"); // Use '!' to assert non-null
      if (!rootFolderId) {
        throw new Error(
          'Root folder "beaver-pocket" does not exist on Google Drive.'
        );
      }

      let datedFolderId: string | null = await driveAPI!.checkFolderExists(
        datedFolderPath,
        rootFolderId
      ); // Initial check for today's folder

      // If the folder doesn't exist, look back up to 30 days
      const maxDaysToCheck = 30;
      for (let i = 1; i <= maxDaysToCheck && !datedFolderId; i++) {
        const pastDate = new Date(currentDate);
        pastDate.setDate(currentDate.getDate() - i); // Go back i days
        const pastFormattedDate = pastDate.toISOString().slice(0, 10);
        const pastDatedFolderPath = `Beaver Notes ${pastFormattedDate}`;

        datedFolderId = await driveAPI!.checkFolderExists(
          pastDatedFolderPath,
          rootFolderId
        );

        if (datedFolderId) {
          console.log(`Found folder from ${pastFormattedDate}`);
          break; // Exit loop if we find a folder
        }
      }

      // If still no folder found, throw an error
      if (!datedFolderId) {
        throw new Error(`No folder found for the last ${maxDaysToCheck} days.`);
      }

      // Download the folder and its contents recursively to "export/Beaver Notes YYYY-MM-DD"
      const localExportFolder = `export/${datedFolderPath}`; // Path to "export/Beaver Notes YYYY-MM-DD" inside the app
      await downloadFolderContents(datedFolderId, localExportFolder);

      setProgress(100);
      await importUtils(setNotesState, loadNotes);
    } catch (error) {
      console.error("Error importing data:", error);
      setProgressColor("#ff3333");
      setProgress(0);
      alert(`Error importing data: ${error}`);
    }
  };
  return { importData, progress, progressColor };
};
