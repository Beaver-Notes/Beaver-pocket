import React, { useEffect, useState } from "react";
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

//@ts-ignore
const iCloudSync: React.FC<iCloudProps> = ({ notesState, setNotesState }) => {
  // Correctly destructuring props
  const [progress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");

  // Translations
  const [translations, setTranslations] = useState({
    dropbox: {
      title: "dropbox.title",
      import: "dropbox.import",
      export: "dropbox.export",
      submit: "dropbox.submit",
      getToken: "dropbox.getToken",
      autoSync: "dropbox.Autosync",
      logout: "dropbox.logout",
      existingFolder: "dropbox.existingFolder",
      refreshingToken: "dropbox.refreshingToken",
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
      // Get the current date for the folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const baseFolderPath = `Beaver Notes ${formattedDate}`;

      // Read the data.json file from Capacitor Filesystem
      const { data } = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      console.log("[INFO] Successfully read data.json file.");

      // Convert data to a string
      let fileData: string;
      if (typeof data === "string") {
        fileData = data;
      } else {
        // Handle Blob case
        console.warn("[WARN] Data is not a string, converting from Blob...");
        const blob = new Blob([data], { type: "application/json" });
        try {
          fileData = await blobToString(blob);
        } catch (blobError) {
          console.error("[ERROR] Failed to convert Blob to string:", blobError);
          throw blobError; // Re-throw the error to be caught by the outer catch
        }
      }

      // Create the base folder in iCloud
      await iCloud.createFolder({ folderName: baseFolderPath });

      // Encode data to base64
      const base64Data = base64Encode(fileData);

      // Upload the data.json file to iCloud
      await iCloud.uploadFile({
        fileName: `${baseFolderPath}/data.json`,
        fileData: base64Data,
      });

      console.log("data.json file uploaded successfully");

      // Handle note-assets folder
      await handleAssetsFolder("note-assets", baseFolderPath, "assets");

      // Handle file-assets folder
      await handleAssetsFolder("file-assets", baseFolderPath, "file-assets");
    } catch (error) {
      console.error("Error uploading file to iCloud:", error);
    }
  };

  // Helper function to handle assets folder
  const handleAssetsFolder = async (
    assetsFolderName: string,
    baseFolderPath: string,
    folderNameInICloud: string
  ) => {
    // List contents of the assets folder
    const { files } = await Filesystem.readdir({
      path: assetsFolderName,
      directory: Directory.Data,
    });

    // Create the folder in iCloud under the base folder
    const assetsFolderPathInICloud = `${baseFolderPath}/${folderNameInICloud}`;
    await iCloud.createFolder({ folderName: assetsFolderPathInICloud });

    for (const entry of files) {
      if (entry.type === "directory") {
        // Handle subfolder
        await handleSubfolder(
          entry.name,
          assetsFolderName,
          assetsFolderPathInICloud
        );
      } else if (entry.type === "file") {
        // Handle individual file
        await uploadFileToICloud(
          assetsFolderName,
          entry.name,
          assetsFolderPathInICloud
        );
      }
    }
  };

  // Helper function to handle subfolders
  const handleSubfolder = async (
    subfolderName: string,
    parentFolderPath: string,
    parentFolderPathInICloud: string
  ) => {
    // Create corresponding folder in iCloud under the parent folder
    const subfolderPathInICloud = `${parentFolderPathInICloud}/${subfolderName}`;
    await iCloud.createFolder({ folderName: subfolderPathInICloud });

    // List contents of the current subfolder
    const { files: subFolderFiles } = await Filesystem.readdir({
      path: `${parentFolderPath}/${subfolderName}`,
      directory: Directory.Data,
    });

    for (const file of subFolderFiles) {
      if (file.type === "file") {
        // Upload the file to iCloud
        await uploadFileToICloud(
          `${parentFolderPath}/${subfolderName}`,
          file.name,
          subfolderPathInICloud
        );
      }
    }
  };

  // Helper function to upload a file to iCloud
  const uploadFileToICloud = async (
    folderPath: string,
    fileName: string,
    folderPathInICloud: string
  ) => {
    // Read file data
    const { data: fileData } = await Filesystem.readFile({
      path: `${folderPath}/${fileName}`,
      directory: Directory.Data,
    });

    // Convert file data to Blob
    const fileType = getMimeType(fileName);
    const blob = base64ToBlob(String(fileData), fileType);

    // Convert Blob to base64 string
    const base64FileData = await blobToBase64(blob);

    // Upload the file to iCloud
    await iCloud.uploadFile({
      fileName: `${folderPathInICloud}/${fileName}`,
      fileData: base64FileData,
    });

    console.log(
      `File ${fileName} uploaded successfully to ${folderPathInICloud}`
    );
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
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
      const baseFolderPath = `Beaver Notes ${formattedDate}`;
      const localFolderPath = `export/${baseFolderPath}`;
  
      const { exists } = await iCloud.checkFolderExists({
        folderName: baseFolderPath,
      });
      if (!exists) {
        throw new Error(`Base folder ${baseFolderPath} does not exist in iCloud.`);
      }
  
      const { fileData: base64Data } = await iCloud.downloadFile({
        fileName: `${baseFolderPath}/data.json`,
      });
      const fileBlob = base64ToBlob(base64Data, "application/json");
      const fileString = await blobToString(fileBlob);
  
      console.log("[INFO] Successfully downloaded and read data.json file.");
  
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
  
      console.log(`[INFO] data.json file saved successfully at ${localFolderPath}/data.json`);
  
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
        if (item.type === 'directory') {
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
            const fileBlob = base64ToBlob(base64FileData, getMimeType(file.name));
            const fileBase64String = await blobToBase64(fileBlob);
  
            await Filesystem.writeFile({
              path: `${localSubfolderPath}/${file.name}`,
              directory: Directory.Data,
              data: fileBase64String,
            });
  
            console.log(`[INFO] File ${file.name} downloaded and saved successfully at ${localSubfolderPath}/${file.name}`);
          }
        } else if (item.type === 'file') {
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
  
          console.log(`[INFO] File ${item.name} downloaded and saved successfully at ${localAssetsFolderPath}/${item.name}`);
        }
      }
  
      console.log("All assets have been downloaded and saved successfully.");
  
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
        if (item.type === 'directory') {
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
            const fileBlob = base64ToBlob(base64FileData, getMimeType(file.name));
            const fileBase64String = await blobToBase64(fileBlob);
  
            await Filesystem.writeFile({
              path: `${localSubfolderPath}/${file.name}`,
              directory: Directory.Data,
              data: fileBase64String,
            });
  
            console.log(`[INFO] File ${file.name} downloaded and saved successfully at ${localSubfolderPath}/${file.name}`);
          }
        } else if (item.type === 'file') {
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
  
          console.log(`[INFO] File ${item.name} downloaded and saved successfully at ${localFileAssetsFolderPath}/${item.name}`);
        }
      }
  
      console.log("All file-assets have been downloaded and saved successfully.");
    } catch (error) {
      console.error("Error importing data from iCloud:", error);
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
    const syncValue = autoSync ? "none" : "dropbox";
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
    <div>
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p className="text-4xl text-center font-bold p-4">
              {translations.dropbox.title || "-"}
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
                    <icons.iCloud className="w-32 h-32 text-blue-700 z-0" />
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
                {translations.dropbox.import || "-"}
              </button>
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                {translations.dropbox.export || "-"}
              </button>
            </div>
          </div>
          <div className="flex items-center py-2 justify-between">
            <div>
              <p className="block text-lg align-left">Auto Sync</p>
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
