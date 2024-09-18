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

        const countFilesInDirectory = async (path: any) => {
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
        const noteAssetsContents = await Filesystem.readdir({
          path: noteAssetsPath,
          directory: Directory.Data,
        });
        let noteFilesCount = 0;
        for (const folderName of noteAssetsContents.files) {
          noteFilesCount += await countFilesInDirectory(
            `${noteAssetsPath}/${folderName.name}`
          );
        }

        const fileAssetsPath = "file-assets";
        const filefolderContents = await Filesystem.readdir({
          path: fileAssetsPath,
          directory: Directory.Data,
        });
        let fileFilesCount = 0;
        for (const item of filefolderContents.files) {
          if (item.type === "file") {
            fileFilesCount++;
          } else if (item.type === "directory") {
            fileFilesCount += await countFilesInDirectory(
              `${fileAssetsPath}/${item.name}`
            );
          }
        }

        // Calculate total files to upload
        const totalFiles = noteFilesCount + fileFilesCount + 1; // +1 for data.json

        let processedFiles = 0;

        const updateProgress = () => {
          processedFiles++;
          setProgress(Math.round((processedFiles / totalFiles) * 100));
        };

        // Read the data.json
        const datafile = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        // Get current date for folder name
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
        const folderPath = `/Beaver Notes ${formattedDate}`;
        const assetsPath = `${folderPath}/assets`;

        const dbx = new Dropbox({ accessToken });

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

        // Create folders
        await dbx.filesCreateFolderV2({ path: folderPath, autorename: false });
        await dbx.filesCreateFolderV2({ path: assetsPath, autorename: false });

        // Upload the data.json
        await dbx.filesUpload({
          path: `${folderPath}/data.json`,
          contents: datafile.data,
        });

        updateProgress();

        // Upload files in file-assets directory
        for (const item of filefolderContents.files) {
          if (item.type === "file") {
            const filePath = `${fileAssetsPath}/${item.name}`;
            const fileData = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Data,
            });

            const fileType = getMimeType(item.name);
            const blob = base64ToBlob(String(fileData.data), fileType);
            const uploadedFile = new File([blob], item.name, {
              type: "application/octet-stream",
            });

            await dbx.filesUpload({
              path: `${folderPath}/file-assets/${item.name}`,
              contents: uploadedFile,
            });

            updateProgress();
          } else if (item.type === "directory") {
            const folderPath = `${fileAssetsPath}/${item.name}`;
            const folderContents = await Filesystem.readdir({
              path: folderPath,
              directory: Directory.Data,
            });

            for (const file of folderContents.files) {
              const imagefilePath = `${folderPath}/${file.name}`;
              const imageFileData = await Filesystem.readFile({
                path: imagefilePath,
                directory: Directory.Data,
              });

              const fileType = getMimeType(file.name);
              const blob = base64ToBlob(String(imageFileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: "application/octet-stream",
              });

              await dbx.filesUpload({
                path: `${folderPath}/file-assets/${item.name}/${file.name}`,
                contents: uploadedFile,
              });

              updateProgress();
            }
          }
        }

        // Upload files in note-assets directory
        for (const folderName of noteAssetsContents.files) {
          const folderPath = `${noteAssetsPath}/${folderName.name}`;
          const folderContents = await Filesystem.readdir({
            path: folderPath,
            directory: Directory.Data,
          });

          for (const file of folderContents.files) {
            const imagefilePath = `${folderPath}/${file.name}`;
            const imageFileData = await Filesystem.readFile({
              path: imagefilePath,
              directory: Directory.Data,
            });

            const fileType = getMimeType(file.name);
            const blob = base64ToBlob(String(imageFileData.data), fileType);
            const uploadedFile = new File([blob], file.name, {
              type: "application/octet-stream",
            });

            await dbx.filesUpload({
              path: `${assetsPath}/${folderName.name}/${file.name}`,
              contents: uploadedFile,
            });

            updateProgress();
          }
        }

        setProgress(100); // Ensure progress is set to 100% when done
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
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD

        const mainFolderPath = `/Beaver Notes ${formattedDate}`;

        await Filesystem.mkdir({
          path: `export/Beaver Notes ${formattedDate}`,
          directory: FilesystemDirectory.Data,
        });

        const dbx = new Dropbox({ accessToken });

        const createFoldersRecursively = async (
          folderPath: string,
          parentPath = ""
        ) => {
          const response = await dbx.filesListFolder({ path: folderPath });
          const totalEntries = response.result.entries.length;
          let processedEntries = 0;

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
              setProgress(Math.round((processedEntries / totalEntries) * 100));

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
              setProgress(Math.round((processedEntries / totalEntries) * 100));
            }
          }
        };

        await createFoldersRecursively(mainFolderPath);
        await importUtils(setNotesState, loadNotes);
        await Filesystem.rmdir({
          path: `export/Beaver Notes ${formattedDate}`,
          directory: FilesystemDirectory.Data,
          recursive: true, // This ensures the folder and its contents are deleted
        });
        setProgress(100);

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
                <p className="block text-lg align-left">{translations.dropbox.autoSync || "-"}</p>
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
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <input
                    type="text"
                    className="bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 w-full p-3 text-neutral-800 dark:text-neutral-200 outline-none p-2 text-lg rounded-xl"
                    placeholder="Paste authorization code here"
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
