import React, { useEffect, useState } from "react";
import { loadNotes } from "../../store/notes";
import { useHandleImportData } from "../../utils/importUtils";
import { Note } from "../../store/types";
import CircularProgress from "../../components/ui/ProgressBar";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import icons from "../../lib/remixicon-react";
import iCloud from "../../utils/iCloud";
import getMimeType from "../../utils/mimetype";
const STORAGE_PATH = "notes/data.json";

interface iCloudProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const iCloudSync: React.FC<iCloudProps> = ({ setNotesState }) => {
  const { importUtils } = useHandleImportData();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");

  // Translations
  const [translations, setTranslations] = useState({
    icloud: {
      title: "icloud.title",
      import: "icloud.import",
      export: "icloud.export",
      submit: "icloud.submit",
      getToken: "icloud.getToken",
      autoSync: "icloud.Autosync",
      logout: "icloud.logout",
      existingFolder: "icloud.existingFolder",
      refreshingToken: "icloud.refreshingToken",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

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

    const fileType = getMimeType(fileName);
    const blob = base64ToBlob(String(fileData), fileType);
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

  // Helper function to convert Blob to Base64 string and remove the prefix
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the prefix (data:<mime-type>;base64,)
        const base64String = dataUrl.split(",")[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to convert Blob to base64 string."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to convert Blob to base64 string."));
      };
      reader.readAsDataURL(blob);
    });
  };

  const base64Encode = (str: string): string => {
    try {
      const bytes = new TextEncoder().encode(str);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary);
    } catch (error) {
      console.error("[ERROR] Failed to encode string to base64:", error);
      throw error;
    }
  };

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
              getMimeType(file.name)
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
          const fileBlob = base64ToBlob(base64FileData, getMimeType(item.name));
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
              getMimeType(file.name)
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
          const fileBlob = base64ToBlob(base64FileData, getMimeType(item.name));
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

  // Helper function to convert base64 to Blob
  const base64ToBlob = (base64String: string, type: string): Blob => {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
  };

  // Helper function to convert Blob to string
  const blobToString = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        console.error("[ERROR] FileReader failed:", reader.error);
        reject(new Error("Failed to read Blob as string."));
      };
      reader.readAsText(blob);
    });
  };

  document.addEventListener("iCloudExport", handleiCloudExport);

  document.addEventListener("iCloudImport", handleiCloudImport);

  async function handleiCloudExport() {
    await exportdata();
  }
  async function handleiCloudImport() {
    await importData();
  }

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "iCloud";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "iCloud" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "iCloud" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "iCloud";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  useEffect(() => {
    // Update the document class based on dark mode
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);

    // Set the progress color based on dark mode
    setProgressColor(darkMode ? "#444444" : "#e6e6e6");
  }, [darkMode, themeMode]);

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p className="text-4xl text-center font-bold p-4">
              {translations.icloud.title || "-"}
            </p>
            <div className="flex justify-center items-center">
              <CircularProgress
                progress={progress}
                color={progressColor}
                size={144}
                strokeWidth={8}
              >
                {progress ? (
                  <span className="text-amber-400 text-xl font-semibold">
                    {progress}%
                  </span>
                ) : (
                  <div className="relative bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
                    <icons.iCloud className="w-32 h-32 text-gray-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        <section>
          <div className="flex flex-col">
            <div className="space-y-2">
              {" "}
              {/* Adjusted margin */}
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={importData}
              >
                {translations.icloud.import || "-"}
              </button>
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                {translations.icloud.export || "-"}
              </button>
            </div>
          </div>
          <div className="flex items-center py-2 justify-between">
            <div>
              <p className="block text-lg align-left">
                {translations.icloud.autoSync || "-"}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="switch"
                type="checkbox"
                checked={autoSync}
                onChange={handleSyncToggle}
                className="peer sr-only"
              />
              <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default iCloudSync;
