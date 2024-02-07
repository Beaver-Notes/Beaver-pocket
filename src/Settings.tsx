import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import { JSONContent } from "@tiptap/react";
import Sidebar from "./components/Sidebar";
import BottomNavBar from "./components/BottomNavBar";
import "./css/main.css";
import "./css/fonts.css";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import * as CryptoJS from "crypto-js";

import KeyboardLineIcon from "remixicon-react/KeyboardLineIcon";
import InformationLineIcon from "remixicon-react/InformationLineIcon";
import FileUploadLineIcon from "remixicon-react/FileUploadLineIcon";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import { useSwipeable } from "react-swipeable";
import { Share } from "@capacitor/share";
import JSZip from "jszip";

async function createNotesDirectory() {
  const directoryPath = "notes";

  try {
    await Filesystem.mkdir({
      path: directoryPath,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (error: any) {
    console.error("Error creating the directory:", error);
  }
}

const Settings: React.FC = () => {
  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );

  const fonts = [
    "Arimo",
    "Avenir",
    "Helvetica",
    "EB Garamond",
    "OpenDyslexic",
    "Ubuntu",
  ];

  const navigate = useNavigate();

  const handleSwipe = (eventData: any) => {
    const isRightSwipe = eventData.dir === "Right";
    const isSmallSwipe = Math.abs(eventData.deltaX) < 250;

    if (isRightSwipe && isSmallSwipe) {
      eventData.event.preventDefault();
    } else if (isRightSwipe) {
      navigate(-1); // Navigate back
    }
  };

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--selected-font", selectedFont);
    localStorage.setItem("selected-font", selectedFont);
  }, [selectedFont]);

  const updateFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFont(e.target.value);
  };

  const loadNotes = async () => {
    try {
      await createNotesDirectory(); // Create the directory before reading/writing

      const fileExists = await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Documents,
      });

      if (fileExists) {
        const data = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Documents,
          encoding: FilesystemEncoding.UTF8,
        });

        if (data.data) {
          const parsedData = JSON.parse(data.data as string);

          if (parsedData?.data?.notes) {
            return parsedData.data.notes;
          } else {
            console.log(
              "The file is missing the 'notes' data. Returning an empty object."
            );
            return {};
          }
        } else {
          console.log("The file is empty. Returning an empty object.");
          return {};
        }
      } else {
        console.log("The file doesn't exist. Returning an empty object.");
        return {};
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      return {};
    }
  };

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  // State to manage dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  // Effect to update the classList and localStorage when darkMode or themeMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  // Function to toggle dark mode
  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  // Function to set theme mode to auto based on device preference
  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
  };

  const STORAGE_PATH = "notes/data.json";

  const saveNote = React.useCallback(
    async (note: unknown) => {
      try {
        const notes = await loadNotes();

        if (typeof note === "object" && note !== null) {
          const typedNote = note as Note;

          // Use getTime() to get the Unix timestamp in milliseconds
          const createdAtTimestamp =
            typedNote.createdAt instanceof Date
              ? typedNote.createdAt.getTime()
              : Date.now();

          const updatedAtTimestamp =
            typedNote.updatedAt instanceof Date
              ? typedNote.updatedAt.getTime()
              : Date.now();

          notes[typedNote.id] = {
            ...typedNote,
            createdAt: createdAtTimestamp,
            updatedAt: updatedAtTimestamp,
          };

          const data = {
            data: {
              notes,
            },
          };

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify(data),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
        } else {
          console.error("Invalid note object:", note);
        }
      } catch (error) {
        console.error("Error saving note:", error);
      }
    },
    [loadNotes]
  );

  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery] = useState<string>("");
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  }, []);

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const contentMatch = JSON.stringify(note.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const handleCloseEditor = () => {
    setActiveNoteId(null);
  };

  const [withPassword, setWithPassword] = useState(false);

  const exportData = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

      const parentExportFolderPath = `export`;
      await Filesystem.mkdir({
        path: parentExportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `${parentExportFolderPath}/${exportFolderName}`;

      await Filesystem.mkdir({
        path: exportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      const exportedData: any = {
        data: {
          notes: {},
          lockedNotes: {},
        },
        labels: [],
      };

      Object.values(notesState).forEach((note) => {
        const createdAtTimestamp =
          note.createdAt instanceof Date ? note.createdAt.getTime() : 0;
        const updatedAtTimestamp =
          note.updatedAt instanceof Date ? note.updatedAt.getTime() : 0;

        exportedData.data.notes[note.id] = {
          id: note.id,
          title: note.title,
          content: note.content,
          labels: note.labels,
          createdAt: createdAtTimestamp,
          updatedAt: updatedAtTimestamp,
          isBookmarked: note.isBookmarked,
          isArchived: note.isArchived,
          isLocked: note.isLocked,
          lastCursorPosition: note.lastCursorPosition,
        };

        exportedData.labels = exportedData.labels.concat(note.labels);

        if (note.isLocked) {
          exportedData.data.lockedNotes[note.id] = true;
        }
      });

      exportedData.labels = Array.from(new Set(exportedData.labels));

      const jsonData = JSON.stringify(exportedData, null, 2);
      const jsonFilePath = `${exportFolderPath}/data.json`;

      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      const imagesFolderPath = `images`;
      let imagesFolderExists = false;

      try {
        const imagesFolderInfo = await (Filesystem as any).getInfo({
          path: imagesFolderPath,
          directory: Directory.Documents,
        });
        imagesFolderExists = imagesFolderInfo.type === "directory";
      } catch (error) {
        console.error("Error checking images folder:", error);
      }

      if (imagesFolderExists) {
        const exportImagesFolderPath = `${exportFolderPath}/${imagesFolderPath}`;

        await Filesystem.mkdir({
          path: exportImagesFolderPath,
          directory: Directory.Documents,
          recursive: true,
        });

        await Filesystem.copy({
          from: imagesFolderPath,
          to: exportImagesFolderPath,
          directory: Directory.Documents,
        });
      }

      const zip = new JSZip();
      const exportFolderZip = zip.folder(`Beaver Notes ${formattedDate}`);

      const exportFolderFiles = await Filesystem.readdir({
        path: exportFolderPath,
        directory: Directory.Documents,
      });

      await Promise.all(
        exportFolderFiles.files.map(async (file) => {
          const filePath = `${exportFolderPath}/${file.name}`;
          const fileContent = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
          exportFolderZip!.file(file.name, fileContent.data);
        })
      );

      const zipContentBase64 = await zip.generateAsync({ type: "base64" });

      const zipFilePath = `/Beaver_Notes_${formattedDate}.zip`;
      await Filesystem.writeFile({
        path: zipFilePath,
        data: zipContentBase64,
        directory: Directory.Cache,
      });

      await shareZipFile();

      alert(translations.home.exportSuccess);
    } catch (error) {
      alert(translations.home.exportError + (error as any).message);
    }
  };

  const shareZipFile = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const zipFilePath = `/Beaver_Notes_${formattedDate}.zip`;

      const result = await Filesystem.getUri({
        directory: Directory.Cache,
        path: zipFilePath,
      });

      const resolvedFilePath = result.uri;

      await Share.share({
        title: `${translations.home.shareTitle}`,
        url: resolvedFilePath,
        dialogTitle: `${translations.home.shareTitle}`,
      });
    } catch (error) {
      alert(translations.home.shareError + (error as any).message);
    }
  };

  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const importedData = e.target?.result as string;

        let jsonData: string;

        try {
          // Try parsing the data as JSON
          JSON.parse(importedData);
          // If successful, it's JSON, no need for password
          jsonData = importedData;
        } catch (jsonError) {
          // Parsing as JSON failed, assume it's encrypted and ask for password
          const password = prompt("Enter password for import:");

          // Check if the user provided a password
          if (password !== null) {
            // Decrypt the data using CryptoJS and the user's password
            jsonData = CryptoJS.AES.decrypt(importedData, password).toString(
              CryptoJS.enc.Utf8
            );
          } else {
            // User canceled password input, abort import
            console.log("Import canceled.");
            return;
          }
        }

        const parsedData = JSON.parse(jsonData);

        if (parsedData && parsedData.data && parsedData.data.notes) {
          const importedNotes: Record<string, Note> = parsedData.data.notes;

          // Load existing notes from data.json
          const existingNotes = await loadNotes();

          // Merge the imported notes with the existing notes
          const mergedNotes: Record<string, Note> = {
            ...existingNotes,
            ...importedNotes,
          };

          // Update the notesState with the merged notes
          setNotesState(mergedNotes);

          // Update the filteredNotes based on the search query
          const filtered = Object.values(mergedNotes).filter((note) => {
            const titleMatch = note.title
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            const contentMatch = JSON.stringify(note.content)
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            return titleMatch || contentMatch;
          });

          setFilteredNotes(
            Object.fromEntries(filtered.map((note) => [note.id, note]))
          );

          Object.values(importedNotes).forEach((note) => {
            note.createdAt = new Date(note.createdAt);
            note.updatedAt = new Date(note.updatedAt);
          });

          // Save the merged notes to the data.json file
          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data: { notes: mergedNotes } }),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });

          alert(translations.home.importSuccess);
        } else {
          alert(translations.home.importInvalid);
        }
      } catch (error) {
        alert(translations.home.importError);
      }
    };

    reader.readAsText(file);
  };

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const [title, setTitle] = useState(
    activeNoteId ? notesState[activeNoteId].title : ""
  );
  const handleChangeNoteContent = (content: JSONContent, newTitle?: string) => {
    if (activeNoteId) {
      const existingNote = notesState[activeNoteId];
      const updatedTitle =
        newTitle !== undefined && newTitle.trim() !== ""
          ? newTitle
          : existingNote.title;

      const updateNote = {
        ...existingNote,
        updatedAt: new Date(),
        content,
        title: updatedTitle,
      };

      setNotesState((prevNotes) => ({
        ...prevNotes,
        [activeNoteId]: updateNote,
      }));

      saveNote(updateNote);
    }
  };

  const handleCreateNewNote = () => {
    const newNote = {
      id: uuid(),
      title: "New Note",
      content: { type: "doc", content: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
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

  // Translations
  const [translations, setTranslations] = useState({
    settings: {
      apptheme: "settings.apptheme",
      light: "settings.light",
      dark: "settings.dark",
      system: "settings.system",
      selectlanguage: "settings.selectlanguage",
      encryptwpasswd: "settings.encryptwpasswd",
      selectfont: "settings.selectfont",
      iedata: "settings.iedata",
      importdata: "settings.importdata",
      exportdata: "settings.exportdata",
      About: "settings.About",
      Shortcuts: "settings.Shortcuts",
      title: "settings.title",
      Inputpassword: "settings.Inputpassword",
    },
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareTitle: "home.shareTitle",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importError: "home.importError",
      importInvalid: "home.importInvalid",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
        );
        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []); // Empty dependency array means this effect runs once on mount

  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "en"
  );

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "it", name: "Italiano", translations: itTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    window.location.reload(); // Reload the page
  };

  return (
    <div {...handlers}>
      <div className="grid sm:grid-cols-[auto,1fr]">
        <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />

        <div className="overflow-y-hidden">
          {!activeNoteId && (
            <div className="py-2 w-full flex flex-col border-gray-300 overflow-auto">
              <div className="mx-6 md:px-24 overflow-y-auto flex-grow">
                <p className="text-4xl font-bold">
                  {" "}
                  {translations.settings.title || "-"}
                </p>
                <div className="w-full sm:order-2 order-1">
                  <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                    {translations.settings.apptheme || "-"}
                  </p>
                  <div className="grid py-2 w-full h-full grid-cols-3 gap-8 cursor-pointer rounded-md items-center justify-center">
                    <button
                      className="bg-transparent rounded-xl"
                      onClick={() => toggleTheme(false)}
                    >
                      <div className="w-auto mt-4 object-fit">
                        <svg
                          className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                          viewBox="0 0 512 512"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            width="512"
                            height="512"
                            rx="256"
                            fill="#FFFFFF"
                          />
                        </svg>
                      </div>
                      <p className="text-center py-2">
                        {translations.settings.light || "-"}
                      </p>
                    </button>
                    <button
                      onClick={() => toggleTheme(true)}
                      className="bg-transparent rounded-xl"
                    >
                      <div className="w-auto mt-4 object-fit">
                        <svg
                          className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                          viewBox="0 0 512 512"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            width="512"
                            height="512"
                            rx="256"
                            fill="#282727"
                          />
                        </svg>
                      </div>
                      <p className="text-center py-2">
                        {translations.settings.dark || "-"}
                      </p>
                    </button>
                    <button
                      onClick={setAutoMode}
                      className="bg-transparent rounded-xl"
                    >
                      <div className="w-auto mt-4 object-contain">
                        <svg
                          className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                          viewBox="0 0 511 512"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M0 256C0 114.615 114.615 0 256 0V0V512V512C114.615 512 0 397.385 0 256V256Z"
                            fill="white"
                          />
                          <path
                            d="M256 0V0C396.833 0 511 115.167 511 256V256C511 396.833 396.833 512 256 512V512V0Z"
                            fill="#282727"
                          />
                        </svg>
                      </div>
                      <p className="text-center py-2">
                        {translations.settings.system || "-"}
                      </p>
                    </button>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                  {translations.settings.selectfont || "-"}
                </p>
                <div className="relative pt-2">
                  <select
                    value={selectedFont}
                    onChange={updateFont}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-500 dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                  {translations.settings.selectlanguage || "-"}
                </p>
                <div className="relative pt-2">
                  <select
                    value={selectedLanguage}
                    onChange={updateLanguage}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-500 dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                  {translations.settings.iedata || "-"}
                </p>
                <div className="relative pt-2 gap-4 flex flex-col sm:flex-row">
                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <FileDownloadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
                    </div>
                    <div className="w-full mt-11 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]">
                      <label
                        htmlFor="file"
                        className="w-full flex items-center justify-center"
                      >
                        {translations.settings.importdata || "-"}
                      </label>
                      <input
                        className="hidden"
                        type="file"
                        onChange={handleImportData}
                        id="file"
                        // @ts-ignore
                        directory=""
                        webkitdirectory=""
                      />
                    </div>
                  </div>

                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <FileUploadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
                    </div>
                    <div className="flex items-center pt-2">
                      <input
                        type="checkbox"
                        checked={withPassword}
                        onChange={() => setWithPassword(!withPassword)}
                        className="mr-2 mb-"
                      />
                      <span>{translations.settings.encryptwpasswd || "-"}</span>
                    </div>

                    <button
                      className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                      onClick={exportData}
                    >
                      {translations.settings.exportdata || "-"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex gap-4 py-4">
                    <Link
                      to="/about"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <InformationLineIcon className="w-6 h-6 mr-2" />
                      {translations.settings.About || "-"}
                    </Link>
                    <Link
                      to="/shortcuts"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <KeyboardLineIcon className="w-6 h-6 mr-2" />
                      {translations.settings.Shortcuts || "-"}
                    </Link>
                  </div>
                </div>
              </div>
              <BottomNavBar
                onCreateNewNote={handleCreateNewNote}
                onToggleArchiveVisibility={() =>
                  setIsArchiveVisible(!isArchiveVisible)
                }
              />
            </div>
          )}
        </div>
      </div>
      <div>
        {activeNote && (
          <NoteEditor
            note={activeNote}
            title={title}
            onTitleChange={setTitle}
            onChange={handleChangeNoteContent}
            onCloseEditor={handleCloseEditor}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;
