import { WebDavService } from "./webDavApi";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import getMimeType from "../mimetype";
import { useState } from "react";
import { Note } from "../../store/types";
import { useHandleImportData } from "../importUtils";
import { loadNotes } from "../../store/notes";

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
  const [progressColor, setProgressColor] = useState("#e6e6e6");

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

  const exportdata = async () => {
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

      // Create the folder for today's notes
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}`
      );

      // Read the contents of data.json
      const datafile = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // Upload data.json
      await uploadData(datafile, formattedDate);

      // Update progress after uploading data.json
      setProgress(20); // Update with an appropriate percentage

      // Process note-assets folder
      await processNoteAssets(formattedDate);

      // Update progress after processing note-assets
      setProgress(60); // Update with an appropriate percentage

      // Process file-assets folder
      await processFileAssets(formattedDate);

      // Update progress after processing file-assets
      setProgress(100); // Mark as complete
    } catch (error) {
      // Handle error
      console.error("Error uploading note assets:", error);
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

  // Function to process note-assets
  const processNoteAssets = async (formattedDate: string) => {
    const noteAssetsPath = "note-assets";
    const noteAssetsContents = await Filesystem.readdir({
      path: noteAssetsPath,
      directory: Directory.Data,
    });

    await webDavService.createFolder(
      `Beaver-Pocket/Beaver Notes ${formattedDate}/assets`
    );

    await Promise.all(
      noteAssetsContents.files.map(async (folderName) => {
        if (folderName.type === "directory") {
          const folderPath = `${noteAssetsPath}/${folderName.name}`;
          const folderContents = await Filesystem.readdir({
            path: folderPath,
            directory: Directory.Data,
          });

          await webDavService.createFolder(
            `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}`
          );

          await Promise.all(
            folderContents.files.map(async (file) => {
              const imageFilePath = `${folderPath}/${file.name}`;
              const imageFileData = await Filesystem.readFile({
                path: imageFilePath,
                directory: Directory.Data,
              });

              const fileType = getMimeType(file.name);
              await uploadFileChunked(
                String(imageFileData.data),
                fileType,
                `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`
              );
            })
          );
        }
      })
    );
  };

  // Function to process file-assets
  const processFileAssets = async (formattedDate: string) => {
    const fileAssetsPath = "file-assets";
    const fileAssetsFolderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets`;

    const fileAssetsContents = await Filesystem.readdir({
      path: fileAssetsPath,
      directory: Directory.Data,
    });

    await webDavService.createFolder(fileAssetsFolderPath);

    await Promise.all(
      fileAssetsContents.files.map(async (item) => {
        if (item.type === "file") {
          const filePath = `${fileAssetsPath}/${item.name}`;
          const fileData = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Data,
          });

          const fileType = getMimeType(item.name);
          await uploadFileChunked(
            String(fileData.data),
            fileType,
            `${fileAssetsFolderPath}/${item.name}`
          );
        } else if (item.type === "directory") {
          const folderPath = `${fileAssetsPath}/${item.name}`;
          const folderContents = await Filesystem.readdir({
            path: folderPath,
            directory: Directory.Data,
          });

          const subFolderPath = `${fileAssetsFolderPath}/${item.name}`;
          await webDavService.createFolder(subFolderPath);

          await Promise.all(
            folderContents.files.map(async (file) => {
              const filePath = `${folderPath}/${file.name}`;
              const fileData = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Data,
              });

              const fileType = getMimeType(file.name);
              await uploadFileChunked(
                String(fileData.data),
                fileType,
                `${subFolderPath}/${file.name}`
              );
            })
          );
        }
      })
    );
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

  // Function to upload files in chunks to prevent memory issues
  const uploadFileChunked = async (
    base64Data: string,
    fileType: string,
    filePath: string,
    chunkSize = 1024 * 1024
  ) => {
    const totalChunks = Math.ceil(base64Data.length / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
      const blob = base64ToBlob(chunk, fileType);
      const uploadedFile = new File([blob], `chunk-${i + 1}`, {
        type: fileType,
      });
      await webDavService.upload(`${filePath}-chunk-${i + 1}`, uploadedFile);
      setProgress((prev) => prev + 100 / totalChunks); // Update progress after each chunk
    }
  };

  // Expose the exportdata function and progress state
  return { exportdata, progress, progressColor };
};

export const useImportDav = (
  setNotesState: (notes: Record<string, Note>) => void
) => {
  const [baseUrl] = useState<string>(
    () => localStorage.getItem("baseUrl") || ""
  );
  const [username] = useState<string>(
    () => localStorage.getItem("username") || ""
  );
  const [password] = useState<string>(
    () => localStorage.getItem("password") || ""
  );
  const [webDavService] = useState(
    new WebDavService({ baseUrl, username, password })
  );

  const { importUtils } = useHandleImportData();
  const [progress, setProgress] = useState<number>(0);
  const [themeMode] = useState(
    () => localStorage.getItem("themeMode") || "auto"
  );
  const darkMode =
    themeMode === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "dark";
  const [progressColor, setProgressColor] = useState(darkMode ? "#444444" : "#e6e6e6");

  const HandleImportData = async (): Promise<void> => {
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
      alert(error);
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
      console.log("Parsed XML Document:", xmlDoc);  // Log the parsed XML document

      const responses = Array.from(xmlDoc.getElementsByTagName("d:response"));
      if (responses.length === 0) {
        console.log("No responses found in WebDAV directory.");
      }

      for (const response of responses) {
        const href = response.getElementsByTagName("d:href")[0]?.textContent;
        const isCollection =
          response.getElementsByTagName("d:collection").length > 0;

        if (!href) continue;

        const decodedHref = decodeURIComponent(href);
        const name = decodedHref.split("/").filter(Boolean).pop();
        if (!name || name === webDavPath.split("/").pop()) continue;

        const fullWebDavPath = `${webDavPath}/${name}`;
        const fullLocalPath = `${localPath}/${name}`;

        console.log(`Processing ${fullWebDavPath} to ${fullLocalPath}`);

        if (isCollection) {
          console.log(`Creating directory at: ${fullLocalPath}`);
          await Filesystem.mkdir({
            path: fullLocalPath,
            directory: FilesystemDirectory.Data,
            recursive: true,
          });
          await downloadFolder(fullWebDavPath, fullLocalPath);
        } else {
          await downloadFile(fullWebDavPath, fullLocalPath);
        }
      }
    } catch (error) {
      console.error("Error in downloadFolder:", error);
    }
  };

  const downloadFile = async (
    webDavPath: string,
    localPath: string
  ): Promise<void> => {
    try {
      console.log(`Downloading file from WebDAV: ${webDavPath} to ${localPath}`);
      const authToken = btoa(`${username}:${password}`);
      await Filesystem.downloadFile({
        url: `${baseUrl}/${webDavPath}`,
        path: localPath,
        directory: FilesystemDirectory.Data,
        headers: { Authorization: `Basic ${authToken}` },
      });
      console.log(`File downloaded: ${localPath}`);
    } catch (error) {
      console.error(`Error downloading file ${webDavPath} to ${localPath}:`, error);
    }
  };

  return { HandleImportData, progress, progressColor };
};