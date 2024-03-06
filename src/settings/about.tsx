import React, { useState, useEffect } from "react";
import BottomNavBar from "../components/Home/BottomNavBar";
import { Note } from "../store/types";
import NoteEditor from "../NoteEditor";
import Sidebar from "../components/Home/Sidebar";
import { version } from "../../package.json";
import GlobalLineIcon from "remixicon-react/GlobalLineIcon";
import GithubFillIcon from "remixicon-react/GithubFillIcon";
import CupLineIcon from "remixicon-react/CupLineIcon";
import { v4 as uuid } from "uuid";
import { JSONContent } from "@tiptap/react";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import dayjs from "dayjs";
import { Share } from "@capacitor/share";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";

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

const About: React.FC = ({}) => {
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
      }
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
          const importedData = JSON.parse(e.target?.result as string);
  
          if (importedData && importedData.data && importedData.data.notes) {
            const importedNotes: Record<string, Note> = importedData.data.notes;
  
            const existingNotes = await loadNotes();
  
            const mergedNotes: Record<string, Note> = {
              ...existingNotes,
              ...importedNotes,
            };
  
            setNotesState(mergedNotes);
  
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

  const [isArchiveVisible, setIsArchiveVisible] = useState(false);
  return (
    <div {...handlers}>
      <Sidebar
        onCreateNewNote={handleCreateNewNote}
        isDarkMode={darkMode}
        toggleTheme={() => toggleTheme(!darkMode)}
        exportData={exportData}
        handleImportData={handleImportData}
      />
      <div className="overflow-y">
        {!activeNoteId && (
          <div className="py-2 mx-6 sm:px-20 mb-2">
            <div className="general space-y-3 w-full">
              <p className="text-4xl font-bold">{translations.about.title}</p>
              <img src="./imgs/icon.png" alt="Beaver Notes Icon" className="w-32 h-32 rounded-full"/>
              <h4 className="mt-4 font-bold"> {translations.about.app}</h4>
              <p>
              {translations.about.description}
              </p>
              <p className="mt-2">
                {translations.about.version} <span className="ml-8">{version}</span>
              </p>

              <p>{translations.about.copyright}</p>

              <div className="mt-4 flex gap-4">
                <a href="https://beavernotes.com" className="flex items-center">
                  <GlobalLineIcon className="w-6 h-6 mr-2" />
                  {translations.about.website}
                </a>

                <a
                  href="https://github.com/Daniele-rolli/Beaver-notes-pocket"
                  className="flex items-center"
                >
                  <GithubFillIcon className="w-6 h-6 mr-2" />
                  {translations.about.github}
                </a>

                <a
                  href="https://www.buymeacoffee.com/beavernotes"
                  className="flex items-center"
                >
                  <CupLineIcon className="w-6 h-6 mr-2" />
                  {translations.about.donate}
                </a>
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

export default About;
