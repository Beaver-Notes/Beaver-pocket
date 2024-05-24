import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import useNoteEditor from "./store/useNoteActions";
import BottomNavBar from "./components/Home/BottomNavBar";
import ModularPrompt from "./components/ui/Dialog";
import "./css/main.css";
import "./css/fonts.css";
import "./css/settings.css";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import deTranslations from "./assets/locales/de.json";
import * as CryptoJS from "crypto-js";
import { useSaveNote, loadNotes } from "./store/notes";

import KeyboardLineIcon from "remixicon-react/KeyboardLineIcon";
import InformationLineIcon from "remixicon-react/InformationLineIcon";
import FileUploadLineIcon from "remixicon-react/FileUploadLineIcon";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import SyncLineIcon from "remixicon-react/RefreshLineIcon";
import LockLineIcon from "remixicon-react/LockLineIcon";
import { useSwipeable } from "react-swipeable";
import ReactDOM from "react-dom";
import Sidebar from "./components/Home/Sidebar";

const Settings: React.FC = () => {
  const { saveNote } = useSaveNote();

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

  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery] = useState<string>("");

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
        directory: Directory.Data,
        recursive: true,
      });

      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `${parentExportFolderPath}/${exportFolderName}`;

      await Filesystem.mkdir({
        path: exportFolderPath,
        directory: Directory.Data,
        recursive: true,
      });

      // Copy the note-assets folder
      await Filesystem.copy({
        from: "note-assets",
        to: `${exportFolderPath}/assets`,
        directory: Directory.Data,
      });

      const exportedData: any = {
        data: {
          notes: {},
          lockedNotes: {},
        },
        labels: [],
      };

      Object.values(notesState).forEach((note) => {
        // Check if note.content exists and is not null
        if (
          note.content &&
          typeof note.content === "object" &&
          "content" in note.content
        ) {
          // Check if note.content.content is defined
          if (note.content.content) {
            // Replace src attribute in each note's content
            const updatedContent = note.content.content.map((node) => {
              if (node.type === "image" && node.attrs && node.attrs.src) {
                node.attrs.src = node.attrs.src.replace(
                  "note-assets/",
                  "assets://"
                );
              }
              return node;
            });

            // Update note's content with modified content
            note.content.content = updatedContent;

            // Add the modified note to exportedData
            exportedData.data.notes[note.id] = note;

            exportedData.labels = exportedData.labels.concat(note.labels);

            if (note.isLocked) {
              exportedData.data.lockedNotes[note.id] = true;
            }
          }
        }
      });

      exportedData.labels = Array.from(new Set(exportedData.labels));

      let jsonData = JSON.stringify(exportedData, null, 2);

      const promptRoot = document.createElement("div");
      document.body.appendChild(promptRoot);

      // Encrypt data if "encrypt with password" option is checked
      if (withPassword) {
        const password = await new Promise<string | null>((resolve) => {
          const handleConfirm = (value: string | null) => {
            ReactDOM.unmountComponentAtNode(promptRoot);
            resolve(value);
          };
          const handleCancel = () => {
            ReactDOM.unmountComponentAtNode(promptRoot);
            resolve(null); // Resolving with null for cancel action
          };
          ReactDOM.render(
            <ModularPrompt
              title={translations.home.enterpasswd}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />,
            promptRoot
          );
        });
        if (!password) {
          alert("Password cannot be empty.");
          return;
        }
        const encryptedData = CryptoJS.AES.encrypt(
          jsonData,
          password
        ).toString();
        jsonData = encryptedData;
      }

      const jsonFilePath = `${exportFolderPath}/data.json`;

      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      alert(translations.home.exportSuccess);
    } catch (error) {
      alert(translations.home.exportError + (error as any).message);
    }
  };

  const handleImportData = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0];
      const importFolderPath = `/export/Beaver Notes ${formattedDate}`;
      const importDataPath = `${importFolderPath}/data.json`;
      const importAssetsPath = `${importFolderPath}/assets`;

      // Read the list of existing assets
      const existingAssets = await Filesystem.readdir({
        path: "note-assets",
        directory: Directory.Data,
      });

      const existingFiles = new Set(
        existingAssets.files.map((file) => file.name)
      );

      // Copy imported assets to the app's assets folder
      const importedAssets = await Filesystem.readdir({
        path: importAssetsPath,
        directory: Directory.Data,
      });

      for (const file of importedAssets.files) {
        if (!existingFiles.has(file.name)) {
          await Filesystem.copy({
            from: `${importAssetsPath}/${file.name}`,
            to: `note-assets/${file.name}`,
            directory: Directory.Data,
          });
        }
      }

      // Read the encrypted data from the file
      const importedData = await Filesystem.readFile({
        path: importDataPath,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // Prompt the user for the password
      const password = prompt("Enter the password to decrypt the data:");

      if (!password) {
        alert("Password is required to decrypt the data.");
        return;
      }

      // Convert Blob to string if necessary
      const importedDataString =
        typeof importedData.data === "string"
          ? importedData.data
          : await importedData.data.text();

      // Decrypt the encrypted data using the password
      const decryptedData = CryptoJS.AES.decrypt(
        importedDataString,
        password
      ).toString(CryptoJS.enc.Utf8);

      // Parse the decrypted data as JSON
      const parsedData = JSON.parse(decryptedData);

      // Check if the parsed data is valid
      if (parsedData && parsedData.data && parsedData.data.notes) {
        const importedNotes = parsedData.data.notes;

        // Merge imported notes with existing notes
        const existingNotes = await loadNotes();
        const mergedNotes = {
          ...existingNotes,
          ...importedNotes,
        };

        // Update imported notes content
        Object.values<Note>(importedNotes).forEach((note) => {
          if (
            note.content &&
            typeof note.content === "object" &&
            "content" in note.content
          ) {
            if (note.content.content) {
              const updatedContent = note.content.content.map((node: any) => {
                if (node.type === "image" && node.attrs && node.attrs.src) {
                  node.attrs.src = node.attrs.src.replace(
                    "assets://",
                    "note-assets/"
                  );
                }
                return node;
              });
              note.content.content = updatedContent;
            }
          }
        });

        // Update notes state with merged notes
        setNotesState(mergedNotes);

        // Filter notes based on search query
        const filtered = Object.values<Note>(mergedNotes).filter(
          (note: Note) => {
            const titleMatch = note.title
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            const contentMatch = JSON.stringify(note.content)
              .toLowerCase()
              .includes(searchQuery.toLowerCase());
            return titleMatch || contentMatch;
          }
        );

        // Set filtered notes
        setFilteredNotes(
          Object.fromEntries(filtered.map((note) => [note.id, note]))
        );

        // Update createdAt and updatedAt properties
        Object.values(importedNotes).forEach((note: any) => {
          note.createdAt = new Date(note.createdAt);
          note.updatedAt = new Date(note.updatedAt);
        });

        // Save merged notes to storage
        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({ data: { notes: mergedNotes } }),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        alert("Data imported successfully.");
      } else {
        alert("Invalid imported data format.");
      }
    } catch (error) {
      alert("An error occurred while importing data. Please try again.");
    }
  };

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const { title, setTitle, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState,
    saveNote
  );

  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdAtB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdAtA - createdAtB;
      case "updatedAt":
      default:
        const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return updatedAtA - updatedAtB;
    }
  });
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
      title: "home.title",
      enterpasswd: "home.enterpasswd",
    },
  });

  const [wd, setwd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  useEffect(() => {
    setwd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const toggleBackground = () => {
    const newValue = !wd;
    localStorage.setItem("expand-editor", newValue.toString());
    setwd(newValue);
  };

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
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    window.location.reload(); // Reload the page
  };

  const [selectedOption, setSelectedOption] = useState("System");

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <div {...handlers}>
      <div className="safe-area"></div>
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
                  <div className="w-auto p-4 mx-auto">
                    <div className="switches-container">
                      <input
                        type="radio"
                        id="switchMonthly"
                        name="switchPlan"
                        value="Light"
                        checked={selectedOption === "Light"}
                        onChange={(e) => {
                          toggleTheme(false);
                          handleOptionChange(e);
                        }}
                      />
                      <input
                        type="radio"
                        id="switchYearly"
                        name="switchPlan"
                        value="Dark"
                        checked={selectedOption === "Dark"}
                        onChange={(e) => {
                          toggleTheme(true);
                          handleOptionChange(e);
                        }}
                      />
                      <input
                        type="radio"
                        id="switchDay"
                        name="switchPlan"
                        value="System"
                        checked={selectedOption === "System"}
                        onChange={(e) => {
                          setAutoMode();
                          handleOptionChange(e);
                        }}
                      />
                      <label htmlFor="switchMonthly">Light</label>
                      <label htmlFor="switchYearly">Dark</label>
                      <label htmlFor="switchDay">System</label>
                      <div className="switch-wrapper">
                        <div className="switch">
                          <div>Light</div>
                          <div>Dark</div>
                          <div>System</div>
                        </div>
                      </div>
                    </div>
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
                <div className="py-2">
                  <label className="flex hidden sm:block md:block lg:block items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backgroundToggle"
                      checked={wd}
                      onChange={toggleBackground}
                    />
                    <span className="inline-block align-top">Expand page</span>
                  </label>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                  {translations.settings.iedata || "-"}
                </p>
                <div className="relative pt-2 gap-4 flex flex-col sm:flex-row">
                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <FileDownloadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
                    </div>
                    <div className="bottom-0">
                      <button
                        className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                        onClick={handleImportData}
                      >
                        {translations.settings.importdata || "-"}
                      </button>
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
                      />
                      <span className="ml-2">
                        {translations.settings.encryptwpasswd || "-"}
                      </span>
                    </div>

                    <button
                      className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                      onClick={exportData}
                    >
                      {translations.settings.exportdata || "-"}
                    </button>
                  </div>
                </div>
                <div className="pb-4">
                <div className="flex gap-2 pt-2">
                    <Link
                      to="/Sync"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <SyncLineIcon className="w-6 h-6 mr-2" />
                      Sync
                    </Link>
                    <Link
                      to="/shortcuts"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <LockLineIcon className="w-6 h-6 mr-2" />
                      Security
                    </Link>
                  </div>
                  <div className="flex gap-2 py-2">
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
              />
            </div>
          )}
        </div>
      <div>
        {activeNote && (
          <NoteEditor
            notesList={notesList}
            note={activeNote}
            title={title}
            onTitleChange={setTitle}
            onChange={handleChangeNoteContent}
            onCloseEditor={handleCloseEditor}
          />
        )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
