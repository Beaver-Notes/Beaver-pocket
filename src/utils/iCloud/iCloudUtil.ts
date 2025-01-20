import { useState } from "react";
import {
  base64Encode,
  base64ToBlob,
  blobToBase64,
  blobToString,
} from "../base64";
import mime from "mime";
import iCloud from "./iCloud";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { useHandleImportData } from "../importUtils";
import { loadNotes } from "../../store/notes";

const STORAGE_PATH = "notes/data.json";

export const useExportiCloud = () => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const exportdata = async () => {
    try {
      setProgressColor("#e6e6e6"); // Set progress color
      setProgress(0); // Reset progress at the start

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const baseFolderPath = `Beaver Notes ${formattedDate}`;

      // Step 1: Get sync limit from localStorage
      const syncLimit = parseInt(localStorage.getItem("synclimit") || "5", 10);

      // Step 2: Read existing folders in iCloud and sort by date
      const { files: existingFiles } = await iCloud.listContents({
        folderName: "/",
      }); // Note: using files, not folders
      const beaverNoteFolders = existingFiles
        .filter(
          (file) =>
            file.name.startsWith("Beaver Notes") && file.type === "directory"
        )
        .sort((a: { name: string }, b: { name: string }) => {
          // Extract date from "Beaver Notes YYYY-MM-DD"
          const dateA = new Date(a.name.replace("Beaver Notes ", ""));
          const dateB = new Date(b.name.replace("Beaver Notes ", ""));
          return dateA.getTime() - dateB.getTime(); // Sort oldest to newest
        });

      // Step 3: Delete oldest folders if they exceed syncLimit
      if (beaverNoteFolders.length >= syncLimit) {
        const foldersToDelete = beaverNoteFolders.slice(
          0,
          beaverNoteFolders.length - syncLimit + 1
        ); // Select oldest folders to delete
        for (const folder of foldersToDelete) {
          await iCloud.deleteFolder({ folderName: folder.name });
          console.log(`[INFO] Deleted old folder: ${folder.name}`);
        }
      }

      // Step 4: Proceed with data export
      const { data } = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      console.log("[INFO] Successfully read data.json file.");

      let fileData;
      if (typeof data === "string") {
        fileData = data;
      } else {
        const blob = new Blob([data], { type: "application/json" });
        fileData = await blobToString(blob);
      }

      await iCloud.createFolder({ folderName: baseFolderPath });

      const base64Data = base64Encode(fileData);
      await iCloud.uploadFile({
        fileName: `${baseFolderPath}/data.json`,
        fileData: base64Data,
      });

      console.log("data.json file uploaded successfully");

      let totalFiles = 0;
      let processedFiles = 0;

      const updateProgress = () => {
        processedFiles++;
        const progressPercentage = Math.round(
          (processedFiles / totalFiles) * 100
        );
        setProgress(progressPercentage); // Update progress
      };

      const countFiles = async (folderPath: string): Promise<number> => {
        const { files } = await Filesystem.readdir({
          path: folderPath,
          directory: Directory.Data,
        });
        let fileCount = 0;
        for (const item of files) {
          if (item.type === "directory") {
            fileCount += await countFiles(`${folderPath}/${item.name}`);
          } else {
            fileCount++;
          }
        }
        return fileCount;
      };

      totalFiles = await countFiles("note-assets");
      totalFiles += await countFiles("file-assets");

      await handleAssetsFolder(
        "note-assets",
        baseFolderPath,
        "assets",
        updateProgress
      );
      await handleAssetsFolder(
        "file-assets",
        baseFolderPath,
        "file-assets",
        updateProgress
      );

      setProgress(100); // Ensure progress reaches 100% at the end
      console.log("All files have been uploaded successfully.");
    } catch (error) {
      console.error("Error uploading file to iCloud:", error);
      setProgress(0); // Reset progress on error
      setProgressColor("#ff3333"); // Set color to red on error
    }
  };

  const handleAssetsFolder = async (
    assetsFolderName: string,
    baseFolderPath: string,
    folderNameInICloud: string,
    updateProgress: () => void
  ) => {
    const { files } = await Filesystem.readdir({
      path: assetsFolderName,
      directory: Directory.Data,
    });

    const assetsFolderPathInICloud = `${baseFolderPath}/${folderNameInICloud}`;
    await iCloud.createFolder({ folderName: assetsFolderPathInICloud });

    for (const entry of files) {
      if (entry.type === "directory") {
        await handleSubfolder(
          entry.name,
          assetsFolderName,
          assetsFolderPathInICloud,
          updateProgress
        );
      } else if (entry.type === "file") {
        await uploadFileToICloud(
          assetsFolderName,
          entry.name,
          assetsFolderPathInICloud,
          updateProgress
        );
      }
    }
  };

  const handleSubfolder = async (
    subfolderName: string,
    parentFolderPath: string,
    parentFolderPathInICloud: string,
    updateProgress: () => void
  ) => {
    const subfolderPathInICloud = `${parentFolderPathInICloud}/${subfolderName}`;
    await iCloud.createFolder({ folderName: subfolderPathInICloud });

    const { files: subFolderFiles } = await Filesystem.readdir({
      path: `${parentFolderPath}/${subfolderName}`,
      directory: Directory.Data,
    });

    for (const file of subFolderFiles) {
      if (file.type === "file") {
        await uploadFileToICloud(
          `${parentFolderPath}/${subfolderName}`,
          file.name,
          subfolderPathInICloud,
          updateProgress
        );
      }
    }
  };

  const uploadFileToICloud = async (
    folderPath: string,
    fileName: string,
    folderPathInICloud: string,
    updateProgress: () => void
  ) => {
    const { data: fileData } = await Filesystem.readFile({
      path: `${folderPath}/${fileName}`,
      directory: Directory.Data,
    });

    const fileType = mime.getType(fileName);
    const blob = base64ToBlob(String(fileData), String(fileType));
    const base64FileData = await blobToBase64(blob);

    await iCloud.uploadFile({
      fileName: `${folderPathInICloud}/${fileName}`,
      fileData: base64FileData,
    });

    console.log(
      `File ${fileName} uploaded successfully to ${folderPathInICloud}`
    );

    updateProgress(); // Update progress after each file upload
  };
  return { exportdata, progress, progressColor };
};

export const useImportiCloud = (setNotesState: any) => {
  const { importUtils } = useHandleImportData();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const importData = async () => {
    try {
      setProgressColor("#e6e6e6"); // Set progress color based on theme
      setProgress(0); // Reset progress to 0 at the start

      const getValidFolder = async (): Promise<string | null> => {
        let currentDate = new Date();
        for (let i = 0; i < 30; i++) {
          // Loop back 30 days
          const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
          const baseFolderPath = `Beaver Notes ${formattedDate}`;

          const { exists } = await iCloud.checkFolderExists({
            folderName: baseFolderPath,
          });

          if (exists) {
            return baseFolderPath; // Found a valid folder
          }

          // Subtract one day
          currentDate.setDate(currentDate.getDate() - 1);
        }

        return null; // No folder found in the past 30 days
      };

      const baseFolderPath = await getValidFolder();
      if (!baseFolderPath) {
        throw new Error("No valid folder found in the last 30 days.");
      }

      const localFolderPath = `export/${baseFolderPath}`;
      const { fileData: base64Data } = await iCloud.downloadFile({
        fileName: `${baseFolderPath}/data.json`,
      });
      const fileBlob = base64ToBlob(base64Data, "application/json");
      const fileString = await blobToString(fileBlob);

      await Filesystem.mkdir({
        path: localFolderPath,
        directory: Directory.Data,
        recursive: true,
      });

      await Filesystem.writeFile({
        path: `${localFolderPath}/data.json`,
        directory: Directory.Data,
        data: fileString,
        encoding: Encoding.UTF8,
      });

      console.log(
        `[INFO] data.json file saved successfully at ${localFolderPath}/data.json`
      );

      // Track progress
      let totalFiles = 0;
      let processedFiles = 0;

      // Function to update progress
      const updateProgress = () => {
        processedFiles++;
        setProgress(Math.round((processedFiles / totalFiles) * 100));
      };

      // Count total files in assets and file-assets folders
      const countFiles = async (folderPath: string) => {
        const { files } = await iCloud.listContents({ folderName: folderPath });
        for (const item of files) {
          if (item.type === "directory") {
            totalFiles += await countFiles(`${folderPath}/${item.name}`);
          } else {
            totalFiles++;
          }
        }
        return totalFiles;
      };

      // Count files in assets and file-assets folders
      totalFiles = await countFiles(`${baseFolderPath}/assets`);
      totalFiles += await countFiles(`${baseFolderPath}/file-assets`);

      // Process assets folder
      const assetsFolderName = "assets";
      const assetsFolderPathInICloud = `${baseFolderPath}/${assetsFolderName}`;
      const localAssetsFolderPath = `${localFolderPath}/${assetsFolderName}`;

      const { files: assetContents } = await iCloud.listContents({
        folderName: assetsFolderPathInICloud,
      });

      await Filesystem.mkdir({
        path: localAssetsFolderPath,
        directory: Directory.Data,
        recursive: true,
      });

      for (const item of assetContents) {
        if (item.type === "directory") {
          const subfolderPathInICloud = `${assetsFolderPathInICloud}/${item.name}`;
          const localSubfolderPath = `${localAssetsFolderPath}/${item.name}`;

          await Filesystem.mkdir({
            path: localSubfolderPath,
            directory: Directory.Data,
            recursive: true,
          });

          const { files: subfolderFiles } = await iCloud.listContents({
            folderName: subfolderPathInICloud,
          });

          for (const file of subfolderFiles) {
            const { fileData: base64FileData } = await iCloud.downloadFile({
              fileName: `${subfolderPathInICloud}/${file.name}`,
            });
            const fileBlob = base64ToBlob(
              base64FileData,
              mime.getType(item.name) as string
            );
            const fileBase64String = await blobToBase64(fileBlob);

            await Filesystem.writeFile({
              path: `${localSubfolderPath}/${file.name}`,
              directory: Directory.Data,
              data: fileBase64String,
            });

            updateProgress(); // Update progress after each file is processed
            console.log(
              `[INFO] File ${file.name} downloaded and saved successfully at ${localSubfolderPath}/${file.name}`
            );
          }
        } else if (item.type === "file") {
          const { fileData: base64FileData } = await iCloud.downloadFile({
            fileName: `${assetsFolderPathInICloud}/${item.name}`,
          });
          const fileBlob = base64ToBlob(
            base64FileData,
            mime.getType(item.name) as string
          );
          const fileBase64String = await blobToBase64(fileBlob);

          await Filesystem.writeFile({
            path: `${localAssetsFolderPath}/${item.name}`,
            directory: Directory.Data,
            data: fileBase64String,
          });

          updateProgress(); // Update progress after each file is processed
          console.log(
            `[INFO] File ${item.name} downloaded and saved successfully at ${localAssetsFolderPath}/${item.name}`
          );
        }
      }

      // Process file-assets folder
      const fileAssetsFolderName = "file-assets";
      const fileAssetsFolderPathInICloud = `${baseFolderPath}/${fileAssetsFolderName}`;
      const localFileAssetsFolderPath = `${localFolderPath}/${fileAssetsFolderName}`;

      const { files: fileAssetsContents } = await iCloud.listContents({
        folderName: fileAssetsFolderPathInICloud,
      });

      await Filesystem.mkdir({
        path: localFileAssetsFolderPath,
        directory: Directory.Data,
        recursive: true,
      });

      for (const item of fileAssetsContents) {
        if (item.type === "directory") {
          const subfolderPathInICloud = `${fileAssetsFolderPathInICloud}/${item.name}`;
          const localSubfolderPath = `${localFileAssetsFolderPath}/${item.name}`;

          await Filesystem.mkdir({
            path: localSubfolderPath,
            directory: Directory.Data,
            recursive: true,
          });

          const { files: subfolderFiles } = await iCloud.listContents({
            folderName: subfolderPathInICloud,
          });

          for (const file of subfolderFiles) {
            const { fileData: base64FileData } = await iCloud.downloadFile({
              fileName: `${subfolderPathInICloud}/${file.name}`,
            });
            const fileBlob = base64ToBlob(
              base64FileData,
              mime.getType(item.name) as string
            );
            const fileBase64String = await blobToBase64(fileBlob);

            await Filesystem.writeFile({
              path: `${localSubfolderPath}/${file.name}`,
              directory: Directory.Data,
              data: fileBase64String,
            });

            updateProgress(); // Update progress after each file is processed
            console.log(
              `[INFO] File ${file.name} downloaded and saved successfully at ${localSubfolderPath}/${file.name}`
            );
          }
        } else if (item.type === "file") {
          const { fileData: base64FileData } = await iCloud.downloadFile({
            fileName: `${fileAssetsFolderPathInICloud}/${item.name}`,
          });
          const fileBlob = base64ToBlob(
            base64FileData,
            mime.getType(item.name) as string
          );
          const fileBase64String = await blobToBase64(fileBlob);

          await Filesystem.writeFile({
            path: `${localFileAssetsFolderPath}/${item.name}`,
            directory: Directory.Data,
            data: fileBase64String,
          });

          updateProgress(); // Update progress after each file is processed
          console.log(
            `[INFO] File ${item.name} downloaded and saved successfully at ${localFileAssetsFolderPath}/${item.name}`
          );
        }
      }

      await importUtils(setNotesState, loadNotes);

      console.log(
        "All file-assets have been downloaded and saved successfully."
      );
      setProgress(100); // Set progress to 100% when done
    } catch (error) {
      console.error("Error importing data from iCloud:", error);
      setProgress(0); // Reset progress on error
      setProgressColor("#ff3333"); // Set color to red on error
    }
  };
  return { importData, progress, progressColor };
};
