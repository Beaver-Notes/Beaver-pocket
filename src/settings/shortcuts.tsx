import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "../store/types";
import NoteEditor from "../NoteEditor";
import useNoteEditor from "../store/useNoteActions";
import Sidebar from "../components/Home/Sidebar";
import BottomNavBar from "../components/Home/BottomNavBar";
import "../css/main.css";
import "../css/fonts.css";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import dayjs from "dayjs";
import { Share } from "@capacitor/share";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import {
  loadNotes,
  useSaveNote,
} from "../store/notes";

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
    settings: {
      title: "settings.title",
    },
    shortcuts: {
      Createnewnote: "shortcuts.Createnewnote",
      Toggledarktheme: "shortcuts.Toggledarktheme",
      Tonotes: "shortcuts.Tonotes",
      Toarchivednotes: "shortcuts.ToarchivedNotes",
      Tosettings: "shortcuts.Tosettings",
      Bold: "shortcuts.Bold",
      Italic: "shortcuts.Italic",
      Underline: "shortcuts.Underline",
      Link: "shortcuts.Link",
      Strikethrough: "shortcuts.Strikethrough",
      Highlight: "shortcuts.Highlight",
      Inlinecode: "shortcuts.InlineCode",
      Headings: "shortcuts.Headings",
      Orderedlist: "shortcuts.OrderedList",
      Bulletlist: "shortcuts.Bulletlist",
      Blockquote: "shortcuts.Blockquote",
      Blockcode: "shortcuts.BlockCode",
      General: "shortcuts.General",
      Navigates: "shortcuts.Navigates",
      Editor: "shortcuts.Editor",
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

  const shortcuts = [
    {
      title: translations.shortcuts.General,
      items: [
        { name: translations.shortcuts.Createnewnote, keys: ["Ctrl", "N"] },
        {
          name: translations.shortcuts.Toggledarktheme,
          keys: ["Ctrl", "Shift", "L"],
        },
      ],
    },
    {
      title: translations.shortcuts.Navigates,
      items: [
        { name: translations.shortcuts.Tonotes, keys: ["Ctrl", "Shift", "N"] },
        {
          name: translations.shortcuts.Toarchivednotes,
          keys: ["Ctrl", "Shift", "A"],
        },
        { name: translations.shortcuts.Tosettings, keys: ["Ctrl", ","] },
      ],
    },
    {
      title: translations.shortcuts.Editor,
      items: [
        { name: translations.shortcuts.Bold, keys: ["Ctrl", "B"] },
        { name: translations.shortcuts.Italic, keys: ["Ctrl", "I"] },
        { name: translations.shortcuts.Underline, keys: ["Ctrl", "U"] },
        { name: translations.shortcuts.Link, keys: ["Ctrl", "K"] },
        {
          name: translations.shortcuts.Strikethrough,
          keys: ["Ctrl", "Shift", "X"],
        },
        {
          name: translations.shortcuts.Highlight,
          keys: ["Ctrl", "Shift", "E"],
        },
        { name: translations.shortcuts.Inlinecode, keys: ["Ctrl", "E"] },
        {
          name: translations.shortcuts.Headings,
          keys: ["Ctrl", "Alt", "(1-6)"],
        },
        {
          name: translations.shortcuts.Orderedlist,
          keys: ["Ctrl", "Shift", "7"],
        },
        {
          name: translations.shortcuts.Bulletlist,
          keys: ["Ctrl", "Shift", "8"],
        },
        {
          name: translations.shortcuts.Blockquote,
          keys: ["Ctrl", "Shift", "B"],
        },
        { name: translations.shortcuts.Blockcode, keys: ["Ctrl", "Alt", "C"] },
      ],
    },
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

        <div className="overflow-y">
          {!activeNoteId && (
            <div className="mx-6 sm:px-20 mb-2">
              <div className="general py-2 space-y-8 w-full">
                <p className="text-4xl font-bold">
                  {translations.settings.title}
                </p>
                {shortcuts.map((shortcut) => (
                  <section key={shortcut.title}>
                    <p className="mb-2">{shortcut.title}</p>
                    <div className="rounded-lg bg-gray-800 bg-opacity-5 dark:bg-gray-200 dark:bg-opacity-5">
                      {shortcut.items.map((item) => (
                        <div key={item.name} className="flex items-center p-3">
                          <p className="flex-1">{item.name}</p>
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="mr-1 border-2 dark:border-neutral-700 rounded-lg p-1 px-2"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
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
