import React, { useState, useEffect } from "react";
import BottomNavBar from "../components/Home/BottomNavBar";
import { Note } from "../store/types";
import "../css/main.css";
import "../css/fonts.css";
import NoteEditor from "../Editor";
import { v4 as uuid } from "uuid";
import useNoteEditor from "../store/useNoteActions";
import dayjs from "dayjs";
import { useExportData } from "../utils/exportUtils";
import { useHandleImportData } from "../utils/importUtils";
import { Link, useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { loadNotes, useSaveNote } from "../store/notes";

import DropboxFillIcon from "remixicon-react/DropboxFillIcon";
import FileUploadLineIcon from "remixicon-react/FileUploadLineIcon";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import ServerLineIcon from "remixicon-react/ServerLineIcon";
import Sidebar from "../components/Home/Sidebar";

const Shortcuts: React.FC = () => {
  const { saveNote } = useSaveNote();
  const { exportUtils } = useExportData();
  const { importUtils } = useHandleImportData();

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

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

  const exportData = () => {
    exportUtils(notesState); // Pass notesState as an argument
  };

  const handleImportData = () => {
    importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes); // Pass notesState as an argument
  };

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

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const { title, setTitle, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState,
    saveNote
  );

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
      importdata: "settings.importdata",
      exportdata: "settings.exportdata",
      encryptwpasswd: "settings.encryptwpasswd"
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
          `../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

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
  

  return (
    <div {...handlers}>
      <div className="safe-area"></div>
      <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />
        
      <div className="overflow-y-hidden mb-12">
        {!activeNoteId && (
          <div className="mx-2 sm:px-20 mb-2">
            <div className=" py-2 space-y-8 w-full">
              <div className="py-2 mx-2 sm:px-20 mb-2">
                <div className="space-y-3 w-full">
                  <p className="text-4xl font-bold">Sync</p>
                  <div className="bg-neutral-50 dark:bg-[#2D2C2C] p-2 rounded-xl">
                    <Link
                      className="flex flex-center p-2 border-b-2 border-neutral-200 dark:border-neutral-600 border-opacity-80"
                      to="/dropbox"
                    >
                      <DropboxFillIcon className="w-10 h-10" />
                      <p className="text-2xl pl-2 py-1 font-bold">Dropbox</p>
                    </Link>
                    <Link className="flex flex-center p-2" to="/webdav">
                      <ServerLineIcon className="w-10 h-10" />
                      <p className="text-2xl pl-2 py-1 font-bold">Webdav</p>
                    </Link>
                  </div>
                  <div className="relative pt-2 gap-1 flex flex-col sm:flex-row">
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
                        <input type="checkbox" />
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
                </div>
              </div>
            </div>
          </div>
        )}
        <div>
          <BottomNavBar
            onCreateNewNote={handleCreateNewNote}
          />
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

export default Shortcuts;
