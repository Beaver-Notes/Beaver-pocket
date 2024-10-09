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
  const [baseUrl] = useState<string>(() => localStorage.getItem("baseUrl") || "");
  const [username] = useState<string>(() => localStorage.getItem("username") || "");
  const [password] = useState<string>(() => localStorage.getItem("password") || "");
  const STORAGE_PATH = "notes/data.json";
  const syncLimit = parseInt(localStorage.getItem("synclimit") || "5", 10); // Get syncLimit from localStorage or default to 5
  const [webDavService] = useState(new WebDavService({ baseUrl, username, password }));

  const [progress, setProgress] = useState<number>(0);
  const [progressColor, setProgressColor] = useState("#e6e6e6");

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
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

      // Manage folder limit: Delete old folders if syncLimit is exceeded
      await manageFolderLimit();

      const exportFolderExists = await webDavService.folderExists(
        `Beaver-Pocket/Beaver Notes ${formattedDate}`
      );

      if (exportFolderExists) {
        // If the folder exists, delete it
        await webDavService.deleteFolder(`Beaver-Pocket/Beaver Notes ${formattedDate}`);
      }

      // Create the folder for today's notes
      await webDavService.createFolder(`Beaver-Pocket/Beaver Notes ${formattedDate}`);

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

  // Manage folder limit and delete old folders if needed
  const manageFolderLimit = async () => {
    try {
      // Fetch directory content from WebDAV for the "Beaver-Pocket" folder
      const directoryContent = await webDavService.getDirectoryContent("Beaver-Pocket");

      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(directoryContent, "text/xml");

      // Extract file and folder names from the XML
      const responses = xmlDoc.getElementsByTagName("d:response");
      const beaverNoteFolders: any[] = [];

      for (let i = 0; i < responses.length; i++) {
        const hrefElement = responses[i].getElementsByTagName("d:href")[0];
        const propStatElement = responses[i].getElementsByTagName("d:propstat")[0];
        const propElement = propStatElement?.getElementsByTagName("d:prop")[0];
        const resourceTypeElement = propElement?.getElementsByTagName("d:resourcetype")[0];
        const isCollection = resourceTypeElement?.getElementsByTagName("d:collection").length > 0;

        const href = hrefElement?.textContent;
        if (href && isCollection) {
          // Decode the URL to handle special characters and spaces
          const decodedHref = decodeURIComponent(href);
          const folderName = decodedHref.split("/").filter((part) => part !== "").pop();

          // Check if the folder starts with "Beaver Notes"
          if (folderName && folderName.startsWith("Beaver Notes")) {
            beaverNoteFolders.push({ name: folderName });
          }
        }
      }

      // If the number of Beaver Notes folders exceeds the limit
      if (beaverNoteFolders.length > syncLimit) {
        // Sort the folders by date (oldest first)
        const sortedFolders = beaverNoteFolders.sort(
          (a: any, b: any) =>
            new Date(a.name.replace("Beaver Notes ", "")).getTime() -
            new Date(b.name.replace("Beaver Notes ", "")).getTime()
        );

        // Calculate the number of folders to delete
        const foldersToDelete = sortedFolders.slice(
          0,
          beaverNoteFolders.length - syncLimit
        );

        await Promise.all(
          foldersToDelete.map(async (folder: any) => {
            await webDavService.deleteFolder(`Beaver-Pocket/${folder.name}`);
          })
        );
      }
    } catch (error) {
      console.error("Error managing folder limit:", error);
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

    await webDavService.createFolder(`Beaver-Pocket/Beaver Notes ${formattedDate}/assets`);

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
              await uploadFileChunked(String(imageFileData.data), fileType, 
                `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`);
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
          await uploadFileChunked(String(fileData.data), fileType,
            `${fileAssetsFolderPath}/${item.name}`);
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
              await uploadFileChunked(String(fileData.data), fileType,
                `${subFolderPath}/${file.name}`);
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
  const uploadFileChunked = async (base64Data: string, fileType: string, filePath: string, chunkSize = 1024 * 1024) => {
    const totalChunks = Math.ceil(base64Data.length / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
      const blob = base64ToBlob(chunk, fileType);
      const uploadedFile = new File([blob], `chunk-${i + 1}`, { type: fileType });
      await webDavService.upload(`${filePath}-chunk-${i + 1}`, uploadedFile);
      setProgress(prev => prev + (100 / totalChunks)); // Update progress after each chunk
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

      // Attempt to find a folder
      const folderPath = await findValidFolderPath();
      if (!folderPath) {
        alert("No valid 'Beaver Notes' folder found in the past 30 days.");
        return;
      }
      setProgress(10);

      await downloadAssets(folderPath);
      setProgress(50);

      await downloadFileAssets(folderPath);
      setProgress(75);

      await downloadData(folderPath);
      setProgress(100);

      // If everything went well, delete the export folder
      await importUtils(setNotesState, loadNotes);
      await deleteFolder(folderPath);
    } catch (error) {
      alert(error);
      setProgressColor("#ff3333");
      setProgress(0);
    }
  };

  // Function to find a valid "Beaver Notes" folder path
  const findValidFolderPath = async (): Promise<string | null> => {
    const currentDate = new Date();
    const folderDate = new Date(currentDate);

    for (let i = 0; i < 30; i++) {
      const formattedDate = folderDate.toISOString().slice(0, 10);
      const testFolderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}/`;

      try {
        // Fetch directory content from WebDAV
        const directoryContent = await webDavService.getDirectoryContent(
          testFolderPath
        );
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(directoryContent, "text/xml");
        const responses = xmlDoc.getElementsByTagName("d:response");

        // Check if the folder exists
        if (responses.length > 0) {
          console.log(`Found folder: ${testFolderPath}`);
          return testFolderPath; // Return the first valid folder found
        }
      } catch (error) {
        console.error(`Error checking folder ${testFolderPath}:`, error);
      }

      // Go back one day
      folderDate.setDate(folderDate.getDate() - 1);
    }

    return null; // No valid folder found after 30 days
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

  const downloadFileAssets = async (folderPath:string): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Base directory for file-assets in WebDAV and local export path
      const baseWebDavPath = `${folderPath}/file-assets`;
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
    } catch (error) {
      throw error;
    }
  };

  const downloadData = async (folderPath:string): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Fetch directory content from WebDAV
      const directoryContent = await webDavService.getDirectoryContent(
        `${folderPath}`
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

  const downloadAssets = async (folderPath:string): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Fetch directory content from WebDAV
      const directoryContent = await webDavService.getDirectoryContent(
        `${folderPath}`
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
