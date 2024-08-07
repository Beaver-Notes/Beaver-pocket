import React, { useState, useEffect } from "react";
import BottomNavBar from "../components/Home/BottomNavBar";
import { Note } from "../store/types";
import NoteEditor from "../Editor";
import { version } from "../../package.json";
import icons from "../lib/remixicon-react";
import { v4 as uuid } from "uuid";
import useNoteEditor from "../store/useNoteActions";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import "../css/main.css";
import "../css/fonts.css";
import { loadNotes, useSaveNote } from "../store/notes";
import { useExportDav } from "../utils/webDavUtil";

const Shortcuts: React.FC = () => {
  const { saveNote } = useSaveNote();

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
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      const dropboxExport = new CustomEvent("dropboxExport");
      document.dispatchEvent(dropboxExport);
    } else if (syncValue === "webdav") {
      const { exportdata } = useExportDav();
      exportdata();
    }
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
  );

  return (
    <div {...handlers}>
      <div className="safe-area"></div>

        <div className="overflow-y-hidden mb-12">
          {!activeNoteId && (
            <div className="mx-2 sm:px-20 mb-2">
              <div className="general py-2 space-y-8 w-full">
                <div className="py-2 mx-2 sm:px-20 mb-2">
                  <div className="general space-y-3 w-full">
                    <img
                      src="./imgs/icon.png"
                      alt="Beaver Notes Icon"
                      className="w-32 h-32 rounded-full"
                    />
                    <h4 className="mt-4 font-bold">
                      {" "}
                      {translations.about.app}
                    </h4>
                    <p>{translations.about.description}</p>
                    <p className="mt-2">
                      {translations.about.version}{" "}
                      <span className="ml-8">{version}</span>
                    </p>

                    <p>{translations.about.copyright}</p>

                    <div className="mt-4 flex gap-4">
                      <a
                        href="https://beavernotes.com"
                        className="flex items-center"
                      >
                        <icons.GlobalLineIcon className="w-6 h-6 mr-2" />
                        {translations.about.website}
                      </a>

                      <a
                        href="https://github.com/Daniele-rolli/Beaver-notes-pocket"
                        className="flex items-center"
                      >
                        <icons.GithubFillIcon className="w-6 h-6 mr-2" />
                        {translations.about.github}
                      </a>

                      <a
                        href="https://www.buymeacoffee.com/beavernotes"
                        className="flex items-center"
                      >
                        <icons.CupLineIcon className="w-6 h-6 mr-2" />
                        {translations.about.donate}
                      </a>
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
              uniqueLabels={uniqueLabels}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Shortcuts;
