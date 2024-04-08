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
} from "@capacitor/filesystem";
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
import { useExportData } from "./utils/exportUtils";
import { useHandleImportData } from "./utils/importUtils";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";

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

const App: React.FC = () => {
  const { saveNote } = useSaveNote();
  const { deleteNote } = useDeleteNote();
  const { toggleArchive } = useToggleArchive();
  const { toggleBookmark } = useToggleBookmark();
  const { exportUtils } = useExportData();
  const { importUtils } = useHandleImportData();
  
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

    const exportData = () => {
      exportUtils(notesState); // Pass notesState as an argument
    };

    const handleImportData = () => {
      importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes); // Pass notesState as an argument
    };

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

  const [isArchiveVisible, setIsArchiveVisible] = useState(false);
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

  // catching note-link's emits

  document.addEventListener("lognoteid", (event: Event) => {
    const customEvent = event as CustomEvent;
    const noteId = customEvent.detail.noteId;
    setActiveNoteId(noteId);
  });

  // catching file-embed's emits

  document.addEventListener("fileEmbedClick", async (event: Event) => {
    const customEvent = event as CustomEvent;
    const eventData = customEvent.detail;
    const { src, fileName } = eventData;

    try {
      const result = await Filesystem.getUri({
        directory: Directory.Data,
        path: src, // Assuming src contains the full path relative to the file-assets directory
      });

      const resolvedFilePath = result.uri;

      const encodedFilePath = resolvedFilePath.replace(/ /g, "%20");

      await Share.share({
        title: `Open ${fileName}`, // Title for the sharing dialog
        url: encodedFilePath, // URL to be shared
        dialogTitle: `Share ${fileName}`, // Title for the sharing dialog
      });
    } catch (error) {
      console.log(`Error sharing ${fileName}: ${(error as any).message}`);
    }
  });
  

  const handleToggleLock = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
  
    try {
      // Prompt the user for the password
      const password = prompt("Please enter the password:");
  
      if (!password) {
        // If the user cancels or enters nothing, exit the function
        return;
      }
  
      // Load the notes from storage
      const result = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
  
      let notes;
      if (typeof result.data === "string") {
        notes = JSON.parse(result.data).data.notes;
      } else {
        const dataText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(result.data as Blob);
        });
        notes = JSON.parse(dataText).data.notes;
      }
  
      const updatedNote = { ...notes[noteId] };
  
      // Check if the note is locked
      if (updatedNote.isLocked) {
        // Note is locked, try to decrypt it
        const decryptedContent = CryptoJS.AES.decrypt(
          updatedNote.content.content[0],
          password
        ).toString(CryptoJS.enc.Utf8);
  
        if (!decryptedContent) {
          // If decryption fails (wrong password), show error message and exit
          alert("Incorrect password. Note remains locked.");
          return;
        }
  
        // Update note content with decrypted content and unlock the note
        updatedNote.content = JSON.parse(decryptedContent);
        updatedNote.isLocked = false;
      } else {
        // Note is unlocked, encrypt the content
        const encryptedContent = CryptoJS.AES.encrypt(
          JSON.stringify(updatedNote.content),
          password
        ).toString();
  
        // Update note content with encrypted content and lock the note
        updatedNote.content = { type: 'doc', content: [encryptedContent] };
        updatedNote.isLocked = true;
      }
  
      // Update the notes array with the updated note
      notes[noteId] = updatedNote;
  
      // Save the updated notes array to storage
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
  
      // Update the state with the updated notes array
      setNotesState(notes);
  
      // Show a success message to the user
      alert("Note lock status updated successfully.");
    } catch (error) {
      // Show an error message if something goes wrong
      console.error("Error toggling lock status:", error);
      alert("An error occurred while toggling lock status.");
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

export default App;
