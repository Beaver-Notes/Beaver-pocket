import React, { useState, useEffect } from "react";
import BottomNavBar from "../components/Home/BottomNavBar";
import { Note } from "../store/types";
import NoteEditor from "../NoteEditor";
import Sidebar from "../components/Home/Sidebar";
import { v4 as uuid } from "uuid";
import useNoteEditor from "../store/useNoteActions";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import dayjs from "dayjs";
import { Share } from "@capacitor/share";
import { Link, useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { loadNotes, useSaveNote } from "../store/notes";

import DropboxFillIcon from "remixicon-react/DropboxFillIcon"
import FileUploadLineIcon from "remixicon-react/FileUploadLineIcon";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import ServerLineIcon from "remixicon-react/ServerLineIcon";
import AppleFillIcon from "remixicon-react/AppleFillIcon"
import MicrosoftFillIcon from "remixicon-react/MicrosoftFillIcon";

const Shortcuts: React.FC = () => {
  const { saveNote } = useSaveNote();

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

      const jsonData = JSON.stringify(exportedData, null, 2);
      const jsonFilePath = `${exportFolderPath}/data.json`;

      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      alert(translations.home.exportSuccess);

      await shareExportFolder(exportFolderPath);
    } catch (error) {
      alert(translations.home.exportError + (error as any).message);
    }
  };

  const shareExportFolder = async (folderPath: string) => {
    try {
      const result = await Filesystem.getUri({
        directory: Directory.Data,
        path: folderPath,
      });

      const resolvedFolderPath = result.uri;

      await Share.share({
        title: `${translations.home.shareTitle}`,
        url: resolvedFolderPath,
        dialogTitle: `${translations.home.shareTitle}`,
      });
    } catch (error) {
      alert(translations.home.shareError + (error as any).message);
    }
  };

  const handleImportData = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0];
      const importFolderPath = `/export/Beaver Notes ${formattedDate}`;
      const importDataPath = `${importFolderPath}/data.json`;
      const importAssetsPath = `${importFolderPath}/assets`;

      const existingAssets = await Filesystem.readdir({
        path: "note-assets", // Change this to your app's note-assets folder
        directory: Directory.Data,
      });

      const existingFiles = new Set(
        existingAssets.files.map((file) => file.name)
      );

      const importedAssets = await Filesystem.readdir({
        path: importAssetsPath,
        directory: Directory.Data,
      });

      for (const file of importedAssets.files) {
        if (!existingFiles.has(file.name)) {
          await Filesystem.copy({
            from: `${importAssetsPath}/${file.name}`,
            to: `note-assets/${file.name}`, // Change this to your app's note-assets folder
            directory: Directory.Data,
          });
        }
      }

      const importedData = await Filesystem.readFile({
        path: importDataPath,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      const importedJsonString: string =
        typeof importedData.data === "string"
          ? importedData.data
          : await importedData.data.text();
      const parsedData = JSON.parse(importedJsonString);

      if (parsedData && parsedData.data && parsedData.data.notes) {
        const importedNotes = parsedData.data.notes;

        // Merge imported notes with existing notes
        const existingNotes = await loadNotes();
        const mergedNotes = {
          ...existingNotes,
          ...importedNotes,
        };

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

        setFilteredNotes(
          Object.fromEntries(filtered.map((note) => [note.id, note]))
        );

        // Update note createdAt and updatedAt properties
        Object.values(importedNotes).forEach((note: any) => {
          note.createdAt = new Date(note.createdAt);
          note.updatedAt = new Date(note.updatedAt);
        });

        // Save merged notes to storage
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
  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

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
      <div className="grid sm:grid-cols-[auto,1fr]">
        <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />

        <div className="overflow-y-auto">
          {!activeNoteId && (
            <div className="mx-2 sm:px-20 mb-2">
              <div className=" py-2 space-y-8 w-full">
                <div className="py-2 mx-2 sm:px-20 mb-2">
                  <div className="space-y-3 w-full">
                      <p className="text-4xl font-bold">Sync</p>
                      <div className="bg-neutral-200 bg-opacity-40 dark:bg-[#383737] rounded-xl">
                        <Link className="flex flex-center p-2 border-b-2 border-neutral-200 border-opacity-80" to="/dropbox">
                          <DropboxFillIcon className="w-10 h-10"/>
                          <p className="text-2xl pl-2 py-1 font-bold">Dropbox</p>
                        </Link>
                        <Link className="flex flex-center p-2 border-b-2 border-neutral-200 border-opacity-80" to="/dropbox">
                          <ServerLineIcon className="w-10 h-10"/>
                          <p className="text-2xl pl-2 py-1 font-bold">NextCloud</p>
                        </Link>
                        <Link className="flex flex-center p-2 border-b-2 border-neutral-200 border-opacity-80" to="/dropbox">
                          <AppleFillIcon className="w-10 h-10"/>
                          <p className="text-2xl pl-2 py-1 font-bold">iCloud</p>
                        </Link>
                        <Link className="flex flex-center p-2 border-b-2 border-neutral-200 border-opacity-80" to="/dropbox">
                          <MicrosoftFillIcon className="w-10 h-10"/>
                          <p className="text-2xl pl-2 py-1 font-bold">OneDrive</p>
                        </Link>
                        <Link className="flex flex-center p-2" to="/dropbox">
                          <ServerLineIcon className="w-10 h-10"/>
                          <p className="text-2xl pl-2 py-1 font-bold">Webdav</p>
                        </Link>
                    </div>
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
                        importdata
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
                      />
                      <span className="ml-2">
                      encryptwpasswd
                      </span>
                    </div>

                    <button
                      className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                      onClick={exportData}
                    >
                     exportdata
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
              onToggleArchiveVisibility={() =>
                setIsArchiveVisible(!isArchiveVisible)
              }
            />
          </div>
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
