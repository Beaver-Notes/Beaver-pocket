import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import "./css/NoteEditor.module.css";
import { JSONContent } from "@tiptap/react";
import Sidebar from "./components/Home/Sidebar";
import BottomNavBar from "./components/Home/BottomNavBar";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import "./css/main.css";
import "./css/fonts.css";
import Bookmarked from "./components/Home/Bookmarked";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import JSZip from "jszip";
import { Share } from "@capacitor/share";
import dayjs from "dayjs";
import "dayjs/locale/it";
import relativeTime from "dayjs/plugin/relativeTime";
import SearchBar from "./components/Home/Search";
import * as CryptoJS from "crypto-js";
import CommandPrompt from "./components/Home/CommandPrompt";
import {
  loadNotes,
  useSaveNote,
  useDeleteNote,
  useToggleBookmark,
  useToggleArchive,
} from "./store/notes";
import useNoteEditor from "./store/useNoteActions";
import { useNotesState, useActiveNote } from "./store/Activenote";

// Import Remix icons
import AddFillIcon from "remixicon-react/AddFillIcon";
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import Bookmark3LineIcon from "remixicon-react/Bookmark3LineIcon";
import Bookmark3FillIcon from "remixicon-react/Bookmark3FillIcon";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import ArchiveDrawerFillIcon from "remixicon-react/InboxUnarchiveLineIcon";
import Download2LineIcon from "remixicon-react/Download2LineIcon";
import LockClosedIcon from "remixicon-react/LockLineIcon";
import LockOpenIcon from "remixicon-react/LockUnlockLineIcon";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";

const App: React.FC = () => {
  const { saveNote } = useSaveNote();
  const { deleteNote } = useDeleteNote();
  const { toggleArchive } = useToggleArchive();
  const { toggleBookmark } = useToggleBookmark();

  const handleToggleBookmark = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const updatedNotes = await toggleBookmark(noteId);
      setNotesState(updatedNotes);
    } catch (error) {
      console.error(translations.home.bookmarkError, error);
      alert(translations.home.bookmarkError + (error as any).message);
    }
  };
  const handleToggleArchive = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const updatedNotes = await toggleArchive(noteId);
      setNotesState(updatedNotes);
    } catch (error) {
      console.error(translations.home.archiveError, error);
      alert(translations.home.archiveError + (error as any).message);
    }
  };

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const isConfirmed = window.confirm(translations.home.confirmDelete);

    if (isConfirmed) {
      await deleteNote(noteId);
    }
  };

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

  const STORAGE_PATH = "notes/data.json";
  const { notesState, setNotesState, activeNoteId, setActiveNoteId } =
    useNotesState();
  const activeNote = useActiveNote(activeNoteId, notesState);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

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

      const jsonDataPath = `${exportFolderPath}/data.json`;

      const exportedData: any = {
        data: {
          notes: {},
          lockedNotes: {},
        },
        labels: [],
      };

      // Loop through notes to populate exportedData
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

      // Modify image src based on alt attribute
      Object.values(exportedData.data.notes).forEach((note: any) => {
        if (note.content && note.content.content) {
          note.content.content.forEach((node: any) => {
            if (node.type === "image" && node.attrs && node.attrs.src) {
              const srcParts = node.attrs.src.split("/");
              const fileName = srcParts[srcParts.length - 1]; // Get the last part as the filename
              node.attrs.src = `assets://${note.id}/${fileName}`;
            }
          });
        }
      });

      // Write modified JSON data to data.json
      await Filesystem.writeFile({
        path: jsonDataPath,
        data: JSON.stringify(exportedData, null, 2),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      const zip = new JSZip();
      const exportFolderZip = zip.folder(`Beaver Notes ${formattedDate}`);

      const exportFolderFiles = await Filesystem.readdir({
        path: exportFolderPath,
        directory: Directory.Documents,
      });

      await Promise.all(
        exportFolderFiles.files.map(async (file: any) => {
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
  
          // Write a dummy file to the note-assets folder
          const dummyFileName = "dummy.txt";
          const dummyFilePath = `note-assets/${dummyFileName}`;
          console.log("Writing dummy file:", dummyFilePath); // Debugging
  
          await Filesystem.writeFile({
            path: dummyFilePath,
            data: "dummy file",
            directory: FilesystemDirectory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
  
          // Get the URL of the note-assets folder
          const { uri: noteAssetsUri } = await Filesystem.getUri({
            directory: FilesystemDirectory.Documents,
            path: `note-assets/`,
          });
          console.log("Note assets URI:", noteAssetsUri); // Debugging
  
          // Remove the dummy file
          await Filesystem.deleteFile({
            path: dummyFilePath,
            directory: FilesystemDirectory.Documents,
          });
          console.log("Dummy file removed"); // Debugging
  
          // Modify the src attribute of images in the imported notes
          Object.values(importedNotes).forEach((note) => {
            if (Array.isArray(note.content)) {
              note.content.forEach((contentItem) => {
                if (contentItem.type === 'image' && typeof contentItem.attrs?.src === 'string') {
                  const srcParts = contentItem.attrs.src.split('assets://');
                  if (srcParts.length === 2) {
                    contentItem.attrs.src = `${noteAssetsUri}${srcParts[1]}`;
                  }
                }
              });
            }
          });
          console.log("Modified imported notes:", importedNotes); // Debugging
  
          // Merge the imported notes with existing ones and update state
          const existingNotes = await loadNotes();
          const mergedNotes: Record<string, Note> = {
            ...existingNotes,
            ...importedNotes,
          };
          setNotesState(mergedNotes);
  
          // Filter notes based on search query
          const filtered = Object.values(mergedNotes).filter((note) => {
            const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
            const contentMatch = JSON.stringify(note.content).toLowerCase().includes(searchQuery.toLowerCase());
            return titleMatch || contentMatch;
          });
          setFilteredNotes(Object.fromEntries(filtered.map((note) => [note.id, note])));
  
          // Write merged notes to storage
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
        console.error("Error during import:", error); // Debugging
        alert(translations.home.importError);
      }
    };
  
    reader.readAsText(file);
  };  

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
  const [sortingOption, setSortingOption] = useState("updatedAt");

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA =
          a.createdAt instanceof Date ? a.createdAt : new Date(0);
        const createdAtB =
          b.createdAt instanceof Date ? b.createdAt : new Date(0);
        return createdAtA.getTime() - createdAtB.getTime();
      case "updatedAt":
      default:
        const updatedAtA =
          a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
        const updatedAtB =
          b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
        return updatedAtA.getTime() - updatedAtB.getTime();
    }
  });

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return translations.home.noContent;
    }
    if (
      content.content.length === 1 &&
      content.content[0].type === "paragraph" &&
      (!content.content[0].content || content.content[0].content.length === 0)
    ) {
      return "";
    }

    const paragraphText = content.content
      .filter((node) => node.type === "paragraph")
      .map((node) => {
        if (node.content && Array.isArray(node.content)) {
          const textContent = node.content
            .filter((innerNode) => innerNode.type === "text")
            .map((innerNode) => innerNode.text)
            .join(" ");
          return textContent;
        }
        return "";
      })
      .join(" ");

    return paragraphText || translations.home.noContent;
  }

  function truncateContentPreview(
    content: JSONContent | string | JSONContent[]
  ) {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent);
    } else if (content && content.content) {
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle);
    }

    if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }

  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
  );

  const handleLabelFilterChange = (selectedLabel: string) => {
    setSearchQuery("");
    const filteredNotes = Object.values(notesState).filter((note) => {
      return selectedLabel ? note.labels.includes(selectedLabel) : true;
    });

    setFilteredNotes(
      Object.fromEntries(filteredNotes.map((note) => [note.id, note]))
    );
  };

  const handleToggleLock = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      const biometricResult = await NativeBiometric.isAvailable();

      if (biometricResult.isAvailable) {
        const isFaceID = biometricResult.biometryType === BiometryType.FACE_ID;

        try {
          await NativeBiometric.verifyIdentity({
            reason: translations.home.biometricsReason,
            title: translations.home.biometricsTitle,
            subtitle: translations.home.subtitle,
            description: isFaceID
              ? translations.home.biometricFace
              : translations.home.biometricTouch,
          });
        } catch (verificationError) {
          alert(translations.home.biometricError);
          return;
        }
      } else {
        let sharedKey = localStorage.getItem("sharedKey");

        if (!sharedKey) {
          sharedKey = prompt(translations.home.biometricPassword);

          if (!sharedKey) {
            alert(translations.home.biometricError);
            return;
          }

          sharedKey = CryptoJS.SHA256(sharedKey).toString();
          localStorage.setItem("sharedKey", sharedKey);
        }

        const enteredKey = prompt(translations.home.biometricPassword);

        if (enteredKey === null) {
          alert(translations.home.biometricError);
          return;
        }

        const hashedEnteredKey = CryptoJS.SHA256(enteredKey).toString();

        if (hashedEnteredKey !== sharedKey) {
          alert(translations.home.biometricWrongPassword);
          return;
        }
      }

      updatedNote.isLocked = !updatedNote.isLocked;

      notes[noteId] = updatedNote;

      const lockedNotes = JSON.parse(
        localStorage.getItem("lockedNotes") || "{}"
      );
      if (updatedNote.isLocked) {
        lockedNotes[noteId] = true;
      } else {
        delete lockedNotes[noteId];
      }
      localStorage.setItem("lockedNotes", JSON.stringify(lockedNotes));

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes);

      alert(translations.home.biometricSuccess);
    } catch (error) {
      alert(translations.home.biometricError + (error as any).message);
    }
  };

  const handleClickNote = async (note: Note) => {
    try {
      if (note.isLocked) {
        const biometricResult = await NativeBiometric.isAvailable();

        if (biometricResult.isAvailable) {
          const isFaceID =
            biometricResult.biometryType === BiometryType.FACE_ID;

          try {
            await NativeBiometric.verifyIdentity({
              reason: translations.home.biometricsReason,
              title: translations.home.biometricsTitle,
              subtitle: translations.home.subtitle2,
              description: isFaceID
                ? translations.home.biometricFace
                : translations.home.biometricTouch,
            });
          } catch (verificationError) {
            alert(translations.home.biometricError);
            return;
          }
        } else {
          const userSharedKey = prompt(translations.home.biometricUnlock);

          if (userSharedKey === null) {
            return;
          }

          const hashedUserSharedKey = CryptoJS.SHA256(userSharedKey).toString();

          const storedSharedKey = localStorage.getItem("sharedKey");
          if (hashedUserSharedKey !== storedSharedKey) {
            alert(translations.home.biometricWrongPassword);
            return;
          }
        }
      }

      setActiveNoteId(note.id);
    } catch (error) {}
  };

  dayjs.extend(relativeTime);

  // Translations
  const [translations, setTranslations] = useState({
    home: {
      bookmarked: "home.bookmarked",
      all: "home.all",
      messagePt1: "home.messagePt1",
      messagePt2: "home.messagePt2",
      messagePt3: "home.messagePt3",
      unlocktoedit: "home.unlocktoedit",
      noContent: "home.noContent",
      title: "home.title",
      confirmDelete: "home.confirmDelete",
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importInvalid: "home.importInvalid",
      importError: "home.importError",
      biometricsReason: "home.biometricsReason",
      biometricsTitle: "home.biometricsTitle",
      subtitle: "home.subtitle",
      biometricFace: "home.biometricFace",
      biometricTouch: "home.biometricFinger",
      biometricError: "home.biometricError",
      biometricPassword: "home.biometricPassword",
      biometricWrongPassword: "home.biometricWrongPassword",
      biometricSuccess: "home.biometricSuccess",
      subtitle2: "home.subtitle2",
      biometricUnlock: "home.biometricUnlock",
      bookmarkError: "home.bookmarkError",
      archiveError: "home.archiveError",
      shareTitle: "home.shareTitle",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
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

  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(false);

  useEffect(() => {
    // Listen for key combination
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        setIsCommandPromptOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

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
            <div className="md:mt-4 py-2 w-full flex flex-col border-gray-300 overflow-auto">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleLabelFilterChange={handleLabelFilterChange}
                setSortingOption={setSortingOption}
                uniqueLabels={uniqueLabels}
                exportData={exportData}
                handleImportData={handleImportData}
              />
              <div className="p-2 mb-10 mx-4 cursor-pointer rounded-md items-center justify-center h-full">
                {notesList.filter(
                  (note) => note.isBookmarked && !note.isArchived
                ).length > 0 && (
                  <h2 className="text-3xl font-bold">
                    {translations.home.bookmarked || "-"}
                  </h2>
                )}
                <Bookmarked
                  notesList={notesList}
                  activeNoteId={activeNoteId}
                  handleToggleBookmark={handleToggleBookmark}
                  handleToggleLock={handleToggleLock}
                  handleDeleteNote={handleDeleteNote}
                  handleClickNote={handleClickNote}
                  truncateContentPreview={truncateContentPreview}
                />
                <h2 className="text-3xl font-bold">
                  {translations.home.all || "-"}
                </h2>
                {notesList.length === 0 && (
                  <div className="mx-auto">
                    <img
                      src="./imgs/Beaver.png"
                      className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                      alt="No content"
                    />
                    <p className="py-2 text-lg text-center">
                      {translations.home.messagePt1 || "-"}
                      <AddFillIcon className="inline-block w-5 h-5" />{" "}
                      {translations.home.messagePt2 || "-"}
                      <Download2LineIcon className="inline-block w-5 h-5" />{" "}
                      {translations.home.messagePt3 || "-"}
                    </p>
                  </div>
                )}
                <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
                  {notesList
                    .filter((note) => !note.isBookmarked && !note.isArchived)
                    .map((note) => (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className={
                          note.id === activeNoteId
                            ? "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                            : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                        }
                        onClick={() => handleClickNote(note)}
                      >
                        <div className="h-44 overflow-hidden">
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="text-2xl">{note.title}</div>
                            {note.isLocked ? (
                              <div>
                                <p></p>
                              </div>
                            ) : (
                              <div>
                                {note.labels.length > 0 && (
                                  <div className="flex flex-col gap-1 overflow-hidden">
                                    <div className="flex flex-wrap gap-1">
                                      {note.labels.map((label) => (
                                        <span
                                          key={label}
                                          className="text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
                                        >
                                          #{label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {note.isLocked ? (
                              <div className="flex flex-col items-center">
                                <button className="flex items-center justify-center">
                                  <LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-white" />
                                </button>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {translations.home.unlocktoedit || "-"}
                                </p>
                              </div>
                            ) : (
                              <div className="text-lg">
                                {note.content &&
                                  truncateContentPreview(note.content)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center">
                            <button
                              className="text-[#52525C] py-2 dark:text-white w-auto"
                              onClick={(e) => handleToggleBookmark(note.id, e)}
                            >
                              {note.isBookmarked ? (
                                <Bookmark3FillIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <Bookmark3LineIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 dark:text-white w-auto"
                              onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
                            >
                              {note.isBookmarked ? (
                                <ArchiveDrawerFillIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <ArchiveDrawerLineIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 dark:text-white w-auto"
                              onClick={(e) => handleToggleLock(note.id, e)}
                            >
                              {note.isLocked ? (
                                <LockClosedIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <LockOpenIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 hover:text-red-500 dark:text-white w-auto"
                              onClick={(e) => handleDeleteNote(note.id, e)}
                            >
                              <DeleteBinLineIcon className="w-8 h-8 mr-2" />
                            </button>
                          </div>
                          <div className="text-lg text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap overflow-ellipsis">
                            {dayjs(note.createdAt).fromNow()}
                          </div>
                        </div>
                      </div>
                    ))}
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
        <CommandPrompt
          onCreateNewNote={handleCreateNewNote}
          toggleTheme={() => toggleTheme(!darkMode)}
          setIsCommandPromptOpen={setIsCommandPromptOpen}
          isOpen={isCommandPromptOpen}
          notes={notesList}
          onClickNote={handleClickNote}
        />
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
