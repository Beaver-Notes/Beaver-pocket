import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useState } from "react";
import { Plugins } from "@capacitor/core";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { base64ToBlob, blobToBase64 } from "../base64";
import { loadNotes } from "../../store/notes";
import { useHandleImportData } from "../importUtils";
import mime from "mime";

const { MsAuthPlugin } = Plugins;
const STORAGE_PATH = "notes/data.json";
const { importUtils } = useHandleImportData();

export const useOneDrive = async () => {
  const accessToken = await SecureStoragePlugin.get({
    key: "onedrive_access_token",
  });

  const refreshAccessToken = async () => {
    try {
      const result = await MsAuthPlugin.login({
        clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
        scopes: ["Files.ReadWrite", "User.Read"],
      });
      console.log("Refreshed Access Token:", result.accessToken);

      // Save the access token and expiration time to secure storage
      await SecureStoragePlugin.set({
        key: "onedrive_access_token",
        value: result.accessToken,
      });
      await SecureStoragePlugin.set({
        key: "onedrive_expiration_time",
        value: (Date.now() + result.expiresIn * 1000).toString(), // Assuming `expiresIn` is returned in seconds
      });
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  };
  return { accessToken, refreshAccessToken };
};

export const useExport = (darkMode: boolean) => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const exportData = async (): Promise<void> => {
    const { refreshAccessToken, accessToken } = await useOneDrive();
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
        const createFolder = async (path: string, parentPath: string = "") => {
          const fullPath = parentPath ? `${parentPath}/${path}` : path;

          const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/` +
              encodeURIComponent(fullPath),
            {
              method: "GET",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (response.status === 404) {
            await fetch(
              `https://graph.microsoft.com/v1.0/me/drive/root:/` +
                encodeURIComponent(parentPath || "") +
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

        // Create necessary folders in a clear hierarchy
        await createFolder(parentFolder);
        await createFolder(folderName, parentFolder);
        await createFolder("assets", `${parentFolder}/${folderName}`);

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
              const fileType = mime.getType(item.name);
              const blob = base64ToBlob(
                String(fileData.data),
                String(fileType)
              );
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
                const fileType = mime.getType(file.name);
                const blob = base64ToBlob(
                  String(imageFileData.data),
                  String(fileType)
                );
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
  return { exportData, progress, progressColor };
};

export const useImportOneDrive = (darkMode: boolean, setNotesState: any) => {
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");
  const importData = async (): Promise<void> => {
    const { refreshAccessToken, accessToken } = await useOneDrive();
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
        importUtils(setNotesState, loadNotes);

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
  return { importData, progress, progressColor };
};

export const useOnedriveSync = () => {
  const syncOneDrive = async (): Promise<void> => {
    const { refreshAccessToken, accessToken } = await useOneDrive();
    if (accessToken) {
      try {
        await refreshAccessToken();

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10);
        const parentFolder = "Beaver-Pocket";
        const fullFolderPath = `${parentFolder}/Beaver Notes ${formattedDate}`;

        // Check if the current date folder already exists
        const existingFoldersResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:/${parentFolder}:/children`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const existingFoldersData = await existingFoldersResponse.json();

        const currentDateFolderExists = existingFoldersData.value.some(
          (folder: { name: string }) => folder.name === fullFolderPath
        );

        // Handle existing current date folder
        if (currentDateFolderExists) {
          await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/root:/${fullFolderPath}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
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
        ]);

        const changelog = await Filesystem.readFile({
          path: "notes/change-log.json",
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        const changelogData = JSON.parse(changelog.data as string);

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
        }

        // Upload note-assets in parallel
        const processAssets = async (
          updatedPaths: string[],
          assetType: string
        ) => {
          const assetFolder =
            assetType === "note-assets" ? "assets" : "file-assets";

          // Filter assets that were updated
          const updatedAssets = updatedPaths.filter((path) =>
            path.startsWith(assetType)
          );

          for (const assetPath of updatedAssets) {
            const folderName = assetPath.split("/")[1]; // Extract folder name
            const folderContents = await Filesystem.readdir({
              path: assetPath,
              directory: Directory.Data,
            });

            // Upload files in the folder
            for (const file of folderContents.files) {
              const filePath = `${assetPath}/${file.name}`;
              const fileData = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Data,
              });

              const fileType = mime.getType(file.name); // Get file MIME type
              const blob = base64ToBlob(
                String(fileData.data),
                String(fileType)
              );
              const uploadedFile = new File([blob], file.name, {
                type: "application/octet-stream", // Or use the correct MIME type
              });

              // Upload the file to OneDrive
              try {
                const response = await fetch(
                  `https://graph.microsoft.com/v1.0/me/drive/root:/` +
                    encodeURIComponent(
                      `${fullFolderPath}/${assetFolder}/${folderName}/${file.name}`
                    ) +
                    `:/content`,
                  {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: uploadedFile,
                  }
                );
                if (response.ok) {
                } else {
                  const errorText = await response.text();
                  console.log(errorText);
                }
              } catch (error) {
                console.log(error);
              }
            }
          }
        };

        const assetTypes = ["note-assets", "file-assets"];
        for (let assetType of assetTypes) {
          if (updatedPaths.some((path: string) => path.startsWith(assetType))) {
            await processAssets(updatedPaths, assetType);
          }
        }

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
      } catch (error) {
        console.error("Error uploading note assets:", error);
        alert(error);
      }
    } else {
      console.error("Access token not found!");
    }
  };
  return { syncOneDrive };
};
