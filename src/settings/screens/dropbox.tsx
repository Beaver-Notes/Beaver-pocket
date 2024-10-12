import React, { useEffect, useState } from "react";
import { Note } from "../../store/types";
import { Browser } from "@capacitor/browser";
import CircularProgress from "../../components/ui/ProgressBar";
import { Dropbox } from "dropbox";
import { useHandleImportData } from "../../utils/importUtils";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { loadNotes } from "../../store/notes";
import getMimeType from "../../utils/mimetype";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import icons from "../../lib/remixicon-react";
const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_DROPBOX_CLIENT_SECRET;
const STORAGE_PATH = "notes/data.json";

interface DropboxProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const DropboxSync: React.FC<DropboxProps> = ({ setNotesState }) => {
  // Correctly destructuring props
  const { importUtils } = useHandleImportData();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<string>("");
  const [progress, setProgress] = useState(0);
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
      placeholder: "dropbox.placeholder"
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

  const handleLogin = async () => {
    await Browser.open({
      url: `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&token_access_type=offline`,
    });
  };

  const handleExchange = async () => {
    if (authorizationCode) {
      const requestBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
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
          const accessToken = data.access_token;
          const refreshToken = data.refresh_token;

          // Save tokens securely
          await SecureStoragePlugin.set({
            key: "dropbox_access_token",
            value: accessToken,
          });
          await SecureStoragePlugin.set({
            key: "dropbox_refresh_token",
            value: refreshToken,
          });

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
        } else {
          const errorData = await response.json();
          console.error(
            "Failed to exchange authorization code for tokens:",
            errorData
          );
        }
      } catch (error) {
        console.error("Error exchanging authorization code for tokens:", error);
      }
    } else {
      console.error("Authorization code is empty");
    }
  };

  useEffect(() => {
    // Retrieve tokens from secure storage
    const retrieveTokens = async () => {
      try {
        const storedAccessToken = (
          await SecureStoragePlugin.get({ key: "dropbox_access_token" })
        ).value;
        const storedRefreshToken = (
          await SecureStoragePlugin.get({ key: "dropbox_refresh_token" })
        ).value;

        if (storedAccessToken) {
          setAccessToken(storedAccessToken);
        }
        if (storedRefreshToken) {
          setRefreshToken(storedRefreshToken);
        }
      } catch (error) {
        console.error("Error retrieving tokens:", error);
      }
    };

    retrieveTokens();
  }, []);

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
          setAccessToken(newAccessToken);
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

  useEffect(() => {
    const tokenExpirationCheck = async () => {
      await checkTokenExpiration();
    };

    tokenExpirationCheck();

    const tokenExpirationCheckInterval = setInterval(() => {
      checkTokenExpiration();
    }, 14400000);

    return () => clearInterval(tokenExpirationCheckInterval);
  }, [accessToken, refreshToken]);

  useEffect(() => {
    const retrieveAccessToken = async () => {
      try {
        const storedAccessToken = (
          await SecureStoragePlugin.get({ key: "dropbox_access_token" })
        ).value;
        if (storedAccessToken) {
          setAccessToken(storedAccessToken);
        }
      } catch (error) {
        console.error("Error retrieving access token:", error);
      }
    };

    retrieveAccessToken();
  }, []);

  const exportdata = async () => {
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
              const fileType = getMimeType(item.name);
              const blob = base64ToBlob(String(fileData.data), fileType);
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
        alert(error);
      }
    } else {
      console.error("Access token not found!");
    }
  };

  // Function to convert base64 string to Blob
  const base64ToBlob = (base64String: string, type: string): Blob => {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: type });
  };

  const importData = async () => {
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
        const calculateTotalEntries = async (folderPath: string): Promise<number> => {
          const response = await dbx.filesListFolder({ path: folderPath });
          let totalEntries = response.result.entries.length;
  
          for (const entry of response.result.entries) {
            if (entry[".tag"] === "folder") {
              // Recursively count subfolders and files
              totalEntries += await calculateTotalEntries(`${folderPath}/${entry.name}`);
            }
          }
  
          return totalEntries;
        };
  
        const totalEntries = await calculateTotalEntries(mainFolderPath); // Calculate total files + folders
        let processedEntries = 0;
  
        // Step 2: Create folders recursively and track progress globally
        const createFoldersRecursively = async (folderPath: string, parentPath = "") => {
          const response = await dbx.filesListFolder({ path: folderPath });
  
          for (const entry of response.result.entries) {
            if (entry[".tag"] === "folder") {
              const folderFullPath = `${parentPath}/${entry.name}`.replace(/^\/+/, ""); // Remove leading slash
  
              await Filesystem.mkdir({
                path: `export/${mainFolderPath}/${folderFullPath}`,
                directory: FilesystemDirectory.Data,
              });
  
              processedEntries++;
              setProgress(Math.round((processedEntries / totalEntries) * 100)); // Global progress
  
              const subFolderPath = `${folderPath}/${entry.name}`;
              await createFoldersRecursively(subFolderPath, folderFullPath);
            } else if (entry[".tag"] === "file") {
              const fileFullPath = `${parentPath}/${entry.name}`.replace(/^\/+/, ""); // Remove leading slash
  
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
  

  document.addEventListener("dropboxExport", handleDropboxExport);

  document.addEventListener("dropboxImport", handleDropboxImport);

  async function handleDropboxExport() {
    await checkTokenExpiration();
    await exportdata();
  }
  async function handleDropboxImport() {
    await checkTokenExpiration();
    await importData();
  }

  const Logout = async () => {
    try {
      // Remove the access token from storage
      await SecureStoragePlugin.remove({ key: "dropbox_access_token" });
      await SecureStoragePlugin.remove({ key: "dropbox_refresh_token" });

      window.location.reload();
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "dropbox";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "dropbox" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "dropbox" && autoSync) {
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
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
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
                    <icons.DropboxFillIcon className="w-32 h-32 text-blue-700 z-0" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        {accessToken ? (
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
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={Logout}
                >
                  {translations.dropbox.logout || "-"}
                </button>
              </div>
            </div>
            <div className="flex items-center py-2 justify-between">
              <div>
                <p className="block text-lg align-left">
                  {translations.dropbox.autoSync || "-"}
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
                <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
              </label>
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <input
                    type="text"
                    className="bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 w-full p-3 text-neutral-800 dark:text-neutral-200 outline-none p-2 text-lg rounded-xl"
                    placeholder={translations.dropbox.placeholder || "-"}
                    value={authorizationCode}
                    onChange={(e) => setAuthorizationCode(e.target.value)}
                  />
                  <button
                    className="bg-neutral-200 dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] bg-opacity-40 w-full text-black p-3 text-xl font-bold rounded-xl"
                    onClick={handleExchange}
                  >
                    {translations.dropbox.submit || "-"}
                  </button>
                  <button
                    className="bg-amber-400 w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={handleLogin}
                  >
                    {translations.dropbox.getToken || "-"}
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

export default DropboxSync;
