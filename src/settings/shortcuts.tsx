import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "../store/types";
import NoteEditor from "../NoteEditor";
import { JSONContent } from "@tiptap/react";
import Sidebar from "../components/Sidebar";
import BottomNavBar from "../components/BottomNavBar";
import "../css/main.css";
import "../css/fonts.css";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";

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

const Shortcuts: React.FC = () => {
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

  const shortcuts = [
    {
      title: "General shortcuts",
      items: [
        { name: "Create new note", keys: ["Ctrl", "N"] },
        { name: "Toggle command prompt", keys: ["Ctrl", "P"] },
        { name: "Toggle dark theme", keys: ["Ctrl", "Shift", "L"] },
      ],
    },
    {
      title: "Navigates shortcuts",
      items: [
        { name: "To edited note", keys: ["Ctrl", "Shift", "W"] },
        { name: "To notes", keys: ["Ctrl", "Shift", "N"] },
        { name: "To archived notes", keys: ["Ctrl", "Shift", "A"] },
        { name: "To settings", keys: ["Ctrl", ","] },
      ],
    },
    {
      title: "Editor shortcuts",
      items: [
        { name: "Bold", keys: ["Ctrl", "B"] },
        { name: "Italic", keys: ["Ctrl", "I"] },
        { name: "Underline", keys: ["Ctrl", "U"] },
        { name: "Link", keys: ["Ctrl", "K"] },
        { name: "Strikethrough", keys: ["Ctrl", "Shift", "X"] },
        { name: "Highlight", keys: ["Ctrl", "Shift", "E"] },
        { name: "Inline code", keys: ["Ctrl", "E"] },
        { name: "Headings (1-6)", keys: ["Ctrl", "Alt", "(1-6)"] },
        { name: "Ordered list", keys: ["Ctrl", "Shift", "7"] },
        { name: "Bullet list", keys: ["Ctrl", "Shift", "8"] },
        { name: "Blockquote", keys: ["Ctrl", "Shift", "B"] },
        { name: "Block code", keys: ["Ctrl", "Alt", "C"] },
      ],
    },
  ];

  return (
    <div className="">
              <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />

      <div className="overflow-y">
      {!activeNoteId && (
        <div className="mx-10 sm:px-60 mb-2"> 
        <div className="general space-y-8 w-full">
          <p className="text-4xl font-bold">Settings</p>
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
                        className="mr-1 border-2 rounded-lg p-1 px-2"
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

export default Shortcuts;
