import React, { useState, useEffect } from "react";
import { Plugins } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import getMimeType from "../../utils/mimetype";
import { useHandleImportData } from "../../utils/importUtils";
import icons from "../../lib/remixicon-react";
import CircularProgress from "../../components/ui/ProgressBar";
import { Note } from "../../store/types";
import { loadNotes } from "../../store/notes";
const STORAGE_PATH = "notes/data.json";

const { MsAuthPlugin } = Plugins;

interface OneDriveProps {
  setNotesState: (notes: Record<string, Note>) => void;
}

const OneDriveAuth: React.FC<OneDriveProps> = ({ setNotesState }) => {
  const { importUtils } = useHandleImportData();
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const { value } = await SecureStoragePlugin.get({ key: "access_token" });

      if (value) {
        setAccessToken(value);
      }
    };
    loadToken();
  }, []);

  const refreshAccessToken = async () => {
    try {
      const result = await MsAuthPlugin.login({
        clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
        scopes: ["Files.ReadWrite", "User.Read"],
      });
      setAccessToken(result.accessToken);
      console.log("Refreshed Access Token:", result.accessToken);

      // Save the access token and expiration time to secure storage
      await SecureStoragePlugin.set({
        key: "access_token",
        value: result.accessToken,
      });
      await SecureStoragePlugin.set({
        key: "expiration_time",
        value: (Date.now() + result.expiresIn * 1000).toString(), // Assuming `expiresIn` is returned in seconds
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  };

  const login = async () => {
    try {
      const result = await MsAuthPlugin.login({
        clientId: import.meta.env.VITE_ONEDRIDE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
        scopes: ["Files.ReadWrite", "User.Read"],
      });
      setAccessToken(result.accessToken);
      console.log("Access Token:", result.accessToken);

      // Save the access token and expiration time to secure storage
      await SecureStoragePlugin.set({
        key: "access_token",
        value: result.accessToken,
      });
      await SecureStoragePlugin.set({
        key: "expiration_time",
        value: (Date.now() + result.expiresIn * 1000).toString(), // Save expiration time
      });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await MsAuthPlugin.logout({
        clientId: import.meta.env.VITE_ONEDRIDE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIDE_ANDROID_HASH,
      });
      setAccessToken(null);
      await SecureStoragePlugin.remove({ key: "access_token" });
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const importData = async (): Promise<void> => {
    if (accessToken) {
      try {
        setProgressColor(darkMode ? "#444444" : "#e6e6e6");
        await refreshAccessToken();
        const currentDate = new Date();
        let formattedDate = currentDate.toISOString().slice(0, 10); // Start with today’s date
        const mainFolderBasePath = `/Beaver-Pocket/Beaver Notes `;

        // Function to check if the folder exists
        const checkIfFolderExists = async (
          folderPath: string
        ): Promise<boolean> => {
          const folderResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(
              folderPath
            )}:/children`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          return folderResponse.ok; // Returns true if the folder exists
        };

        let folderExists = await checkIfFolderExists(
          mainFolderBasePath + formattedDate
        );
        let daysBack = 0;
        const maxDaysBack = 30; // Limit the number of days to look back

        // If today's folder doesn't exist, check the previous days
        while (!folderExists && daysBack < maxDaysBack) {
          const previousDate = new Date();
          previousDate.setDate(currentDate.getDate() - daysBack - 1); // Go back one day
          formattedDate = previousDate.toISOString().slice(0, 10); // Reformat to YYYY-MM-DD

          folderExists = await checkIfFolderExists(
            mainFolderBasePath + formattedDate
          );
          daysBack++;
        }

        // If no folders were found after checking back 30 days
        if (!folderExists) {
          console.error("No available folders found within the last 30 days.");
          return; // Exit the function if no folders are found
        }

        // Create the local directory structure
        await Filesystem.mkdir({
          path: `export/Beaver Notes ${formattedDate}`,
          directory: FilesystemDirectory.Data,
        });

        const headers: HeadersInit = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        };

        // Function to recursively download folders and files from OneDrive
        const createFoldersRecursively = async (
          folderPath: string,
          parentPath: string = ""
        ): Promise<void> => {
          // Fetch contents of the OneDrive folder
          const folderResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(
              folderPath
            )}:/children`,
            { headers }
          );
          const folderData: {
            value: Array<{
              id: string;
              name: string;
              folder?: any;
              file?: any;
            }>;
          } = await folderResponse.json();

          const folderPromises = folderData.value.map(async (entry) => {
            if (entry.folder) {
              // It's a folder, create it locally and recursively process its contents
              const folderFullPath = `${parentPath}/${entry.name}`.replace(
                /^\/+/,
                ""
              ); // Remove leading slash

              await Filesystem.mkdir({
                path: `export/Beaver Notes ${formattedDate}/${folderFullPath}`,
                directory: FilesystemDirectory.Data,
              });

              await createFoldersRecursively(
                `${folderPath}/${entry.name}`,
                folderFullPath
              );
            } else if (entry.file) {
              // It's a file, download it
              const fileFullPath = `${parentPath}/${entry.name}`.replace(
                /^\/+/,
                ""
              ); // Remove leading slash

              const downloadUrlResponse = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${entry.id}/content`,
                { headers }
              );
              const blob: Blob = await downloadUrlResponse.blob();

              await Filesystem.writeFile({
                path: `export/Beaver Notes ${formattedDate}/${fileFullPath}`,
                directory: FilesystemDirectory.Data,
                data: await blobToBase64(blob), // Convert blob to base64 for writing to the local filesystem
              });
            }
          });

          // Wait for all folder and file operations to complete
          await Promise.all(folderPromises);
        };

        // Start downloading from the found main folder
        await createFoldersRecursively(mainFolderBasePath + formattedDate);

        // Import the notes
        await importUtils(setNotesState, loadNotes);

        // Clean up by deleting the temporary folder after import
        await Filesystem.rmdir({
          path: `export/Beaver Notes ${formattedDate}`,
          directory: FilesystemDirectory.Data,
          recursive: true, // Delete folder and its contents
        });

        setProgress(100); // Set progress to 100 when done
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const exportData = async (): Promise<void> => {
    if (accessToken) {
      try {
        setProgress(0);
        setProgressColor(darkMode ? "#444444" : "#e6e6e6");
        await refreshAccessToken();

        const countFilesInDirectory = async (path: string): Promise<number> => {
          const contents = await Filesystem.readdir({
            path,
            directory: Directory.Data,
          });
          const countPromises = contents.files.map(async (item) => {
            if (item.type === "file") {
              return 1;
            } else if (item.type === "directory") {
              return countFilesInDirectory(`${path}/${item.name}`);
            }
            return 0;
          });
          const counts = await Promise.all(countPromises);
          return counts.reduce((acc, count) => acc + count, 0);
        };

        const noteAssetsPath = "note-assets";
        const noteAssetsContents = await Filesystem.readdir({
          path: noteAssetsPath,
          directory: Directory.Data,
        });

        const noteFilesCountPromises = noteAssetsContents.files.map(
          (folderName) =>
            countFilesInDirectory(`${noteAssetsPath}/${folderName.name}`)
        );
        const noteFilesCounts = await Promise.all(noteFilesCountPromises);
        const noteFilesCount = noteFilesCounts.reduce(
          (acc, count) => acc + count,
          0
        );

        const fileAssetsPath = "file-assets";
        const fileFolderContents = await Filesystem.readdir({
          path: fileAssetsPath,
          directory: Directory.Data,
        });

        let fileFilesCount = 0;
        const fileCountPromises = fileFolderContents.files.map(async (item) => {
          if (item.type === "file") {
            fileFilesCount++;
          } else if (item.type === "directory") {
            fileFilesCount += await countFilesInDirectory(
              `${fileAssetsPath}/${item.name}`
            );
          }
        });
        await Promise.all(fileCountPromises);

        const totalFiles = noteFilesCount + fileFilesCount + 1; // +1 for data.json
        let processedFiles = 0;

        const updateProgress = () => {
          processedFiles++;
          setProgress(Math.round((processedFiles / totalFiles) * 100));
        };

        const datafile = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10);
        const folderName = `Beaver Notes ${formattedDate}`;
        const parentFolder = "Beaver-Pocket";
        const fullFolderPath = `${parentFolder}/${folderName}`;
        const assetsPath = `${fullFolderPath}/assets`;

        // Check if the current date folder already exists
        const existingFoldersResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:/${parentFolder}:/children`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const existingFoldersData = await existingFoldersResponse.json();

        const currentDateFolderExists = existingFoldersData.value.some(
          (folder: { name: string }) => folder.name === folderName
        );

        // Handle existing current date folder
        if (currentDateFolderExists) {
          const autoSyncEnabled = localStorage.getItem("autoSync") === "true";

          if (autoSyncEnabled) {
            // Auto-sync is on, delete the current date folder without asking
            await fetch(
              `https://graph.microsoft.com/v1.0/me/drive/root:/Beaver-Pocket/${folderName}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
          } else {
            // Ask the user if they want to delete the existing folder
            const userConfirmed = window.confirm(
              `A folder with today's date (${folderName}) already exists. Do you want to delete it?`
            );
            if (userConfirmed) {
              await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/Beaver-Pocket/${folderName}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
            }
          }
        }

        // Create folders in parallel
        const createFolder = async (path: string) => {
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/` +
              encodeURIComponent(path),
            {
              method: "GET",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (response.status === 404) {
            await fetch(
              `https://graph.microsoft.com/v1.0/me/drive/root:/` +
                encodeURIComponent(path) +
                `:/children`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: path.split("/").pop(),
                  folder: {},
                }),
              }
            );
          }
        };

        // Create parent folder and assets folder if they don't exist
        await Promise.all([
          createFolder(parentFolder),
          createFolder(fullFolderPath),
          createFolder(assetsPath),
        ]);

        // Upload data.json
        await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:/` +
            encodeURIComponent(`${fullFolderPath}/data.json`) +
            `:/content`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: datafile.data,
          }
        );
        updateProgress();

        // Upload file-assets in parallel
        const uploadFileAssetsPromises = fileFolderContents.files.map(
          async (item) => {
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

              await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/root:/` +
                  encodeURIComponent(
                    `${fullFolderPath}/file-assets/${item.name}`
                  ) +
                  `:/content`,
                {
                  method: "PUT",
                  headers: { Authorization: `Bearer ${accessToken}` },
                  body: uploadedFile,
                }
              );
              updateProgress();
            }
          }
        );

        await Promise.all(uploadFileAssetsPromises);

        // Upload note-assets in parallel
        const uploadNoteAssetsPromises = noteAssetsContents.files.map(
          async (folderName) => {
            const folderContents = await Filesystem.readdir({
              path: `${noteAssetsPath}/${folderName.name}`,
              directory: Directory.Data,
            });

            return Promise.all(
              folderContents.files.map(async (file) => {
                const imageFilePath = `${noteAssetsPath}/${folderName.name}/${file.name}`;
                const imageFileData = await Filesystem.readFile({
                  path: imageFilePath,
                  directory: Directory.Data,
                });
                const fileType = getMimeType(file.name);
                const blob = base64ToBlob(String(imageFileData.data), fileType);
                const uploadedFile = new File([blob], file.name, {
                  type: "application/octet-stream",
                });

                await fetch(
                  `https://graph.microsoft.com/v1.0/me/drive/root:/` +
                    encodeURIComponent(
                      `${assetsPath}/${folderName.name}/${file.name}`
                    ) +
                    `:/content`,
                  {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: uploadedFile,
                  }
                );
                updateProgress();
              })
            );
          }
        );

        await Promise.all(uploadNoteAssetsPromises);

        // Handle folder limit
        const syncLimit = parseInt(
          localStorage.getItem("synclimit") || "5",
          10
        ); // Default to 5 if not set

        // Filter and sort existing folders by creation date
        const folders = existingFoldersData.value
          .filter((item: { folder: any }) => item.folder)
          .sort(
            (
              a: { createdDateTime: string | number | Date },
              b: { createdDateTime: string | number | Date }
            ) =>
              new Date(a.createdDateTime).getTime() -
              new Date(b.createdDateTime).getTime()
          );

        const excessCount = folders.length - syncLimit;

        if (excessCount > 0) {
          // Delete older folders
          const foldersToDelete = folders.slice(0, excessCount);
          await Promise.all(
            foldersToDelete.map(async (folder: { id: any }) => {
              await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${folder.id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
            })
          );
          console.log(`Deleted ${excessCount} old folders.`);
        }

        setProgress(100);
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
    return new Blob([byteArray], { type });
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

  // Translations
  const [translations, setTranslations] = useState({
    onedrive: {
      title: "onedrive.title",
      import: "onedrive.import",
      export: "onedrive.export",
      autoSync: "onedrive.Autosync",
      logout: "onedrive.logout",
      login: "onedrive.login",
      existingFolder: "onedrive.existingFolder",
      refreshingToken: "onedrive.refreshingToken",
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

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "onedrive";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "onedrive" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "onedrive" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "onedrive";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  document.addEventListener("onedriveExport", OnedriveExport);

  document.addEventListener("onedriveImport", OnedriveImport);

  async function OnedriveExport() {
    await refreshAccessToken();
    await exportData();
  }
  async function OnedriveImport() {
    await refreshAccessToken();
    await importData();
  }

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p className="text-4xl text-center font-bold p-4">
              {translations.onedrive.title || "-"}
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
                    <icons.OneDrive className="w-32 h-32 text-gray-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        {accessToken ? (
          <>
            <section>
              <div className="flex flex-col">
                <div className="space-y-2">
                  {" "}
                  {/* Adjusted margin */}
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                    onClick={importData}
                  >
                    {translations.onedrive.import || "-"}
                  </button>
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={exportData}
                  >
                    {translations.onedrive.export || "-"}
                  </button>
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={logout}
                  >
                    {translations.onedrive.logout || "-"}
                  </button>
                </div>
              </div>
              <div className="flex items-center py-2 justify-between">
                <div>
                  <p className="block text-lg align-left">
                    {translations.onedrive.autoSync || "-"}
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
          </>
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <button
                    className="bg-amber-400 w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={login}
                  >
                    {translations.onedrive.login || "-"}
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

export default OneDriveAuth;
