import { WebDavService } from "./webDavApi";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import getMimeType from "./mimetype";
import { useState } from "react";
import { Note } from "../store/types";
import { useHandleImportData } from "./importUtils";
import { loadNotes } from "../store/notes";

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
    new WebDavService({
      baseUrl: baseUrl,
      username: username,
      password: password,
    })
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
              const blob = base64ToBlob(String(imageFileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: "application/octet-stream",
              });

              await webDavService.upload(
                `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`,
                uploadedFile
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
          const blob = base64ToBlob(String(fileData.data), fileType);
          const uploadedFile = new File([blob], item.name, {
            type: "application/octet-stream",
          });

          await webDavService.upload(
            `${fileAssetsFolderPath}/${item.name}`,
            uploadedFile
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
              const blob = base64ToBlob(String(fileData.data), fileType);
              const uploadedFile = new File([blob], file.name, {
                type: "application/octet-stream",
              });

              await webDavService.upload(
                `${subFolderPath}/${file.name}`,
                uploadedFile
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

  // Expose the exportdata function and progress state
  return { exportdata, progress, progressColor };
};

export const useImportDav = (
setNotesState: (notes: Record<string, Note>) => void,
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
    new WebDavService({
      baseUrl: baseUrl,
      username: username,
      password: password,
    })
  );

  const { importUtils } = useHandleImportData();

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

  const HandleImportData = async (): Promise<void> => {
    try {
      setProgress(0);
      setProgressColor(darkMode ? "#444444" : "#e6e6e6");

      await downloadAssets();
      setProgress(50);

      await downloadFileAssets();
      setProgress(75);

      await downloadData();
      setProgress(100);

      // If everything went well, delete the export folder
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);
      const folderPath = `export/Beaver Notes ${formattedDate}`;

      await deleteFolder(folderPath);
    } catch (error) {
      alert(error);
      setProgressColor("#ff3333"); // Set the progress color to red to indicate an error
      setProgress(0); // Reset progress to 0 on failure or stop it at the last successful point
    }
  };

  const deleteFolder = async (path: string) => {
    try {
      await Filesystem.rmdir({
        path: path,
        directory: FilesystemDirectory.Data,
        recursive: true, // Delete all contents of the directory
      });
      console.log("Folder deleted:", path);
    } catch (error) {
      console.error("Error deleting folder:", path, error);
    }
  };

  const downloadFileAssets = async (): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Base directory for file-assets in WebDAV and local export path
      const baseWebDavPath = `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets`;
      const baseLocalPath = `export/Beaver Notes ${formattedDate}/file-assets`;

      // Function to recursively download files and directories
      const downloadDirectory = async (
        webDavPath: string,
        localPath: string
      ) => {
        // Fetch directory content from WebDAV
        const directoryContent = await webDavService.getDirectoryContent(
          webDavPath
        );

        // Parse the XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(directoryContent, "text/xml");

        // Extract file and folder names from the XML
        const responses = xmlDoc.getElementsByTagName("d:response");

        for (let i = 0; i < responses.length; i++) {
          const hrefElement = responses[i].getElementsByTagName("d:href")[0];
          const propStatElement =
            responses[i].getElementsByTagName("d:propstat")[0];
          const propElement =
            propStatElement?.getElementsByTagName("d:prop")[0];
          const resourceTypeElement =
            propElement?.getElementsByTagName("d:resourcetype")[0];

          const href = hrefElement?.textContent;
          const isCollection =
            resourceTypeElement?.getElementsByTagName("d:collection").length >
            0;

          if (href) {
            // Decode URL to handle spaces and special characters
            const decodedHref = decodeURIComponent(href);
            const name = decodedHref
              .split("/")
              .filter((part) => part !== "")
              .pop();

            if (name === webDavPath.split("/").pop()) {
              continue; // Skip the base directory itself
            }

            const fullWebDavPath = `${webDavPath}/${name}`;
            const fullLocalPath = `${localPath}/${name}`;

            console.log(`Processing: ${decodedHref}`);
            console.log(`Full WebDAV Path: ${fullWebDavPath}`);
            console.log(`Full Local Path: ${fullLocalPath}`);

            if (isCollection) {
              // Create the folder locally
              await Filesystem.mkdir({
                path: fullLocalPath,
                directory: FilesystemDirectory.Data,
                recursive: true, // Ensure parent folders are created
              });
              console.log("Folder created:", fullLocalPath);

              // Recursively download the contents of the folder
              await downloadDirectory(fullWebDavPath, fullLocalPath);
            } else {
              // Download the file to the local path
              const authToken = btoa(`${username}:${password}`);
              try {
                const file = await Filesystem.downloadFile({
                  url: `${baseUrl}/${fullWebDavPath}`,
                  path: fullLocalPath,
                  directory: FilesystemDirectory.Data, // Choose the appropriate directory
                  headers: {
                    Authorization: `Basic ${authToken}`,
                    "Content-Type": "application/octet-stream", // Set appropriate content type
                  },
                });
                console.log("File downloaded:", file);
              } catch (fileError) {
                console.error(
                  "Error downloading file:",
                  `${baseUrl}/${fullWebDavPath}`,
                  fileError
                );
              }
            }
          }
        }
      };

      // Start downloading from the base directory
      await downloadDirectory(baseWebDavPath, baseLocalPath);

      // Import data into the app after all files are downloaded
      importUtils(setNotesState, loadNotes);
    } catch (error) {
      throw error;
    }
  };

  const downloadData = async (): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Fetch directory content from WebDAV
      const directoryContent = await webDavService.getDirectoryContent(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/`
      );

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(directoryContent, "text/xml");

      // Extract file and folder names from the XML
      const responses = xmlDoc.getElementsByTagName("d:response");
      for (let i = 0; i < responses.length; i++) {
        const hrefElement = responses[i].getElementsByTagName("d:href")[0];
        const propStatElement =
          responses[i].getElementsByTagName("d:propstat")[0];
        const propElement = propStatElement?.getElementsByTagName("d:prop")[0];
        const resourceTypeElement =
          propElement?.getElementsByTagName("d:resourcetype")[0];

        const href = hrefElement?.textContent;
        const isCollection =
          resourceTypeElement?.getElementsByTagName("d:collection").length > 0;

        if (href && !isCollection) {
          // Decode URL to handle spaces and special characters
          const decodedHref = decodeURIComponent(href);
          const name = decodedHref
            .split("/")
            .filter((part) => part !== "")
            .pop();

          // Check if the file is data.json
          if (name === "data.json") {
            console.log("Name:", name);
            console.log("Type: File");

            const relpathIndex = decodedHref.indexOf("Beaver-Pocket/");
            if (relpathIndex !== -1) {
              const relpathHref = decodedHref.substring(relpathIndex);
              console.log("relpath:", relpathHref);
              const fullpath = `${baseUrl}/${relpathHref}`;
              console.log("Full path:", fullpath);

              // Determine path to save file
              const folderPath = `export/Beaver Notes ${formattedDate}`;

              // Download the file
              const authToken = btoa(`${username}:${password}`);
              const file = await Filesystem.downloadFile({
                url: fullpath,
                path: `${folderPath}/${name}`,
                directory: FilesystemDirectory.Data, // Choose the appropriate directory
                headers: {
                  Authorization: `Basic ${authToken}`,
                  "Content-Type": "application/xml",
                },
              });
              console.log("File downloaded:", file);

              // Exit loop since we only need to download data.json
              break;
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const downloadAssets = async (): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Fetch directory content from WebDAV
      const directoryContent = await webDavService.getDirectoryContent(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/assets`
      );

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(directoryContent, "text/xml");

      // Extract file and folder names from the XML
      const responses = xmlDoc.getElementsByTagName("d:response");
      for (let i = 0; i < responses.length; i++) {
        const hrefElement = responses[i].getElementsByTagName("d:href")[0];
        const propStatElement =
          responses[i].getElementsByTagName("d:propstat")[0];
        const propElement = propStatElement?.getElementsByTagName("d:prop")[0];
        const resourceTypeElement =
          propElement?.getElementsByTagName("d:resourcetype")[0];

        const href = hrefElement?.textContent;
        const isCollection =
          resourceTypeElement?.getElementsByTagName("d:collection").length > 0;

        if (href) {
          // Decode URL to handle spaces and special characters
          const decodedHref = decodeURIComponent(href);
          const name = decodedHref
            .split("/")
            .filter((part) => part !== "")
            .pop();
          const type = isCollection ? "Folder" : "File";
          console.log("Name:", name);
          console.log("Type:", type);

          const relpathIndex = decodedHref.indexOf("Beaver-Pocket/");
          if (relpathIndex !== -1) {
            const relpathHref = decodedHref.substring(relpathIndex);
            console.log("relpath:", relpathHref);
            const fullpath = `${baseUrl}/${relpathHref}`;
            console.log("Full path:", fullpath);

            if (isCollection) {
              // Handle folder creation logic (if any)
              const folderPath = `export/assets/${name}`;
              console.log("Folder created:", folderPath);
              // Add any necessary logic to handle folders
            } else {
              // Extract folder name if any
              const folderNameMatch = decodedHref.match(/\/([^/]+)\/[^/]+$/);
              const folderName = folderNameMatch ? folderNameMatch[1] : "";

              // Determine path to save file
              const folderPath = folderName
                ? `export/Beaver Notes ${formattedDate}/assets/${folderName}`
                : `export/Beaver Notes ${formattedDate}/assets`;

              // Create folder if it does not exist
              await Filesystem.mkdir({
                path: folderPath,
                directory: FilesystemDirectory.Data,
                recursive: true, // Create parent folders if they don't exist
              });

              // Download the file
              const authToken = btoa(`${username}:${password}`);
              const file = await Filesystem.downloadFile({
                url: fullpath,
                path: `${folderPath}/${name}`,
                directory: FilesystemDirectory.Data, // Choose the appropriate directory
                headers: {
                  Authorization: `Basic ${authToken}`,
                  "Content-Type": "application/xml",
                },
              });
              console.log("File downloaded:", file);
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  };
  return { HandleImportData, progress, progressColor };
};
