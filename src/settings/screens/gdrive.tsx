import React, { useEffect, useState } from "react";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { GoogleDriveAPI } from "../../utils/Google Drive/GoogleDriveAPI";
import {
  Filesystem,
  Directory,
  Encoding,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import icons from "../../lib/remixicon-react";
import mime from "mime";
import CircularProgress from "../../components/ui/ProgressBar";
import { Note } from "../../store/types";
import { isPlatform } from "@ionic/react";
import { useHandleImportData } from "../../utils/importUtils";
import { loadNotes } from "../../store/notes";
import { base64ToBlob } from "../../utils/base64";

interface GdriveProps {
  setNotesState: (notes: Record<string, Note>) => void;
}

const IOS_CLIENT_ID = import.meta.env.VITE_IOS_GOOGLE_CLIENT_ID;
const ANDROID_CLIENT_ID = import.meta.env.VITE_ANDROID_GOOGLE_CLIENT_ID;

const GoogleDriveExportPage: React.FC<GdriveProps> = ({ setNotesState }) => {
  const { importUtils } = useHandleImportData();
  const [user, setUser] = useState<any | null>(null);
  const [driveAPI, setDriveAPI] = useState<GoogleDriveAPI | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressColor, setProgressColor] = useState<string>("#e6e6e6");

  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        let clientId = "";

        // Determine the platform and select the correct clientId
        if (isPlatform("ios")) {
          clientId = IOS_CLIENT_ID; // iOS Client ID
        } else if (isPlatform("android")) {
          clientId = ANDROID_CLIENT_ID; // Android Client ID
        } else {
          console.error("Platform not supported");
          return;
        }

        await GoogleAuth.initialize({
          clientId: clientId,
          scopes: ["profile", "email", "https://www.googleapis.com/auth/drive"],
          grantOfflineAccess: true,
        });

        await loadAccessToken();
      } catch (error) {
        console.error("Failed to initialize Google Auth:", error);
      }
    };

    initializeGoogleAuth();
  }, []);

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

  const Login = async () => {
    try {
      const googleUser = await GoogleAuth.signIn();
      console.log("Google User:", googleUser);
      setUser(googleUser);
      setDriveAPI(new GoogleDriveAPI(googleUser.authentication.accessToken)); // Initialize API
      saveAccessToken(googleUser.authentication.accessToken);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  const saveAccessToken = async (token: string) => {
    try {
      await SecureStoragePlugin.set({ key: "access_token", value: token });
      console.log("Access token saved to secure storage.");
    } catch (error) {
      console.error("Error saving access token:", error);
    }
  };

  const Logout = async () => {
    try {
      await GoogleAuth.signOut();
      setUser(null);
      setDriveAPI(null);
      await SecureStoragePlugin.remove({ key: "access_token" });
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  document.addEventListener("driveExport", handleDriveExport);

  document.addEventListener("driveImport", handleDriveImport);

  async function handleDriveExport() {
    await syncGdrive();
  }
  async function handleDriveImport() {
    await importData();
  }

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

  const exportdata = async () => {
    if (!driveAPI) return;

    try {
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
        encoding: Encoding.UTF8, // Use UTF-8 for text-based files like JSON
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

  const syncGdrive = async () => {
    if (!driveAPI) return;
  
    try {
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");
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
  
      let datedFolderId = await driveAPI.checkFolderExists(
        datedFolderPath,
        rootFolderId
      );
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
            setProgress(60);  // Set to 60% after note-assets are processed
          } else if (assetType === "file-assets") {
            setProgress(90);  // Set to 90% after file-assets are processed
          }
        }
      }
  
      // Final progress set to 100%
      setProgress(100);
    } catch (error) {
      console.error("Error syncing data:", error);
      setProgressColor("#ff3333");
      setProgress(0);
      alert(error);
    }
  };  

  const importData = async () => {
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

  // Helper function to download a folder's contents recursively
  const downloadFolderContents = async (
    driveFolderId: string,
    localFolderPath: string
  ) => {
    // Ensure driveAPI is not null by using '!'
    const folderContents = await driveAPI!.listContents(driveFolderId);

    // Get the access token from SecureStoragePlugin
    const token = await SecureStoragePlugin.get({ key: "access_token" });

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

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "googledrive";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "googledrive" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "googledrive" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "googledrive";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  // Translations
  const [translations, setTranslations] = useState({
    gdrive: {
      title: "gdrive.title",
      import: "gdrive.import",
      export: "gdrive.export",
      autoSync: "gdrive.Autosync",
      logout: "gdrive.logout",
      login: "gdrive.login",
      existingFolder: "gdrive.existingFolder",
      refreshingToken: "gdrive.refreshingToken",
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

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p
              className="text-4xl text-center font-bold p-4"
              aria-label={translations.gdrive.title || "-"}
            >
              {translations.gdrive.title || "-"}
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
                    <icons.GDrive className="w-32 h-32 text-neutral-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        {user ? (
          <section>
            <div className="flex flex-col">
              <div className="space-y-2">
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                  onClick={importData}
                  aria-label={
                    translations.gdrive.import ||
                    "Import data from Google Drive"
                  }
                >
                  {translations.gdrive.import || "-"}
                </button>
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={exportdata}
                  aria-label={
                    translations.gdrive.export || "Export data to Google Drive"
                  }
                >
                  {translations.gdrive.export || "-"}
                </button>
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={Logout}
                  aria-label={
                    translations.gdrive.logout || "Logout from Google Drive"
                  }
                >
                  {translations.gdrive.logout || "-"}
                </button>
              </div>
            </div>
            <div className="flex items-center py-2 justify-between">
              <div>
                <p
                  className="block text-lg align-left"
                  aria-label={translations.gdrive.autoSync || "Auto Sync"}
                >
                  {translations.gdrive.autoSync || "-"}
                </p>
              </div>
              <label
                className="relative inline-flex cursor-pointer items-center"
                aria-label={translations.gdrive.autoSync || "Toggle auto sync"}
              >
                <input
                  id="switch"
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleSyncToggle}
                  className="peer sr-only"
                  aria-checked={autoSync}
                  aria-labelledby="Auto sync"
                />
                <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
              </label>
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <button
                    className="bg-amber-400 w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={Login}
                    aria-label={
                      translations.gdrive.login || "Login to Google Drive"
                    }
                  >
                    {translations.gdrive.login || "-"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveExportPage;
