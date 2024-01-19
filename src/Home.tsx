import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./NoteEditor";
import "./css/NoteEditor.module.css";
import { JSONContent } from "@tiptap/react";
import Sidebar from "./components/Sidebar";
import BottomNavBar from "./components/BottomNavBar";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import "./css/main.css";
import "./css/fonts.css";
import Bookmarked from "./components/Bookmarked";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import JSZip from "jszip";
import { Share } from "@capacitor/share";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import SearchBar from "./components/Search";
import * as CryptoJS from "crypto-js";

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

const App: React.FC = () => {
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

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event propagation
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (isConfirmed) {
      try {
        const notes = await loadNotes();

        if (notes[noteId]) {
          delete notes[noteId];

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data: { notes } }),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });

          setNotesState(notes);
          location.reload();
        } else {
          console.log(`Note with id ${noteId} not found.`);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
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

  const handleToggleBookmark = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event propagation

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isBookmarked' property
      updatedNote.isBookmarked = !updatedNote.isBookmarked;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert("Error toggling bookmark: " + (error as any).message);
    }
  };

  const handleToggleArchive = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event propagation

    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isArchived' property
      updatedNote.isArchived = !updatedNote.isArchived;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      setNotesState(notes); // Update the state
    } catch (error) {
      console.error("Error toggling archive:", error);
      alert("Error toggling archive: " + (error as any).message);
    }
  };

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

      const zipFilePath = `/Beaver_Notes_${formattedDate}.zip`;
      await Filesystem.writeFile({
        path: zipFilePath,
        data: zipContentBase64,
        directory: Directory.Cache,
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
      const zipFilePath = `file:///Cache/Beaver_Notes_${formattedDate}.zip`;

      console.log("Sharing zip file from path:", zipFilePath);

      const result = await Filesystem.getUri({
        directory: Directory.Cache,
        path: "Beaver_Notes_2024-01-10.zip",
      });

      const resolvedFilePath = result.uri;

      await Share.share({
        title: "Share Beaver Notes Export",
        text: "Check out my Beaver Notes export!",
        url: resolvedFilePath,
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
      return "No content...";
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
        const enteredKey = prompt("Enter the password to lock/unlock the note:");
      
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
              <div className="p-2 mx-6 cursor-pointer rounded-md items-center justify-center h-full">
                {notesList.filter(
                  (note) => note.isBookmarked && !note.isArchived
                ).length > 0 && (
                  <h2 className="text-3xl font-bold">Bookmarked</h2>
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
                <h2 className="text-3xl font-bold">All Notes</h2>
                {notesList.length === 0 && (
                  <div className="mx-auto">
                    <svg
                      className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                      viewBox="0 0 295 301"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M229.148 21C229.161 21 229.172 21.0098 229.173 21.0227C229.389 23.0223 230.978 24.6105 232.977 24.8267C232.99 24.8281 233 24.8389 233 24.8519C233 24.8648 232.99 24.8756 232.977 24.877C230.873 25.1044 229.225 26.851 229.151 28.9975C229.151 28.9989 229.15 29 229.148 29C229.147 29 229.146 28.9989 229.146 28.9975C229.068 26.7445 227.256 24.9321 225.003 24.8544C225.001 24.8544 225 24.8533 225 24.8519C225 24.8505 225.001 24.8493 225.003 24.8493C227.149 24.7753 228.896 23.1267 229.123 21.0227C229.124 21.0098 229.135 21 229.148 21Z"
                        fill="#E3E3E3"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M207.074 0C207.124 0 207.166 0.0381398 207.171 0.0878592C208.009 7.83642 214.164 13.9909 221.912 14.8287C221.962 14.834 222 14.8759 222 14.9259C222 14.9759 221.962 15.0178 221.912 15.0232C213.759 15.9047 207.371 22.6726 207.084 30.9902C207.084 30.9956 207.079 31 207.074 31C207.069 31 207.064 30.9956 207.064 30.9902C206.763 22.2599 199.74 15.2369 191.01 14.936C191.004 14.9358 191 14.9313 191 14.9259C191 14.9205 191.004 14.9161 191.01 14.9159C199.327 14.6292 206.095 8.24098 206.977 0.0878763C206.982 0.0381569 207.024 0 207.074 0Z"
                        fill="#E3E3E3"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M291.148 202C291.161 202 291.172 202.01 291.173 202.023C291.389 204.022 292.978 205.611 294.977 205.827C294.99 205.828 295 205.839 295 205.852C295 205.865 294.99 205.876 294.977 205.877C292.873 206.104 291.225 207.851 291.151 209.997C291.151 209.999 291.15 210 291.148 210C291.147 210 291.146 209.999 291.146 209.997C291.068 207.744 289.256 205.932 287.003 205.854C287.001 205.854 287 205.853 287 205.852C287 205.85 287.001 205.849 287.003 205.849C289.149 205.775 290.896 204.127 291.123 202.023C291.124 202.01 291.135 202 291.148 202Z"
                        fill="#E3E3E3"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M267.074 182C267.124 182 267.166 182.038 267.171 182.088C268.009 189.836 274.164 195.991 281.912 196.829C281.962 196.834 282 196.876 282 196.926C282 196.976 281.962 197.018 281.912 197.023C273.759 197.905 267.371 204.673 267.084 212.99C267.084 212.996 267.079 213 267.074 213C267.069 213 267.064 212.996 267.064 212.99C266.763 204.26 259.74 197.237 251.01 196.936C251.004 196.936 251 196.931 251 196.926C251 196.921 251.004 196.916 251.01 196.916C259.327 196.629 266.095 190.241 266.977 182.088C266.982 182.038 267.024 182 267.074 182Z"
                        fill="#E3E3E3"
                      />
                      <path
                        d="M153 238H196V279.5C196 291.374 186.374 301 174.5 301C162.626 301 153 291.374 153 279.5V238Z"
                        fill="#E07C2F"
                      />
                      <path
                        d="M113 238H156V279.5C156 291.374 146.374 301 134.5 301C122.626 301 113 291.374 113 279.5V238Z"
                        fill="#EFA432"
                      />
                      <path
                        d="M237.853 197.503L213 162.412L246.866 138.426C256.556 131.563 269.975 133.855 276.838 143.545C283.701 153.235 281.409 166.654 271.719 173.517L237.853 197.503Z"
                        fill="#E37C2D"
                      />
                      <path
                        d="M201.017 40.4287C209.706 29.6985 225.448 28.0439 236.178 36.733C246.908 45.4221 248.563 61.1645 239.874 71.8947L239.357 72.5328C235.767 76.9658 229.264 77.6494 224.831 74.0596L202.027 55.5933C197.594 52.0035 196.91 45.4998 200.5 41.0667L201.017 40.4287Z"
                        fill="#B36028"
                      />
                      <path
                        d="M9.9529 176.835C-4.38048 159.753 -2.15242 134.286 14.9294 119.953C32.0113 105.619 57.4784 107.848 71.8118 124.929L124.828 188.112L62.9692 240.018L9.9529 176.835Z"
                        fill="#B55E28"
                      />
                      <path
                        d="M56 117.5C56 65.3091 98.3091 23 150.5 23C202.691 23 245 65.3091 245 117.5V199C245 237.66 213.66 269 175 269H56V117.5Z"
                        fill="#EFA432"
                      />
                      <path
                        d="M55.9803 227.013L98.9803 226.987L99.0063 268.487C99.0137 280.361 89.3938 289.993 77.5197 290C65.6456 290.007 56.0137 280.388 56.0063 268.513L55.9803 227.013Z"
                        fill="#EFA431"
                      />
                      <path
                        d="M62.7263 71.9254C54.0372 61.1952 55.6918 45.4528 66.4219 36.7637C77.1521 28.0746 92.8945 29.7292 101.584 40.4593L102.1 41.0974C105.69 45.5304 105.007 52.0342 100.574 55.624L77.7696 74.0902C73.3366 77.68 66.8328 76.9965 63.243 72.5634L62.7263 71.9254Z"
                        fill="#B36028"
                      />
                      <rect
                        x="121"
                        y="172"
                        width="107"
                        height="83"
                        rx="41.5"
                        fill="#FAE3B7"
                      />
                      <rect
                        x="173"
                        y="236.761"
                        width="16.6588"
                        height="2.37983"
                        transform="rotate(-50 173 236.761)"
                        fill="#EFA432"
                      />
                      <rect
                        x="174.823"
                        y="224"
                        width="16.6588"
                        height="2.37983"
                        transform="rotate(50 174.823 224)"
                        fill="#EFA432"
                      />
                      <rect
                        x="119"
                        y="83"
                        width="15"
                        height="10"
                        rx="5"
                        fill="#B75C25"
                      />
                      <rect
                        x="183"
                        y="83"
                        width="15"
                        height="10"
                        rx="5"
                        fill="#B75C25"
                      />
                      <ellipse
                        cx="127"
                        cy="109"
                        rx="8"
                        ry="11"
                        fill="#562001"
                      />
                      <ellipse
                        cx="191"
                        cy="109"
                        rx="8"
                        ry="11"
                        fill="#562001"
                      />
                      <path
                        d="M155 142H166V149.5C166 152.538 163.538 155 160.5 155C157.462 155 155 152.538 155 149.5V142Z"
                        fill="#FBFCFF"
                      />
                      <path
                        d="M166 142H177V149.5C177 152.538 174.538 155 171.5 155C168.462 155 166 152.538 166 149.5V142Z"
                        fill="#FBFCFF"
                      />
                      <rect
                        x="135"
                        y="126"
                        width="62"
                        height="20"
                        rx="10"
                        fill="#FAE5B8"
                      />
                      <path
                        d="M157 127.333C157 124.94 158.94 123 161.333 123H170.667C173.06 123 175 124.94 175 127.333C175 132.12 171.12 136 166.333 136H165.667C160.88 136 157 132.12 157 127.333Z"
                        fill="#B45F28"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M21.1481 71C21.161 71 21.1719 71.0098 21.1732 71.0227C21.3895 73.0223 22.9777 74.6105 24.9773 74.8267C24.9902 74.8281 25 74.8389 25 74.8519C25 74.8648 24.9902 74.8756 24.9773 74.877C22.8733 75.1044 21.2247 76.851 21.1507 78.9975C21.1507 78.9989 21.1495 79 21.1481 79C21.1467 79 21.1456 78.9989 21.1455 78.9975C21.0679 76.7445 19.2555 74.9321 17.0025 74.8544C17.0011 74.8544 17 74.8533 17 74.8519C17 74.8505 17.0011 74.8493 17.0025 74.8493C19.149 74.7753 20.8955 73.1267 21.123 71.0227C21.1244 71.0098 21.1352 71 21.1481 71Z"
                        fill="#E3E3E3"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M39.074 75C39.124 75 39.166 75.0381 39.1713 75.0879C40.0091 82.8364 46.1636 88.9909 53.9122 89.8287C53.9619 89.834 54 89.8759 54 89.9259C54 89.9759 53.9619 90.0178 53.9121 90.0232C45.759 90.9047 39.3708 97.6726 39.0841 105.99C39.0839 105.996 39.0795 106 39.074 106C39.0686 106 39.0642 105.996 39.064 105.99C38.7631 97.2599 31.7401 90.2369 23.0098 89.936C23.0043 89.9358 23 89.9313 23 89.9259C23 89.9205 23.0043 89.9161 23.0098 89.9159C31.3273 89.6292 38.0952 83.241 38.9767 75.0879C38.9821 75.0382 39.024 75 39.074 75Z"
                        fill="#E3E3E3"
                      />
                    </svg>
                    <p className="py-2 text-lg text-center">
                      No notes available. Click{" "}
                      <AddFillIcon className="inline-block w-5 h-5" /> to add a
                      new note or click{" "}
                      <Download2LineIcon className="inline-block w-5 h-5" /> to
                      import your data.
                    </p>
                  </div>
                )}
                <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-4 gap-4 cursor-pointer rounded-md items-center justify-center">
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
                                  Unlock to edit
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
