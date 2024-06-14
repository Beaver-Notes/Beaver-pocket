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
import { useNotesState } from "../store/Activenote";

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

  const exportdata = async () => {
    try {
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
      const uploadData = async () => {
        try {
          const dataContent = datafile.data;
          const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;
          const filename = "data.json";
          await webDavService.upload(`${folderPath}/${filename}`, dataContent);
        } catch (error) {
          console.log("Error uploading file.");
        }
      };
      await uploadData();

      // Read the contents of the note-assets folder
      const noteAssetsPath = "note-assets"; // Adjust the folder path
      const noteAssetsContents = await Filesystem.readdir({
        path: noteAssetsPath,
        directory: Directory.Data,
      });

      // Create the folder for assets
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/assets`
      );

      // Process each subfolder in parallel
      await Promise.all(
        noteAssetsContents.files.map(async (folderName) => {
          // Ensure the entry is a folder
          if (folderName.type === "directory") {
            const folderPath = `${noteAssetsPath}/${folderName.name}`;
            console.log(`Processing folder: ${folderPath}`);

            try {
              // Read files inside the local folder
              const folderContents = await Filesystem.readdir({
                path: folderPath,
                directory: Directory.Data,
              });

              // Create the corresponding WebDAV folder
              await webDavService.createFolder(
                `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}`
              );

              // Process each file in the subfolder in parallel
              await Promise.all(
                folderContents.files.map(async (file) => {
                  const imageFilePath = `${folderPath}/${file.name}`;

                  try {
                    // Read the file data
                    const imageFileData = await Filesystem.readFile({
                      path: imageFilePath,
                      directory: Directory.Data,
                    });

                    // Determine the file format dynamically
                    const fileType = getMimeType(file.name);

                    // Create a Blob from the base64 data
                    const blob = base64ToBlob(
                      String(imageFileData.data),
                      fileType
                    );

                    // Create a File object from the Blob with content type "application/octet-stream"
                    const uploadedFile = new File([blob], file.name, {
                      type: "application/octet-stream",
                    });

                    // Upload the file to WebDAV
                    await webDavService.upload(
                      `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`,
                      uploadedFile
                    );

                    console.log(
                      `Uploaded file: ${file.name} from folder: ${folderName.name}`
                    );
                  } catch (fileError) {
                    console.error(
                      `Error uploading file: ${file.name} from folder: ${folderName.name}`,
                      fileError
                    );
                  }
                })
              );
            } catch (folderError) {
              console.error(
                `Error processing folder: ${folderName.name}`,
                folderError
              );
            }
          } else {
            console.log(`Skipping non-directory entry: ${folderName.name}`);
          }
        })
      );

      // Read file-assets directory contents
      const filefolderPath = "file-assets"; // Adjust the folder path
      const filefolderContents = await Filesystem.readdir({
        path: filefolderPath,
        directory: Directory.Data,
      });

      // Create the folder for file-assets
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets`
      );

      // Process each file in the file-assets folder in parallel
      await Promise.all(
        filefolderContents.files.map(async (file) => {
          const filePath = `${filefolderPath}/${file.name}`;

          try {
            // Read file content
            const fileData = await Filesystem.readFile({
              path: filePath,
              directory: Directory.Data,
            });

            // Determine the file format dynamically
            const fileType = getMimeType(file.name);

            // Create a Blob from the base64 data
            const blob = base64ToBlob(String(fileData.data), fileType);

            // Create a File object from the Blob with content type "application/octet-stream"
            const uploadedFile = new File([blob], file.name, {
              type: "application/octet-stream",
            });

            // Upload the file to WebDAV
            await webDavService.upload(
              `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets/${file.name}`,
              uploadedFile
            );

            console.log(`File uploaded successfully: ${file.name}`);
          } catch (fileError) {
            console.error(`Error uploading file: ${file.name}`, fileError);
          }
        })
      );
    } catch (error) {
      // Handle error
      console.error("Error uploading note assets:", error);
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
  return { exportdata };
};

export const useImportDav = () => {
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

  const { notesState, setNotesState } = useNotesState();
  const { importUtils } = useHandleImportData();
  const [searchQuery] = useState<string>("");
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);
  const HandleImportData = async (): Promise<void> => {
    downloadAssets();
    downloadFileAssets();
    downloadData();
  };

  const downloadFileAssets = async (): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);

      // Fetch directory content from WebDAV
      const directoryContent = await webDavService.getDirectoryContent(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets`
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
                ? `export/Beaver Notes ${formattedDate}/${folderName}`
                : "export/";

              // Download the file
              const authToken = btoa(`${username}:${password}`);
              const file = await Filesystem.downloadFile({
                url: fullpath,
                path: `${folderPath}/${name}`,
                directory: FilesystemDirectory.Documents, // Choose the appropriate directory
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
      importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes);
    } catch (error) {
      // Log the error if downloading the folder fails
      console.error("Error downloading folder:", error);
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
                directory: FilesystemDirectory.Documents, // Choose the appropriate directory
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
      // Log the error if downloading the folder fails
      console.error("Error downloading folder:", error);
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
                directory: FilesystemDirectory.Documents,
                recursive: true, // Create parent folders if they don't exist
              });

              // Download the file
              const authToken = btoa(`${username}:${password}`);
              const file = await Filesystem.downloadFile({
                url: fullpath,
                path: `${folderPath}/${name}`,
                directory: FilesystemDirectory.Documents, // Choose the appropriate directory
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
      // Log the error if downloading the folder fails
      console.error("Error downloading folder:", error);
    }
  };
  return { HandleImportData };
};
