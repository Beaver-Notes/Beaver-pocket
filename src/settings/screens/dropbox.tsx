import React, { useEffect, useState } from "react";
import { Note } from "../../store/types";
import { Browser } from "@capacitor/browser";
import { v4 as uuid } from "uuid";
import { Dropbox } from "dropbox";
import { useHandleImportData } from "../../utils/importUtils";
import BottomNavBar from "../../components/Home/BottomNavBar";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import {
  loadNotes,
  useSaveNote,
} from "../../store/notes";import getMimeType from "./deps/mimetype";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";
import dayjs from "dayjs";


const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;
const STORAGE_PATH = "notes/data.json";



import DropboxFillIcon from "remixicon-react/DropboxFillIcon";

const LoginPage: React.FC = () => {
  const { notesState, setNotesState, activeNoteId, setActiveNoteId } =
useNotesState();
const { importUtils } = useHandleImportData();
const [searchQuery] = useState<string>("");
const [, setFilteredNotes] =
useState<Record<string, Note>>(notesState);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<string>("");

  // Translations
  const [translations, setTranslations] = useState({
    about: {
      title: "about.title",
      app: "about.app",
      description: "about.description",
      version: "about.version",
      website: "about.website",
      github: "about.github",
      donate: "about.donate",
      copyright: "about.Copyright",
    },
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareTitle: "home.shareTitle",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importError: "home.importError",
      importInvalid: "home.importInvalid",
      title: "home.title",
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
        dayjs.locale(selectedLanguage);
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

          // Save tokens to local storage
          localStorage.setItem("dropbox_access_token", accessToken);
          localStorage.setItem("dropbox_refresh_token", refreshToken);

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
    // Retrieve tokens from local storage
    const storedAccessToken = localStorage.getItem("dropbox_access_token");
    const storedRefreshToken = localStorage.getItem("dropbox_refresh_token");
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
    }
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
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
          localStorage.setItem("dropbox_access_token", newAccessToken);
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
          console.log("Access token expired, refreshing...");
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
    const tokenExpirationCheckInterval = setInterval(() => {
      checkTokenExpiration();
    }, 60000); // Check every minute

    return () => clearInterval(tokenExpirationCheckInterval);
  }, [accessToken]);

  const [fileUploadStatus, setFileUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve access token from local storage
    const storedAccessToken = localStorage.getItem("dropbox_access_token");
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
    }
  }, []);

  const exportdata = async () => {
    if (accessToken) {
      try {
        // Read note-assets directory contents
        const noteAssetsPath = "note-assets"; // Adjust the folder path
        const noteAssetsContents = await Filesystem.readdir({
          path: noteAssetsPath,
          directory: Directory.Data,
        });

        // Read file-assets directory contents
        const filefolderPath = "file-assets"; // Adjust the folder path
        const filefolderContents = await Filesystem.readdir({
          path: filefolderPath,
          directory: Directory.Data,
        });

        // Read the data.json

        const datafile = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        // Get current date for folder name
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD

        // Initialize Dropbox client
        const dbx = new Dropbox({ accessToken });

        // Create folder if it doesn't exist
        await dbx.filesCreateFolderV2({
          path: `/Beaver Notes ${formattedDate}`,
          autorename: false,
        });

        // Create folder if it doesn't exist
        await dbx.filesCreateFolderV2({
          path: `/Beaver Notes ${formattedDate}/assets`,
          autorename: false,
        });

        // upload the data.json
        const dataresponse = await dbx.filesUpload({
          path: `/Beaver Notes ${formattedDate}/data.json`, // Adjust the path where you want to upload the file
          contents: datafile.data,
        });

        console.log(`File uploaded successfully: ${dataresponse}`);

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

          // Upload file to Dropbox
          const response = await dbx.filesUpload({
            path: `/Beaver Notes ${formattedDate}/file-assets/${file.name}`,
            contents: uploadedFile,
          });

          // Log successful upload
          console.log(`File uploaded successfully: ${file}`, response);
        }

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

            // Upload the file to Dropbox
            const response = await dbx.filesUpload({
              path: `/Beaver Notes ${formattedDate}/assets/${folderName.name}/${file.name}`,
              contents: uploadedFile,
            });

            // Log successful upload
            console.log(`File uploaded successfully: ${file.name}`, response);
          }
        }

        setFileUploadStatus("Note exported successfully!");
      } catch (error) {
        // Handle error
        console.error("Error uploading note assets:", error);
        setFileUploadStatus("An error accured while exporting");
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

  const downloadFolder = async () => {
    if (accessToken) {
      try {
        // Get formatted date
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD
  
        // Specify the main folder path
        const mainFolderPath = `/Beaver Notes ${formattedDate}`;
  
        await Filesystem.mkdir({
          path: `export/Beaver Notes ${formattedDate}`,
          directory: FilesystemDirectory.Data
        });
  
        const dbx = new Dropbox({ accessToken });
        // Define a recursive function to create folders locally
        const createFoldersRecursively = async (folderPath: string, parentPath = '') => {
          const response = await dbx.filesListFolder({ path: folderPath });
          for (const entry of response.result.entries) {
            if (entry['.tag'] === 'folder') {
              const folderFullPath = `${parentPath}/${entry.name}`.replace(/^\/+/, ''); // Remove leading slash
  
              // Create folder locally using Capacitor's Filesystem API
              await Filesystem.mkdir({
                path: `export/${mainFolderPath}/${folderFullPath}`,
                directory: FilesystemDirectory.Data
              });
              console.log('Folder created:', `export/${mainFolderPath}/${folderFullPath}`);
  
              const subFolderPath = `${folderPath}/${entry.name}`;
              await createFoldersRecursively(subFolderPath, folderFullPath); // Recursively create sub-folders
            } else if (entry['.tag'] === 'file') {
              const fileFullPath = `${parentPath}/${entry.name}`.replace(/^\/+/, ''); // Remove leading slash
              
              // Download file from Dropbox and save it locally
              await Filesystem.downloadFile({
                url: `https://content.dropboxapi.com/2/files/download`,
                path: `export/${mainFolderPath}/${fileFullPath}`,
                directory: FilesystemDirectory.Data,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Dropbox-API-Arg': JSON.stringify({ path: entry.path_lower })
                }
              });
              console.log('File downloaded:', `export/${mainFolderPath}/${fileFullPath}`);
            }
          }
        };

        await createFoldersRecursively(mainFolderPath);
        importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes);
      } catch (error) {
        console.error("Error creating local folders:", error);
      }
    } else {
      console.error("Access token not found!");
    }
  };

  document.addEventListener("exportAndDownloadEvent", handleExportAndDownload);

  async function handleExportAndDownload() {
    try {
      await exportdata();
      await downloadFolder();
    } catch (error) {
      console.error("Error exporting and downloading:", error);
    }
  }

  const Logout = async () => {
    localStorage.removeItem("dropbox_access_token");
    localStorage.removeItem("dropbox_refresh_token");
  };

  const { saveNote } = useSaveNote();
  useNoteEditor(activeNoteId, notesState, setNotesState, saveNote);
  const handleCreateNewNote = () => {
    const newNote = {
      id: uuid(),
      title: translations.home.title || "New Note",
      content: { type: "doc", content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };
    setNotesState((prevNotes) => ({
      ...prevNotes,
      [newNote.id]: newNote,
    }));
    setActiveNoteId(newNote.id);
    saveNote(newNote);
  };

  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

  const [autoSync, setAutoSync] = useState<boolean>(false);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "dropbox" : "none"; // Change "none" to your desired default value
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  return (
    <div>
      <div className="mx-2 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <p className="ml-2 text-4xl text-left font-bold">
          Sync with <br /> Dropbox
        </p>
        <div className="flex justify-center items-center">
          <div className="bg-neutral-200 bg-opacity-40 rounded-full w-36 h-36 flex justify-center items-center">
            <DropboxFillIcon className="w-32 h-32 text-blue-700" />
          </div>
        </div>
        <BottomNavBar
          onCreateNewNote={handleCreateNewNote}
          onToggleArchiveVisibility={() =>
            setIsArchiveVisible(!isArchiveVisible)
          }
        />
        {accessToken ? (
          <section>
            <div className="ml-9 flex items-center p-1">
              <span className="bg-green-500 w-4 h-4 inline-block rounded-full"></span>
              <p className="ml-2">Logged in</p>
            </div>
            <div className="ml-9 flex items-center p-1">
              {fileUploadStatus && <p>{fileUploadStatus}</p>}
            </div>
            <div className="space-y-2">
              <button
                className="bg-neutral-200 bg-opacity-40 w-4/5 text-black p-2 text-lg font-bold rounded-xl"
                onClick={downloadFolder}
              >
                Import
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-4/5 text-black p-2 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                Export
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-4/5 text-black p-2 text-lg font-bold rounded-xl"
                onClick={Logout}
              >
                Logout
              </button>
            </div>
            <div className="flex items-center ml-8 p-2">
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
            <div className="flex items-center ml-10">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  id="switch"
                  v-model="autoSync"
                  type="checkbox"
                  className="peer sr-only"
                />
                <label htmlFor="switch" className="hidden"></label>
                <div className="peer h-8 w-[3.75rem] rounded-full border bg-slate-200 after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                <span className="inline-block ml-2 align-middle">Fallack</span>
              </label>
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="ml-9 flex items-center p-1">
                <span className="bg-red-500 w-4 h-4 inline-block rounded-full"></span>
                <p className="ml-2">Not logged in</p>
              </div>
              <div className="space-y-4">
                <button
                  className="bg-amber-400 w-4/5 text-white p-2 text-lg font-bold rounded-xl"
                  onClick={handleLogin}
                >
                  Login
                </button>
                <input
                  type="text"
                  className="bg-neutral-200 bg-opacity-40 w-4/5 text-neutral-800 outline-none p-2 text-lg rounded-xl"
                  placeholder="Paste authorization code here"
                  value={authorizationCode}
                  onChange={(e) => setAuthorizationCode(e.target.value)}
                />
                <button
                  className="bg-neutral-200 bg-opacity-40 w-4/5 text-black p-2 text-lg font-bold rounded-xl"
                  onClick={handleExchange}
                >
                  Submit
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
