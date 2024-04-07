import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import { JSONContent } from "@tiptap/react";
import BottomNavBar from "./components/Home/BottomNavBar";
import Sidebar from "./components/Home/Sidebar";
import "./css/main.css";
import "./css/fonts.css";
import SearchBar from "./components/Home/Search";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import * as CryptoJS from "crypto-js";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/it";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import {
  loadNotes,
  useSaveNote,
  useDeleteNote,
  useToggleArchive,
} from "./store/notes";
import useNoteEditor from "./store/useNoteActions";

// Import Remix icons
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import ArchiveDrawerFillIcon from "remixicon-react/InboxUnarchiveLineIcon";
import LockClosedIcon from "remixicon-react/LockLineIcon";
import LockOpenIcon from "remixicon-react/LockUnlockLineIcon";
import dayjs from "dayjs";

const Archive: React.FC = () => {
  const { saveNote } = useSaveNote();
  const { deleteNote } = useDeleteNote();
  const { toggleArchive } = useToggleArchive();

  const handleToggleArchive = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event propagation

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
      try {
        await deleteNote(noteId);
        // Remove the deleted note from filteredNotes state
        setFilteredNotes((prevFilteredNotes) => {
          const updatedFilteredNotes = { ...prevFilteredNotes };
          delete updatedFilteredNotes[noteId];
          return updatedFilteredNotes;
        });
      } catch (error) {
        alert(error);
      }
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

  const handleCloseEditor = () => {
    setActiveNoteId(null);
  };

  const STORAGE_PATH = "notes/data.json";

  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
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

      // Copy note-assets folder
      await Filesystem.copy({
        from: "note-assets",
        to: `${exportFolderPath}/assets`,
        directory: Directory.Data,
      });

      // Copy file-assets folder
      await Filesystem.copy({
        from: "file-assets",
        to: `${exportFolderPath}/file-assets`,
        directory: Directory.Data,
      });

      const exportedData: any = {
        data: {
          notes: {},
          lockStatus: {},
          isLocked: {},
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
              exportedData.data.lockStatus[note.id] = "locked";
              exportedData.data.isLocked[note.id] = true;
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
      const importAssetsPath = `${importFolderPath}/note-assets`;

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
      title: translations.archive.title || "New Note",
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

  const [isArchiveVisible, setIsArchiveVisible] = useState(false);
  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");

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

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return translations.archive.noContent;
    }

    // Check if the content consists of a single empty paragraph
    if (
      content.content.length === 1 &&
      content.content[0].type === "paragraph" &&
      (!content.content[0].content || content.content[0].content.length === 0)
    ) {
      return ""; // Return an empty string for a single empty paragraph
    }

    const paragraphText = content.content
      .filter((node) => node.type === "paragraph") // Filter paragraph nodes
      .map((node) => {
        if (node.content && Array.isArray(node.content)) {
          const textContent = node.content
            .filter((innerNode) => innerNode.type === "text") // Filter text nodes within paragraphs
            .map((innerNode) => innerNode.text) // Get the text from text nodes
            .join(" "); // Join text from text nodes within the paragraph
          return textContent;
        }
        return ""; // Return an empty string for nodes without content
      })
      .join(" "); // Join paragraph text with spaces

    return paragraphText || "No content"; // If no paragraph text, return "No content"
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

    if (text.trim() === "") {
      return "No content"; // Show a placeholder for No content
    } else if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
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

          // Use the previously entered encryption key
          const sharedKey = localStorage.getItem("sharedKey");

          if (!sharedKey) {
            alert(translations.home.biometricError);
            return;
          }

          // Encrypt the content using the shared key
          const encryptedContent = CryptoJS.AES.encrypt(
            JSON.stringify(updatedNote.content),
            CryptoJS.enc.Utf8.parse(sharedKey),
            {
              mode: CryptoJS.mode.ECB,
              padding: CryptoJS.pad.Pkcs7,
            }
          ).toString();
          updatedNote.content = encryptedContent;
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

        // Encrypt the content using the entered key
        const encryptedContent = CryptoJS.AES.encrypt(
          JSON.stringify(updatedNote.content),
          CryptoJS.enc.Utf8.parse(sharedKey),
          {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
          }
        ).toString();
        updatedNote.content = encryptedContent;
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
        directory: Directory.Data,
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
    archive: {
      archived: "archive.archived",
      messagePt1: "archive.messagePt1",
      messagePt2: "archive.messagePt2",
      unlocktoeditor: "archive.unlocktoeditor",
      noContent: "archive.noContent",
      title: "archive.title",
    },
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareError: "home.shareError",
      archiveError: "home.archiveError",
      confirmDelete: "home.confirmDelete",
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
      biometricUnlock: "home.biometricUnlock",
      subtitle2: "home.subtitle2",
      shareTitle: "home.shareTitle",
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
            <div className="w-full md:pt-4 py-2 flex flex-col border-gray-300 overflow-auto">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleLabelFilterChange={handleLabelFilterChange}
                setSortingOption={handleLabelFilterChange}
                uniqueLabels={uniqueLabels}
                exportData={exportData}
                handleImportData={handleImportData}
              />
              <div className="py-6 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
                <h2 className="text-3xl font-bold">
                  {translations.archive.archived || "-"}
                </h2>
                {notesList.filter((note) => note.isArchived).length === 0 && (
                  <div className="mx-auto">
                    <img
                      src="./imgs/Beaver-classic-mac.png"
                      className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                      alt="No content"
                    />
                    <p className="py-2 text-lg text-center">
                      {translations.archive.messagePt1 || "-"}
                      <ArchiveDrawerLineIcon className="inline-block w-5 h-5" />{" "}
                      {translations.archive.messagePt2 || "-"}
                    </p>
                  </div>
                )}
                <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
                  {notesList
                    .filter((note) => note.isArchived)
                    .map((note) => (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className={
                          note.id === activeNoteId
                            ? "p-3 h-auto cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C] h-48;"
                            : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                        }
                        onClick={() => handleClickNote(note)}
                      >
                        <div className="h-44 overflow-hidden">
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="text-xl font-bold">
                              {note.title}
                            </div>
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
                                  {translations.archive.unlocktoeditor || "-"}
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
  );
};

export default Archive;
