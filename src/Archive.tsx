import React, { useState, useEffect } from "react";
import { Note } from "./store/types";
import { JSONContent } from "@tiptap/react";
import ModularPrompt from "./components/ui/Dialog";
import SearchBar from "./components/Home/Search";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import * as CryptoJS from "crypto-js";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/it";
import { useSwipeable } from "react-swipeable";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { useNavigate } from "react-router-dom";
import {
  loadNotes,
  useDeleteNote,
  useToggleArchive,
} from "./store/notes";
import { useNotesState } from "./store/Activenote";
import Icons from "./lib/remixicon-react";

import dayjs from "dayjs";
import ReactDOM from "react-dom";

const Archive: React.FC = () => {
  const STORAGE_PATH = "notes/data.json";
  const { deleteNote } = useDeleteNote();
  const { toggleArchive } = useToggleArchive();
  const { notesState, setNotesState, activeNoteId, setActiveNoteId } =
    useNotesState();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

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
      // Prompt the user for a password
      const password = await promptForPassword();
      if (!password) {
        // If the user cancels or enters nothing, exit the function
        return;
      }

      // Check if a password is already stored
      let storedPassword: string | null = null;
      try {
        const result = await SecureStoragePlugin.get({ key: noteId });
        storedPassword = result.value;
      } catch (e) {
        // No stored password found, proceed without error
      }

      // If a stored password exists, compare it with the entered password
      if (storedPassword && storedPassword !== password) {
        alert(translations.home.wrongpasswd);
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
          alert(translations.home.wrongpasswd);
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
        updatedNote.content = { type: "doc", content: [encryptedContent] };
        updatedNote.isLocked = true;

        // Store the password securely if it wasn't already stored
        if (!storedPassword) {
          await SecureStoragePlugin.set({ key: noteId, value: password });
        }
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
    } catch (error) {
      alert(translations.home.lockerror);
    }
  };

  // Helper function to prompt the user for a password
  const promptForPassword = async (): Promise<string | null> => {
    // Define a div where the prompt will be rendered
    const promptRoot = document.createElement("div");
    document.body.appendChild(promptRoot);

    return new Promise<string | null>((resolve) => {
      const handleConfirm = (value: string | null) => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        resolve(value);
      };
      const handleCancel = () => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        resolve(null); // Resolving with null for cancel action
      };
      ReactDOM.render(
        <ModularPrompt
          title={translations.home.enterpasswd}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />,
        promptRoot
      );
    });
  };

  const handleToggleUnlock = async (noteId: string) => {
    try {
      // Prompt the user for a password
      const password = await promptForPassword();
      if (!password) {
        // If the user cancels or enters nothing, exit the function
        return;
      }

      // Check if a password is already stored
      let storedPassword: string | null = null;
      try {
        const result = await SecureStoragePlugin.get({ key: noteId });
        storedPassword = result.value;
      } catch (e) {
        // No stored password found, proceed without error
      }

      // If a stored password exists, compare it with the entered password
      if (storedPassword && storedPassword !== password) {
        alert(translations.home.wrongpasswd);
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
          alert(translations.home.wrongpasswd);
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
        updatedNote.content = { type: "doc", content: [encryptedContent] };
        updatedNote.isLocked = true;

        // Store the password securely if it wasn't already stored
        if (!storedPassword) {
          await SecureStoragePlugin.set({ key: noteId, value: password });
        }
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
      setActiveNoteId(noteId);
    } catch (error) {
      alert(translations.home.lockerror);
    }
  };

  const handleClickNote = async (note: Note) => {
    if (note.isLocked) {
      // Handle locked note using handleToggleLock
      handleToggleUnlock(note.id);
    } else {
      // Set active note directly
      setActiveNoteId(note.id);
    }
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
      wrongpasswd: "home.wrongpasswd",
      lockerror: "home.lockerror",
      enterpasswd: "home.enterpasswd",
      unlocktoedit: "home.unlocktoedit",
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

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  // State to manage dark mode
  const [darkMode] = useState(() => {
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

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
  });

  return (
    <div {...handlers}>
      <div className="safe-area"></div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          {!activeNoteId && (
            <div className="w-full md:pt-4 py-2 flex flex-col border-gray-300 overflow-auto">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleLabelFilterChange={handleLabelFilterChange}
                setSortingOption={handleLabelFilterChange}
                uniqueLabels={uniqueLabels}
              />
              <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
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
                      <Icons.ArchiveDrawerLineIcon className="inline-block w-5 h-5" />{" "}
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
                            ? "p-3 h-auto cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] h-48;"
                            : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C]"
                        }
                        onClick={() => handleClickNote(note)}
                      >
                        <div className="h-40 overflow-hidden">
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
                                  <Icons.LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-[color:var(--selected-dark-text)]" />
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
                              className="text-[#52525C] py-2 dark:text-[color:var(--selected-dark-text)] w-auto"
                              onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
                            >
                              {note.isBookmarked ? (
                                <Icons.ArchiveDrawerFillIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <Icons.ArchiveDrawerLineIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 dark:text-[color:var(--selected-dark-text)] w-auto"
                              onClick={(e) => handleToggleLock(note.id, e)}
                            >
                              {note.isLocked ? (
                                <Icons.LockClosedIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <Icons.LockOpenIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 hover:text-red-500 dark:text-[color:var(--selected-dark-text)] w-auto"
                              onClick={(e) => handleDeleteNote(note.id, e)}
                            >
                              <Icons.DeleteBinLineIcon className="w-8 h-8 mr-2" />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
