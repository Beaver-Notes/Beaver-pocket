import { WebDavService } from "./webDavApi";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { useState } from "react";
import { Note } from "../../store/types";
import { useHandleImportData } from "../importUtils";
import { loadNotes } from "../../store/notes";
import { base64ToBlob } from "../base64";
import mime from "mime";

const useThemeMode = () => {
  const themeMode = localStorage.getItem("themeMode") || "auto";
  const darkMode =
    themeMode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "dark";
  const progressColor = darkMode ? "#444444" : "#e6e6e6";

  return { themeMode, darkMode, progressColor };
};

export const useExportDav = () => {
  const [baseUrl] = useState<string>(
    () => localStorage.getItem("baseUrl") || ""
  );
  const [username] = useState<string>(
    () => localStorage.getItem("username") || ""
  );
  const [password] = useState<string>(
    () => localStorage.getItem("password") || ""
  );

  const STORAGE_PATH = "notes/data.json";
  const [webDavService] = useState(
    new WebDavService({ baseUrl, username, password })
  );

  const [progress, setProgress] = useState<number>(0);
  const [, setProgressColor] = useState("#e6e6e6");
  const { darkMode, progressColor } = useThemeMode();

  const uploadData = async (datafile: any, formattedDate: string) => {
    try {
      const dataContent = datafile.data;
      const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;
      const filename = "data.json";
      await webDavService.upload(`${folderPath}/${filename}`, dataContent);
      setProgress(100); // Final progress update
    } catch (error) {
      console.error("Error uploading data.json:", error);
    }
  };

  const processNoteAssets = async (formattedDate: string) => {
    try {
      const noteAssetsPath = "note-assets";
      const noteAssetsContents = await Filesystem.readdir({
        path: noteAssetsPath,
        directory: Directory.Data,
      });

      const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}/assets`;
      await webDavService.createFolder(folderPath);

      await Promise.all(
        noteAssetsContents.files.map(async (folderName) => {
          if (folderName.type === "directory") {
            const subFolderPath = `${noteAssetsPath}/${folderName.name}`;
            const subFolderContents = await Filesystem.readdir({
              path: subFolderPath,
              directory: Directory.Data,
            });

            const destinationPath = `${folderPath}/${folderName.name}`;
            await webDavService.createFolder(destinationPath);

            await Promise.all(
              subFolderContents.files.map(async (file) => {
                const filePath = `${subFolderPath}/${file.name}`;
                const fileData = await Filesystem.readFile({
                  path: filePath,
                  directory: Directory.Data,
                });

                await webDavService.upload(
                  `${destinationPath}/${file.name}`,
                  fileData.data
                );
              })
            );
          }
        })
      );
    } catch (error) {
      console.error("Error processing note-assets:", error);
    }
  };

  const processFileAssets = async (formattedDate: string) => {
    try {
      const fileAssetsPath = "file-assets";
      const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets`;

      const fileAssetsContents = await Filesystem.readdir({
        path: fileAssetsPath,
        directory: Directory.Data,
      });

      await webDavService.createFolder(folderPath);

      await Promise.all(
        fileAssetsContents.files.map(async (item) => {
          if (item.type === "file") {
            const filePath = `${fileAssetsPath}/${item.name}`;
            const fileData = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Data,
            });

            await webDavService.upload(
              `${folderPath}/${item.name}`,
              fileData.data
            );
          } else if (item.type === "directory") {
            const subFolderPath = `${fileAssetsPath}/${item.name}`;
            const subFolderContents = await Filesystem.readdir({
              path: subFolderPath,
              directory: Directory.Data,
            });

            const destinationPath = `${folderPath}/${item.name}`;
            await webDavService.createFolder(destinationPath);

            await Promise.all(
              subFolderContents.files.map(async (file) => {
                const filePath = `${subFolderPath}/${file.name}`;
                const fileData = await Filesystem.readFile({
                  path: filePath,
                  directory: Directory.Data,
                });

                await webDavService.upload(
                  `${destinationPath}/${file.name}`,
                  fileData.data
                );
              })
            );
          }
        })
      );
    } catch (error) {
      console.error("Error processing file-assets:", error);
    }
  };

  const exportdata = async () => {
    try {
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      const folderExists = await webDavService.folderExists("Beaver-Pocket");
      if (!folderExists) {
        await webDavService.createFolder("Beaver-Pocket");
      }

      const exportFolderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;
      const exportFolderExists = await webDavService.folderExists(
        exportFolderPath
      );
      if (exportFolderExists) {
        await webDavService.deleteFolder(exportFolderPath);
      }

      await webDavService.createFolder(exportFolderPath);

      const datafile = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await uploadData(datafile, formattedDate);
      setProgress(40);

      await processNoteAssets(formattedDate);
      setProgress(80);

      await processFileAssets(formattedDate);
      setProgress(100);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  return { exportdata, progress, progressColor };
};

export const useSyncDav = () => {
  const [baseUrl] = useState<string>(
    () => localStorage.getItem("baseUrl") || ""
  );
  const [username] = useState<string>(
    () => localStorage.getItem("username") || ""
  );
  const [password] = useState<string>(
    () => localStorage.getItem("password") || ""
  );

  const STORAGE_PATH = "notes/data.json";
  const [webDavService] = useState(
    new WebDavService({ baseUrl, username, password })
  );

  const [progress, setProgress] = useState<number>(0);
  const [, setProgressColor] = useState("#e6e6e6");

  const { darkMode, progressColor } = useThemeMode();

  const syncDav = async () => {
    try {
      // Initialize progress
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");

      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Check if the "Beaver-Pocket" folder exists
      const folderExists = await webDavService.folderExists("Beaver-Pocket");

      if (!folderExists) {
        // If the folder doesn't exist, create it
        await webDavService.createFolder("Beaver-Pocket");
      }

      const exportFolderExists = await webDavService.folderExists(
        `Beaver-Pocket/Beaver Notes ${formattedDate}`
      );

      if (exportFolderExists) {
        // If the folder exists, delete it
        await webDavService.deleteFolder(
          `Beaver-Pocket/Beaver Notes ${formattedDate}`
        );
      }

      const syncLimit = parseInt(localStorage.getItem("synclimit") || "5", 10);

      const manageFolderLimit = async () => {
        try {
          const directoryContent = await webDavService.getDirectoryContent(
            "Beaver-Pocket"
          );
          const xmlDoc = new DOMParser().parseFromString(
            directoryContent,
            "text/xml"
          );
          const responses = Array.from(
            xmlDoc.getElementsByTagName("d:response")
          );

          const beaverNoteFolders = responses
            .map((response) => {
              const href = response.querySelector("d:href")?.textContent;
              const isCollection = response.querySelector(
                "d:resourcetype d:collection"
              );
              if (href && isCollection) {
                const folderName = decodeURIComponent(href)
                  .split("/")
                  .filter(Boolean)
                  .pop();
                return folderName?.startsWith("Beaver Notes")
                  ? { name: folderName }
                  : null;
              }
              return null;
            })
            .filter((folder): folder is { name: string } => folder !== null);

          if (beaverNoteFolders.length > syncLimit) {
            const sortedFolders = beaverNoteFolders.sort((a, b) => {
              const aDate = new Date(
                a?.name.replace("Beaver Notes ", "")
              ).getTime();
              const bDate = new Date(
                b?.name.replace("Beaver Notes ", "")
              ).getTime();
              return aDate - bDate;
            });

            const foldersToDelete = sortedFolders.slice(
              0,
              beaverNoteFolders.length - syncLimit
            );

            await Promise.all(
              foldersToDelete.map((folder) => {
                if (folder?.name) {
                  return webDavService.deleteFolder(
                    `Beaver-Pocket/${folder.name}`
                  );
                }
              })
            );
          }
        } catch (error) {
          console.error("Error managing folder limit:", error);
        }
      };

      manageFolderLimit();

      // Create the folder for today's notes
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}`
      );

      // Read the contents of changelog.json
      const changelog = await Filesystem.readFile({
        path: "notes/change-log.json",
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      const changelogData = JSON.parse(changelog.data as string);

      // Filter paths from changelog that have been updated
      const updatedPaths = changelogData
        .filter(
          (entry: { action: string }) => entry.action === "updated" || "created"
        )
        .map((entry: { path: string }) => entry.path);

      // Upload only the files and assets that were updated
      if (updatedPaths.includes("notes/data.json")) {
        const datafile = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        await uploadData(datafile, formattedDate);
        setProgress(20); // Update with an appropriate percentage
      }

      // Process note-assets and file-assets using a common function
      const assetTypes = ["note-assets", "file-assets"];
      for (let assetType of assetTypes) {
        if (updatedPaths.some((path: string) => path.startsWith(assetType))) {
          await processAssets(updatedPaths, assetType, formattedDate);
          setProgress(assetType === "note-assets" ? 60 : 100); // Update with an appropriate percentage
        }
      }
    } catch (error) {
      console.error("Error uploading assets:", error);
    }
  };

  // Function to upload data.json
  const uploadData = async (datafile: any, formattedDate: string) => {
    try {
      const dataContent = datafile.data;
      const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;
      const filename = "data.json";
      await webDavService.upload(`${folderPath}/${filename}`, dataContent);
    } catch (error) {
      console.log("Error uploading file.");
    }
  };

  // General function to process note-assets and file-assets
  const processAssets = async (
    updatedPaths: string[],
    assetType: string,
    formattedDate: string
  ) => {
    const assetPath = assetType; // note-assets or file-assets

    // Filter assets that were updated
    const updatedAssets = updatedPaths.filter((path) =>
      path.startsWith(assetPath)
    );

    const assetFolder = assetType === "note-assets" ? "assets" : "file-assets";

    await webDavService.createFolder(
      `Beaver-Pocket/Beaver Notes ${formattedDate}/${assetFolder}`
    );

    await Promise.all(
      updatedAssets.map(async (assetPath) => {
        const folderName = assetPath.split("/")[1]; // Extract the folder name (e.g. "30ff176c-3951-4f13-b04e-cdc1cc2a16d7")
        const folderContents = await Filesystem.readdir({
          path: assetPath,
          directory: Directory.Data,
        });

        await webDavService.createFolder(
          `Beaver-Pocket/Beaver Notes ${formattedDate}/${assetFolder}/${folderName}`
        );

        await Promise.all(
          folderContents.files.map(async (file) => {
            const filePath = `${assetPath}/${file.name}`;
            const fileData = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Data,
            });

            const fileType = mime.getType(file.name);

            // Convert base64 string to Blob
            const blob = base64ToBlob(String(fileData.data), String(fileType));

            // Create a File from the Blob
            const uploadedFile = new File([blob], file.name, {
              type: "application/octet-stream", // Or use the correct MIME type here
            });

            // Upload the file
            await webDavService.upload(
              `Beaver-Pocket/Beaver Notes ${formattedDate}/${assetFolder}/${folderName}/${file.name}`,
              uploadedFile
            );
          })
        );
      })
    );
  };

  // Expose the exportdata function and progress state
  return { syncDav, progress, progressColor };
};

export const useImportDav = (
  setNotesState: (notes: Record<string, Note>) => void
) => {
  const baseUrl = localStorage.getItem("baseUrl") || "";
  const username = localStorage.getItem("username") || "";
  const password = localStorage.getItem("password") || "";

  const webDavService = new WebDavService({ baseUrl, username, password });
  const { importUtils } = useHandleImportData();
  const [progress, setProgress] = useState<number>(0);
  const themeMode = localStorage.getItem("themeMode") || "auto";
  const darkMode =
    themeMode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "dark";
  const [progressColor, setProgressColor] = useState(
    darkMode ? "#444444" : "#e6e6e6"
  );

  const handleImportData = async (): Promise<void> => {
    try {
      setProgress(0);
      const formattedDate = new Date().toISOString().slice(0, 10);
      const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;

      console.log(`Starting download from WebDAV folder: ${folderPath}`);
      await downloadFolder(folderPath, `export/Beaver Notes ${formattedDate}`);
      setProgress(100);

      await importUtils(setNotesState, loadNotes);
      await deleteFolder(`export/Beaver Notes ${formattedDate}`);
    } catch (error) {
      setProgressColor("#ff3333");
      setProgress(0);
    }
  };

  const deleteFolder = async (path: string) => {
    try {
      await Filesystem.rmdir({
        path,
        directory: FilesystemDirectory.Data,
        recursive: true,
      });
      console.log(`Deleted folder: ${path}`);
    } catch (error) {
      console.error("Error deleting folder:", path, error);
    }
  };

  const downloadFolder = async (
    webDavPath: string,
    localPath: string
  ): Promise<void> => {
    try {
      const content = await webDavService.getDirectoryContent(webDavPath);
      console.log("WebDAV Content:", content);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      const responses = Array.from(xmlDoc.getElementsByTagName("d:response"));

      if (responses.length === 0) {
        console.log("No responses found in WebDAV directory.");
        return;
      }

      const downloadPromises = responses.map(async (response) => {
        const href = response.getElementsByTagName("d:href")[0]?.textContent;
        const isCollection =
          response.getElementsByTagName("d:collection").length > 0;

        if (!href) return;

        const decodedHref = decodeURIComponent(href);
        const name = decodedHref.split("/").filter(Boolean).pop();
        if (!name || name === webDavPath.split("/").pop()) return;

        const fullWebDavPath = decodedHref.startsWith(webDavPath)
          ? decodedHref
          : `${webDavPath}/${name}`;
        const fullLocalPath = `${localPath}/${name}`;

        if (isCollection) {
          console.log(`Creating folder: ${fullLocalPath}`);
          await Filesystem.mkdir({
            path: fullLocalPath,
            directory: FilesystemDirectory.Data,
            recursive: true,
          });

          await downloadFolder(fullWebDavPath, fullLocalPath);
        } else {
          console.log(
            `Downloading file: ${fullWebDavPath} -> ${fullLocalPath}`
          );
          await downloadFile(fullWebDavPath, fullLocalPath);
        }
      });

      await Promise.all(downloadPromises);
    } catch (error) {
      console.error("Error in downloadFolder:", error);
    }
  };

  const downloadFile = async (
    webDavPath: string,
    localPath: string
  ): Promise<void> => {
    try {
      console.log(
        `Downloading file from WebDAV: ${webDavPath} to ${localPath}`
      );
      const authToken = btoa(`${username}:${password}`);
      const sanitizedUrl = `${baseUrl}/${webDavPath}`.replace(/\/+/g, "/");

      await Filesystem.downloadFile({
        url: sanitizedUrl,
        path: localPath,
        directory: FilesystemDirectory.Data,
        headers: { Authorization: `Basic ${authToken}` },
      });

      console.log(`File downloaded: ${localPath}`);
    } catch (error) {
      if (error === 404) {
        console.warn(`File not found: ${webDavPath}`);
      } else {
        console.error(
          `Error downloading file ${webDavPath} to ${localPath}:`,
          error
        );
      }
    }
  };

  return { handleImportData, progress, progressColor };
};
