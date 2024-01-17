import { Link } from "react-router-dom";
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

import KeyboardLineIcon from "remixicon-react/KeyboardLineIcon";
import InformationLineIcon from "remixicon-react/InformationLineIcon";
import FileUploadLineIcon from "remixicon-react/FileUploadLineIcon";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";

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

const App: React.FC = () => {
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

  const exportData = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

      // Create the parent export folder
      const parentExportFolderPath = `export`;
      await Filesystem.mkdir({
        path: parentExportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      // Create the export folder structure
      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `${parentExportFolderPath}/${exportFolderName}`;

      // Create the export folder
      await Filesystem.mkdir({
        path: exportFolderPath,
        directory: Directory.Documents,
        recursive: true,
      });

      // Export data.json
      const exportedData: any = {
        data: {
          notes: {},
        },
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
          lastCursorPosition: note.lastCursorPosition,
        };
      });

      const jsonData = JSON.stringify(exportedData, null, 2);
      const jsonFilePath = `${exportFolderPath}/data.json`;

      // Save data.json
      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      // Check if the images folder exists
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
        // Export images folder
        const exportImagesFolderPath = `${exportFolderPath}/${imagesFolderPath}`;

        // Create the images folder in the export directory
        await Filesystem.mkdir({
          path: exportImagesFolderPath,
          directory: Directory.Documents,
          recursive: true,
        });

        // Copy images folder to export folder
        await Filesystem.copy({
          from: imagesFolderPath,
          to: exportImagesFolderPath,
          directory: Directory.Documents,
        });
      }

      console.log("Export completed successfully!");

      // Notify the user
      window.alert("Export completed successfully! Check your downloads.");
    } catch (error) {
      console.error("Error exporting data and images:", error);
      alert("Error exporting data and images: " + (error as any).message);
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
        const importedData = JSON.parse(e.target?.result as string);

        if (importedData && importedData.data && importedData.data.notes) {
          const importedNotes: Record<string, Note> = importedData.data.notes;

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

          alert("Data imported successfully!");
        } else {
          alert("Invalid data format.");
        }
      } catch (error) {
        console.error("Error while importing data:", error);
        alert("Error while importing data.");
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

  return (
    <div>
      <div className="grid sm:grid-cols-[auto,1fr]">
        <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />

        <div className="overflow-y">
          {!activeNoteId && (
            <div className="py-2 w-full flex flex-col border-gray-300 mx-10 sm:px-60 overflow-auto">
              <div className="overflow-y-auto flex-grow">
                <p className="text-4xl font-bold">Settings</p>
                <div className="w-full sm:order-2 order-1">
                  <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                    App Theme
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
                      <p className="text-center py-2">Light</p>
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
                      <p className="text-center py-2">Dark</p>
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
                      <p className="text-center py-2">Auto</p>
                    </button>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-white">
                  Select Font
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
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
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
                  Import / Export Data
                </p>
                <div className="relative pt-2 gap-4 flex flex-col sm:flex-row">
                <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <FileDownloadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
                    </div>
                    <button className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]">
                      Import Data
                    </button>
                  </div>
                  
                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <FileUploadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
                    </div>
                    <button className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]">
                      Export Data
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex gap-4 py-4">
                    <Link
                      to="/about"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <InformationLineIcon className="w-6 h-6 mr-2" /> About
                    </Link>
                    <Link
                      to="/shortcuts"
                      className="w-1/2 p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <KeyboardLineIcon className="w-6 h-6 mr-2" /> Shortcuts
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

export default App;
