import React, { useEffect, useState } from "react";
import { WebDavService } from "./deps/WebDavApi";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import getMimeType from "./deps/mimetype";
import ServerLineIcon from "remixicon-react/ServerLineIcon";

const ExampleComponent: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState<string>(
    () => localStorage.getItem("baseUrl") || ""
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("username") || ""
  );
  const [password, setPassword] = useState<string>(
    () => localStorage.getItem("password") || ""
  );
  const [webDavService] = useState(
    new WebDavService({
      baseUrl: baseUrl,
      username: username,
      password: password,
    })
  );
  const STORAGE_PATH = "notes/data.json";

  useEffect(() => {
    localStorage.setItem("baseUrl", baseUrl);
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
  }, [baseUrl, username, password]);

  const handleUpload = async () => {
    try {
      const dummyFileContent = "This is a dummy file content.";
      await webDavService.upload("dummy.dm", dummyFileContent);
      alert("File uploaded successfully!");
    } catch (error) {
      console.log("Error uploading file.");
    }
  };

  const handleCreateFolder = async () => {
    try {
      await webDavService.createFolder("new-folder");
      alert("Folder created successfully!");
    } catch (error) {
      console.log("Error creating folder.");
    }
  };

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

      // Create the folder for today's notes
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}`
      );

      // read the contents of data.json
      const datafile = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // upload data.json
      const UploadData = async () => {
        try {
          const DataContent = datafile.data;
          const folderPath = `Beaver-Pocket/Beaver Notes ${formattedDate}`;
          const filename = "data.json";
          await webDavService.upload(`${folderPath}/${filename}`, DataContent);
          alert("File uploaded successfully!");
        } catch (error) {
          console.log("Error uploading file.");
        }
      };
      await UploadData();

      //read the contents of the image folder
      const noteAssetsPath = "note-assets"; // Adjust the folder path
      const noteAssetsContents = await Filesystem.readdir({
        path: noteAssetsPath,
        directory: Directory.Data,
      });

      // Create the folder for assets
      await webDavService.createFolder(
        `Beaver-Pocket/Beaver Notes ${formattedDate}/assets`
      );

      // Iterate through each folder in the note-assets directory
      for (const folderName of noteAssetsContents.files) {
        // Read files inside the local folder
        const folderPath = `${noteAssetsPath}/${folderName.name}`;
        const folderContents = await Filesystem.readdir({
          path: folderPath,
          directory: Directory.Data,
        });

        // Upload each file to the corresponding Dropbox folder
        for (const file of folderContents.files) {
          const imagefilePath = `${folderPath}/${file.name}`;

          // Read the file data
          const imageFileData = await Filesystem.readFile({
            path: imagefilePath,
            directory: Directory.Data,
          });

          // Determine the file format dynamically
          const fileType = getMimeType(file.name);

          // Create a Blob from the base64 data
          const blob = base64ToBlob(String(imageFileData.data), fileType);

          // Create a File object from the Blob with content type "application/octet-stream"
          const uploadedFile = new File([blob], file.name, {
            type: "application/octet-stream",
          });

          await webDavService.createFolder(
            `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}`
          );

          await webDavService.upload(
            `Beaver-Pocket/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`,
            uploadedFile
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

          // Iterate through each file in the folder
          for (const file of filefolderContents.files) {
            // Read file content
            const filePath = `${filefolderPath}/${file.name}`;
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

            await webDavService.upload(
              `Beaver-Pocket/Beaver Notes ${formattedDate}/file-assets/${file.name}`,
              uploadedFile
            );

            // Log successful upload
            console.log(`File uploaded successfully: ${file}`, Response);
          }

          // Log successful upload
          console.log(`File uploaded successfully: ${file.name}`, Response);
        }
      }
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

  const [autoSync, setAutoSync] = useState<boolean>(false);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "webdav" : "none";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  const handleDownloadFolder = async (): Promise<void> => {
    try {
      // Get current date for folder name
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 10);
      const directoryContent = await webDavService.getDirectoryContent(`Beaver-Pocket/Beaver Notes ${formattedDate}/assets`);
  
      // Parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(directoryContent, "text/xml");
  
      // Extract file and folder names
      const responses = xmlDoc.getElementsByTagName("d:response");
      for (let i = 0; i < responses.length; i++) {
        const hrefElement = responses[i].getElementsByTagName("d:href")[0];
        const propStatElement = responses[i].getElementsByTagName("d:propstat")[0];
        const propElement = propStatElement?.getElementsByTagName("d:prop")[0];
        const resourceTypeElement = propElement?.getElementsByTagName("d:resourcetype")[0];
  
        const href = hrefElement?.textContent;
        const isCollection = resourceTypeElement?.getElementsByTagName("d:collection").length > 0;
  
        if (href) {
          const name = href.split("/").filter((part) => part !== "").pop();
          const type = isCollection ? "Folder" : "File";
          console.log("Name:", name);
          console.log("Type:", type);
  
          const relpathIndex = href.indexOf("Beaver-Pocket/");
          if (relpathIndex !== -1) {
            const relpathHref = href.substring(relpathIndex);
            console.log("relpath:", relpathHref);
            const fullpath = baseUrl + `/${relpathHref}`;
            console.log("Full path:", fullpath);
  
            if (isCollection) {
              // Create folder
              const folderPath = `export/assets/${name}`;
              console.log("Folder created:", folderPath);
            } else {
              // Extract folder name if any
              const folderNameMatch = href.match(/\/([^/]+)\/[^/]+$/);
              const folderName = folderNameMatch ? folderNameMatch[1] : '';
  
              // Determine path to save file
              const folderPath = folderName ? `export/assets/${folderName}` : 'export/assets';
  
              // Create folder if not exist
              await Filesystem.mkdir({
                path: folderPath,
                directory: FilesystemDirectory.Documents,
                recursive: true, // Create parent folders if they don't exist
              });
  
              // Download file
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
  

  return (
    <div>
      <div className="mx-10 sm:mx-32 lg:mx-72 mt-2 mb-2 items-center align-center text-center space-y-4">
        <section className="">
          <div className="flex flex-col">
            <div className="ml-4 space-y-2">
              <p className="ml-2 text-4xl text-left font-bold">
                Sync with <br /> WebDAV
              </p>
              <div className="flex justify-center items-center">
                <div className="bg-neutral-200 bg-opacity-40 rounded-full w-36 h-36 flex justify-center items-center">
                  <ServerLineIcon className="w-32 h-32 text-gray-700 p-2" />
                </div>
              </div>
              <input
                type="text"
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                value={baseUrl}
                placeholder="https://server.example"
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <input
                type="text"
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={handleUpload}
              >
                Upload Dummy File
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={handleCreateFolder}
              >
                Create Folder
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                Export data
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={handleDownloadFolder}
              >
                List Folder Contents
              </button>
              <div className="flex items-center ml-2 p-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="switch"
                    type="checkbox"
                    checked={autoSync}
                    onChange={handleSyncToggle}
                    className="peer sr-only"
                  />
                  <label htmlFor="switch" className="hidden"></label>
                  <div className="peer h-8 w-[3.75rem] rounded-full border bg-slate-200 after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  <span className="inline-block ml-2 align-middle">
                    Auto sync
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExampleComponent;
