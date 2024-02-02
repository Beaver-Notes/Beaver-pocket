import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import { JSONContent } from "@tiptap/react";
import BottomNavBar from "./components/BottomNavBar";
import Sidebar from "./components/Sidebar";
import "./css/main.css";
import "./css/fonts.css";
import SearchBar from "./components/Search";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import JSZip from "jszip";
import { Share } from "@capacitor/share";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import * as CryptoJS from "crypto-js";
import {
  loadNotes,
  useSaveNote,
  useDeleteNote,
  useToggleArchive,
} from "./store/notes";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/it";

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
      console.error("Error handling toggle archive:", error);
      alert("Error toggling archive: " + (error as any).message);
    }
  };

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event propagation
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (isConfirmed) {
      // Correct usage: Call deleteNote with the noteId parameter
      await deleteNote(noteId);
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
          lockedNotes: {}, // Add the lockedNotes field
        },
        labels: [], // Add the labels field
      };

      // Iterate through notes to populate the exportedData object
      Object.values(notesState).forEach((note) => {
        const createdAtTimestamp =
          note.createdAt instanceof Date ? note.createdAt.getTime() : 0;
        const updatedAtTimestamp =
          note.updatedAt instanceof Date ? note.updatedAt.getTime() : 0;

        // Populate notes object
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

        // Populate labels array
        exportedData.labels = exportedData.labels.concat(note.labels);

        // Populate lockedNotes object
        if (note.isLocked) {
          exportedData.data.lockedNotes[note.id] = true;
        }
      });

      // Remove duplicate labels
      exportedData.labels = Array.from(new Set(exportedData.labels));

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
      const imagesFolderPath = `assets`;
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

      // Zip the export folder
      const zip = new JSZip();
      const exportFolderZip = zip.folder(`Beaver Notes ${formattedDate}`);

      // Retrieve files in the export folder
      const exportFolderFiles = await Filesystem.readdir({
        path: exportFolderPath,
        directory: Directory.Documents,
      });

      // Use Promise.all to wait for all asynchronous file reading operations to complete
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

      const zipFilePath = `${parentExportFolderPath}/Beaver_Notes_${formattedDate}.zip`;
      await Filesystem.writeFile({
        path: zipFilePath,
        data: zipContentBase64,
        directory: Directory.Documents,
      });

      await shareZipFile();

      console.log("Export completed successfully!");

      // Notify the user
      window.alert("Export completed successfully! Check your downloads.");
    } catch (error) {
      console.error("Error exporting data and images:", error);
      alert("Error exporting data and images: " + (error as any).message);
    }
  };

  const shareZipFile = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const parentExportFolderPath = `export`;
      await Share.share({
        title: "Share Beaver Notes Export",
        url: `file://${parentExportFolderPath}/Beaver_Notes_${formattedDate}.zip`,
        dialogTitle: "Share Beaver Notes Export",
      });
    } catch (error) {
      console.error("Error sharing zip file:", error);
      alert("Error sharing zip file: " + (error as any).message);
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
      title: translations.archive.title || "New Note",
      content: { type: "doc", content: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      labels: [],
      isBookmarked: false,
      isArchived: true,
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
    event.stopPropagation(); // Stop the click event from propagating

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Check if biometrics is available
      const biometricResult = await NativeBiometric.isAvailable();

      if (biometricResult.isAvailable) {
        const isFaceID = biometricResult.biometryType === BiometryType.FACE_ID;

        // Show biometric prompt for authentication
        try {
          await NativeBiometric.verifyIdentity({
            reason: "For note authentication",
            title: "Authenticate",
            subtitle: "Use biometrics to unlock/lock the note.",
            description: isFaceID
              ? "Place your face for authentication."
              : "Place your finger for authentication.",
          });
        } catch (verificationError) {
          // Handle verification error (e.g., user cancels biometric prompt)
          console.error("Biometric verification error:", verificationError);
          alert(
            "Biometric verification failed. Note remains in its current state."
          );
          return;
        }
      } else {
        // Biometrics not available, use sharedKey
        let sharedKey = localStorage.getItem("sharedKey");

        if (!sharedKey) {
          // If no shared key is set, prompt the user to set it up
          sharedKey = prompt("Set up a password to lock/unlock your notes:");

          if (!sharedKey) {
            // If the user cancels or enters an empty password, do not proceed
            alert(
              "Note remains in its current state. Please set up a password next time."
            );
            return;
          }

          // Save the shared key in local storage after hashing
          sharedKey = CryptoJS.SHA256(sharedKey).toString();
          localStorage.setItem("sharedKey", sharedKey);
        }

        // Prompt for the password
        const enteredKey = prompt(
          "Enter the password to lock/unlock the note:"
        );

        // Check if the user canceled the prompt
        if (enteredKey === null) {
          alert("Password input canceled. Note remains in its current state.");
          return;
        }

        // Hash the entered password for comparison
        const hashedEnteredKey = CryptoJS.SHA256(enteredKey).toString();

        if (hashedEnteredKey !== sharedKey) {
          // Incorrect password, do not proceed
          alert("Incorrect password. Note remains in its current state.");
          return;
        }
      }

      // Toggle the 'isLocked' property
      updatedNote.isLocked = !updatedNote.isLocked;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      // Update the lockedNotes field
      const lockedNotes = JSON.parse(
        localStorage.getItem("lockedNotes") || "{}"
      );
      if (updatedNote.isLocked) {
        lockedNotes[noteId] = true;
      } else {
        delete lockedNotes[noteId];
      }
      localStorage.setItem("lockedNotes", JSON.stringify(lockedNotes));

      // Save the updated notes to the filesystem
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state

      console.log("Note lock status toggled successfully!");
      alert("Note lock status toggled successfully!");
    } catch (error) {
      console.error("Error toggling lock:", error);
      alert("Error toggling lock: " + (error as any).message);
    }
  };

  const handleClickNote = async (note: Note) => {
    try {
      if (note.isLocked) {
        // Check if biometrics is available
        const biometricResult = await NativeBiometric.isAvailable();

        if (biometricResult.isAvailable) {
          const isFaceID =
            biometricResult.biometryType === BiometryType.FACE_ID;

          // Show biometric prompt for authentication
          try {
            await NativeBiometric.verifyIdentity({
              reason: "For note authentication",
              title: "Authenticate",
              subtitle: "Use biometrics to unlock the note.",
              description: isFaceID
                ? "Place your face for authentication."
                : "Place your finger for authentication.",
            });
          } catch (verificationError) {
            // Handle verification error (e.g., user cancels biometric prompt)
            console.error("Biometric verification error:", verificationError);
            alert("Biometric verification failed. Note remains locked.");
            return;
          }
        } else {
          // Biometrics not available, use sharedKey
          const userSharedKey = prompt(
            "Enter the shared key to unlock the note:"
          );

          // Check if the user canceled the prompt
          if (userSharedKey === null) {
            alert("Shared key input canceled. Note remains locked.");
            return;
          }

          // Hash the entered password for comparison
          const hashedUserSharedKey = CryptoJS.SHA256(userSharedKey).toString();

          // Check if the entered key matches the stored key
          const storedSharedKey = localStorage.getItem("sharedKey");
          if (hashedUserSharedKey !== storedSharedKey) {
            alert("Incorrect shared key. Note remains locked.");
            return;
          }
        }
      }

      setActiveNoteId(note.id);
    } catch (error) {
      console.error("Error handling click on note:", error);
      alert("Error handling click on note: " + (error as any).message);
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
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div>
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
              <div className="py-6 p-2 mx-6 cursor-pointer rounded-md items-center justify-center h-full">
                <h2 className="text-3xl font-bold">{translations.archive.archived || "-"}</h2>
                {notesList.filter((note) => note.isArchived).length === 0 && (
                  <div className="mx-auto">
                    <img
                      src="/src/assets/Beaver-classic-mac.png"
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
                <div className="grid py-2 grid-cols-1 sm:grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
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
                        <div className="sm:h-44 h-36 overflow-hidden">
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="text-2xl">{note.title}</div>
                            {note.isLocked ? (
                              <div>
                                <p></p>
                              </div>
                            ) : (
                              <div>
                                {note.labels.length > 0 && (
                                  <div className="flex gap-2">
                                    {note.labels.map((label) => (
                                      <span
                                        key={label}
                                        className="text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
                                      >
                                        #{label}
                                      </span>
                                    ))}
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
                        <button
                          className="text-[#52525C] py-2 dark:text-white w-auto"
                          onClick={(e) => handleToggleArchive(note.id, e)}
                        >
                          {note.isArchived ? (
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
                          className="text-[#52525C] py-2 hover:text-red-500 dark:text-white w-auto w-8 h-8"
                              onClick={(e) => handleDeleteNote(note.id, e)}
                        >
                          <DeleteBinLineIcon className="w-8 h-8 mr-2" />
                        </button>
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
