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

// Import Remix icons
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import ArchiveDrawerFillIcon from "remixicon-react/InboxUnarchiveLineIcon";
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

const Archive: React.FC = () => {
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

  const handleDeleteNote = async (noteId: string) => {
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
          window.location.reload();
        } else {
          console.log(`Note with id ${noteId} not found.`);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
      }
    }
  };

  const handleCloseEditor = () => {
    setActiveNoteId(null);
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
        text: "Check out my Beaver Notes export!",
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
      title: "New Note",
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

      // Check if a password is set
      let sharedKey = localStorage.getItem("sharedKey");

      if (!sharedKey) {
        // If no shared key is set, prompt the user to set it up
        sharedKey = prompt("Set up a password to lock your notes:");

        if (!sharedKey) {
          // If the user cancels or enters an empty password, do not proceed
          alert("Note remains unlocked. Please set up a password next time.");
          return;
        }

        // Save the shared key in local storage
        localStorage.setItem("sharedKey", sharedKey);
      }

      if (updatedNote.isLocked) {
        // If the note is locked, prompt for the password
        const enteredKey = prompt("Enter the password to unlock the note:");

        if (enteredKey !== sharedKey) {
          // Incorrect password, do not unlock the note
          alert("Incorrect password. Note remains locked.");
          return;
        }

        // Remove the note from the lockedNotes field
        const lockedNotes = JSON.parse(
          localStorage.getItem("lockedNotes") || "{}"
        );
        delete lockedNotes[noteId];
        localStorage.setItem("lockedNotes", JSON.stringify(lockedNotes));
      } else {
        // Add the note to the lockedNotes field
        const lockedNotes = JSON.parse(
          localStorage.getItem("lockedNotes") || "{}"
        );
        lockedNotes[noteId] = true;
        localStorage.setItem("lockedNotes", JSON.stringify(lockedNotes));
      }

      // Toggle the 'isLocked' property
      updatedNote.isLocked = !updatedNote.isLocked;

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
      console.error("Error toggling lock:", error);
      alert("Error toggling lock: " + (error as any).message);
    }
  };

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
                <h2 className="text-3xl font-bold">Archived</h2>
                {notesList.filter((note) => note.isArchived).length === 0 && (
                  <div className="mx-auto">
                    <svg
                      className="max-w-auto w-2/3 sm:w-1/3 mx-auto flex justify-center items-center"
                      viewBox="0 0 403 557"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_i_0_1)">
                        <path
                          d="M15.0576 502.269H387.058V524.269C387.058 539.354 387.058 546.896 382.371 551.582C377.685 556.269 370.143 556.269 355.058 556.269H47.0576C31.9727 556.269 24.4302 556.269 19.7439 551.582C15.0576 546.896 15.0576 539.354 15.0576 524.269V502.269Z"
                          fill="url(#paint0_linear_0_1)"
                        />
                      </g>
                      <rect
                        width="402.115"
                        height="508.396"
                        rx="20"
                        fill="url(#paint1_linear_0_1)"
                      />
                      <g filter="url(#filter1_f_0_1)">
                        <rect
                          x="15.3396"
                          y="28.4877"
                          width="371.436"
                          height="451.421"
                          rx="20"
                          fill="url(#paint2_linear_0_1)"
                        />
                        <rect
                          x="16.4353"
                          y="29.5834"
                          width="369.245"
                          height="449.23"
                          rx="18.9043"
                          stroke="url(#paint3_linear_0_1)"
                          stroke-width="2.19136"
                        />
                      </g>
                      <g filter="url(#filter2_f_0_1)">
                        <rect
                          x="36.1575"
                          y="49.3057"
                          width="329.8"
                          height="255.294"
                          rx="18"
                          fill="url(#paint4_linear_0_1)"
                        />
                        <rect
                          x="36.1575"
                          y="49.3057"
                          width="329.8"
                          height="255.294"
                          rx="18"
                          fill="url(#paint5_linear_0_1)"
                          fill-opacity="0.3"
                        />
                        <rect
                          x="36.1575"
                          y="49.3057"
                          width="329.8"
                          height="255.294"
                          rx="18"
                          fill="url(#paint6_linear_0_1)"
                          fill-opacity="0.4"
                        />
                        <rect
                          x="37.2532"
                          y="50.4013"
                          width="327.609"
                          height="253.103"
                          rx="16.9043"
                          stroke="url(#paint7_linear_0_1)"
                          stroke-width="2.19136"
                        />
                      </g>
                      <g filter="url(#filter3_i_0_1)">
                        <mask
                          id="mask0_0_1"
                          maskUnits="userSpaceOnUse"
                          x="49"
                          y="59"
                          width="304"
                          height="233"
                          style={
                            {
                              maskType: "alpha",
                            } as React.SVGProps<SVGMaskElement>["style"]
                          }
                        >
                          <path
                            d="M52.8001 93.6309C53.8682 82.4829 54.4023 76.9089 59.2694 71.9024C64.1364 66.8959 69.5164 66.2267 80.2764 64.8881C101.97 62.1894 139.915 59.1669 201.058 59.1669C265.354 59.1669 302.822 62.1417 323.538 64.824C333.165 66.0704 337.979 66.6937 342.81 71.6737C347.641 76.6537 348.146 81.7674 349.156 91.9948C350.909 109.754 352.81 137.682 352.81 175.317C352.81 212.953 350.909 240.881 349.156 258.64C348.146 268.868 347.641 273.981 342.81 278.961C337.979 283.941 333.165 284.565 323.538 285.811C302.822 288.493 265.354 291.468 201.058 291.468C139.915 291.468 101.97 288.446 80.2764 285.747C69.5164 284.408 64.1364 283.739 59.2694 278.733C54.4023 273.726 53.8682 268.152 52.8001 257.004C51.0928 239.186 49.3057 211.817 49.3057 175.317C49.3057 138.818 51.0928 111.449 52.8001 93.6309Z"
                            fill="url(#paint8_linear_0_1)"
                          />
                        </mask>
                        <g mask="url(#mask0_0_1)">
                          <path
                            d="M52.8001 93.6309C53.8682 82.4829 54.4023 76.9089 59.2694 71.9024C64.1364 66.8959 69.5164 66.2267 80.2764 64.8881C101.97 62.1894 139.915 59.1669 201.058 59.1669C265.354 59.1669 302.822 62.1417 323.538 64.824C333.165 66.0704 337.979 66.6937 342.81 71.6737C347.641 76.6537 348.146 81.7674 349.156 91.9948C350.909 109.754 352.81 137.682 352.81 175.318C352.81 212.953 350.909 240.881 349.156 258.64C348.146 268.868 347.641 273.981 342.81 278.961C337.979 283.941 333.165 284.565 323.538 285.811C302.822 288.493 265.354 291.468 201.058 291.468C139.915 291.468 101.97 288.446 80.2764 285.747C69.5164 284.408 64.1364 283.739 59.2694 278.733C54.4023 273.726 53.8682 268.152 52.8001 257.004C51.0928 239.186 49.3057 211.817 49.3057 175.318C49.3057 138.818 51.0928 111.449 52.8001 93.6309Z"
                            fill="url(#paint9_linear_0_1)"
                          />
                        </g>
                      </g>
                      <g filter="url(#filter4_i_0_1)">
                        <rect
                          x="50.4014"
                          y="392.254"
                          width="52.5927"
                          height="52.5927"
                          rx="7.01236"
                          fill="url(#paint10_linear_0_1)"
                        />
                      </g>
                      <path
                        d="M78 430.963H85V436.463C85 438.396 83.433 439.963 81.5 439.963C79.567 439.963 78 438.396 78 436.463V430.963Z"
                        fill="#E07C2F"
                      />
                      <path
                        d="M73 430.963H80V436.463C80 438.396 78.433 439.963 76.5 439.963C74.567 439.963 73 438.396 73 436.463V430.963Z"
                        fill="#EFA432"
                      />
                      <path
                        d="M91.916 423.753L88.0082 418.236L93.3333 414.464C94.857 413.385 96.967 413.745 98.0461 415.269C99.1252 416.793 98.7648 418.903 97.2412 419.982L91.916 423.753Z"
                        fill="#E37C2D"
                      />
                      <path
                        d="M86.1239 399.055C87.4902 397.368 89.9655 397.108 91.6528 398.474C93.34 399.84 93.6001 402.315 92.2339 404.003L92.1526 404.103C91.5881 404.8 90.5655 404.908 89.8684 404.343L86.2827 401.439C85.5857 400.875 85.4782 399.852 86.0427 399.155L86.1239 399.055Z"
                        fill="#B36028"
                      />
                      <path
                        d="M56.0809 420.504C53.8271 417.818 54.1774 413.813 56.8634 411.559C59.5493 409.306 63.5538 409.656 65.8076 412.342L74.1439 422.277L64.4172 430.439L56.0809 420.504Z"
                        fill="#B55E28"
                      />
                      <path
                        d="M63 411.963C63 403.679 69.7157 396.963 78 396.963C86.2843 396.963 93 403.679 93 411.963V419.316C93 427.958 85.9946 434.963 77.3529 434.963H63V411.963Z"
                        fill="#EFA432"
                      />
                      <path
                        d="M63 428.004L69.7613 428L69.7654 434.525C69.7666 436.393 68.254 437.907 66.3869 437.908C64.5198 437.909 63.0052 436.397 63.0041 434.53L63 428.004Z"
                        fill="#EFA431"
                      />
                      <path
                        d="M64.379 404.008C63.0127 402.32 63.2729 399.845 64.9601 398.479C66.6473 397.112 69.1227 397.373 70.489 399.06L70.5702 399.16C71.1347 399.857 71.0272 400.88 70.3301 401.444L66.7444 404.348C66.0474 404.912 65.0247 404.805 64.4603 404.108L64.379 404.008Z"
                        fill="#B36028"
                      />
                      <rect
                        x="73"
                        y="418"
                        width="16"
                        height="14"
                        rx="7"
                        fill="#FAE3B7"
                      />
                      <rect
                        x="81.0001"
                        y="430.007"
                        width="2.61944"
                        height="0.374206"
                        transform="rotate(-50 81.0001 430.007)"
                        fill="#EFA432"
                      />
                      <rect
                        x="81.2866"
                        y="428"
                        width="2.61944"
                        height="0.374206"
                        transform="rotate(50 81.2866 428)"
                        fill="#EFA432"
                      />
                      <rect
                        x="73"
                        y="404.963"
                        width="3"
                        height="2"
                        rx="1"
                        fill="#B75C25"
                      />
                      <rect
                        x="83"
                        y="404.963"
                        width="3"
                        height="2"
                        rx="1"
                        fill="#B75C25"
                      />
                      <ellipse
                        cx="74.5"
                        cy="409.963"
                        rx="1.5"
                        ry="2"
                        fill="#562001"
                      />
                      <ellipse
                        cx="84.5"
                        cy="409.963"
                        rx="1.5"
                        ry="2"
                        fill="#562001"
                      />
                      <path
                        d="M79 415H81V416C81 416.552 80.5523 417 80 417C79.4477 417 79 416.552 79 416V415Z"
                        fill="#FBFCFF"
                      />
                      <path
                        d="M81 415H83V416C83 416.552 82.5523 417 82 417C81.4477 417 81 416.552 81 416V415Z"
                        fill="#FBFCFF"
                      />
                      <rect
                        x="76"
                        y="413"
                        width="10"
                        height="3"
                        rx="1.5"
                        fill="#FAE5B8"
                      />
                      <path
                        d="M79 412.63C79 412.261 79.2985 411.963 79.6667 411.963H81.3333C81.7015 411.963 82 412.261 82 412.63C82 413.366 81.403 413.963 80.6667 413.963H80.3333C79.597 413.963 79 413.366 79 412.63Z"
                        fill="#B45F28"
                      />
                      <mask
                        id="path-29-outside-1_0_1"
                        maskUnits="userSpaceOnUse"
                        x="151.587"
                        y="370.723"
                        width="198"
                        height="36"
                        fill="black"
                      >
                        <rect
                          fill="white"
                          x="151.587"
                          y="370.723"
                          width="198"
                          height="36"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M292.631 395.541H161.065C158.04 395.541 155.587 393.088 155.587 390.063C155.587 387.037 158.04 384.584 161.065 384.584H292.561C292.62 380.509 292.923 378.199 294.473 376.649C296.398 374.723 299.497 374.723 305.695 374.723H333.087C339.285 374.723 342.384 374.723 344.31 376.649C346.235 378.574 346.235 381.673 346.235 387.871V390.063C346.235 396.261 346.235 399.36 344.31 401.285C342.384 403.211 339.285 403.211 333.087 403.211H305.695C299.497 403.211 296.398 403.211 294.473 401.285C293.225 400.038 292.786 398.298 292.631 395.541Z"
                        />
                      </mask>
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M292.631 395.541H161.065C158.04 395.541 155.587 393.088 155.587 390.063C155.587 387.037 158.04 384.584 161.065 384.584H292.561C292.62 380.509 292.923 378.199 294.473 376.649C296.398 374.723 299.497 374.723 305.695 374.723H333.087C339.285 374.723 342.384 374.723 344.31 376.649C346.235 378.574 346.235 381.673 346.235 387.871V390.063C346.235 396.261 346.235 399.36 344.31 401.285C342.384 403.211 339.285 403.211 333.087 403.211H305.695C299.497 403.211 296.398 403.211 294.473 401.285C293.225 400.038 292.786 398.298 292.631 395.541Z"
                        fill="url(#paint11_linear_0_1)"
                      />
                      <path
                        d="M292.631 395.541L295.913 395.357L295.739 392.254H292.631V395.541ZM292.561 384.584V387.871H295.801L295.848 384.632L292.561 384.584ZM294.473 376.649L296.797 378.973V378.973L294.473 376.649ZM344.31 376.649L341.986 378.973L344.31 376.649ZM294.473 401.285L292.148 403.61V403.61L294.473 401.285ZM292.631 392.254H161.065V398.828H292.631V392.254ZM161.065 392.254C159.855 392.254 158.874 391.273 158.874 390.063H152.3C152.3 394.904 156.224 398.828 161.065 398.828V392.254ZM158.874 390.063C158.874 388.852 159.855 387.871 161.065 387.871V381.297C156.224 381.297 152.3 385.222 152.3 390.063H158.874ZM161.065 387.871H292.561V381.297H161.065V387.871ZM295.848 384.632C295.91 380.328 296.33 379.44 296.797 378.973L292.148 374.324C289.515 376.958 289.33 380.69 289.275 384.537L295.848 384.632ZM296.797 378.973C297.047 378.723 297.494 378.413 298.92 378.222C300.44 378.017 302.503 378.01 305.695 378.01V371.436C302.689 371.436 300.104 371.429 298.044 371.706C295.889 371.996 293.824 372.649 292.148 374.324L296.797 378.973ZM305.695 378.01H333.087V371.436H305.695V378.01ZM333.087 378.01C336.279 378.01 338.343 378.017 339.863 378.222C341.289 378.413 341.735 378.723 341.986 378.973L346.634 374.324C344.959 372.649 342.893 371.996 340.739 371.706C338.679 371.429 336.093 371.436 333.087 371.436V378.01ZM341.986 378.973C342.236 379.223 342.545 379.67 342.737 381.096C342.941 382.616 342.948 384.679 342.948 387.871H349.522C349.522 384.865 349.529 382.28 349.252 380.22C348.963 378.065 348.309 376 346.634 374.324L341.986 378.973ZM342.948 387.871V390.063H349.522V387.871H342.948ZM342.948 390.063C342.948 393.255 342.941 395.318 342.737 396.838C342.545 398.264 342.236 398.711 341.986 398.961L346.634 403.61C348.309 401.934 348.963 399.869 349.252 397.714C349.529 395.654 349.522 393.069 349.522 390.063H342.948ZM341.986 398.961C341.735 399.211 341.289 399.521 339.863 399.712C338.343 399.917 336.279 399.924 333.087 399.924V406.498C336.093 406.498 338.679 406.505 340.739 406.228C342.894 405.938 344.959 405.285 346.634 403.61L341.986 398.961ZM333.087 399.924H305.695V406.498H333.087V399.924ZM305.695 399.924C302.503 399.924 300.44 399.917 298.92 399.712C297.494 399.521 297.047 399.211 296.797 398.961L292.148 403.61C293.824 405.285 295.889 405.938 298.044 406.228C300.104 406.505 302.689 406.498 305.695 406.498V399.924ZM296.797 398.961C296.466 398.631 296.06 397.986 295.913 395.357L289.349 395.725C289.511 398.609 289.984 401.445 292.148 403.61L296.797 398.961Z"
                        fill="url(#paint12_linear_0_1)"
                        mask="url(#path-29-outside-1_0_1)"
                      />
                      <g filter="url(#filter5_i_0_1)">
                        <path
                          d="M292.547 383.489C292.547 381.451 292.547 380.432 292.771 379.596C293.379 377.327 295.151 375.555 297.42 374.947C298.256 374.723 299.275 374.723 301.312 374.723H337.47C339.508 374.723 340.527 374.723 341.363 374.947C343.631 375.555 345.404 377.327 346.011 379.596C346.235 380.432 346.235 381.451 346.235 383.489H292.547Z"
                          fill="url(#paint13_linear_0_1)"
                        />
                      </g>
                      <path
                        d="M184 193.503H217.215C218.32 193.503 219.215 192.607 219.215 191.503V162.105C219.215 161.647 219.058 161.202 218.769 160.845L215.437 156.74C215.058 156.272 214.487 156 213.884 156H184C182.895 156 182 156.895 182 158V191.503C182 192.607 182.895 193.503 184 193.503Z"
                        fill="white"
                        stroke="black"
                      />
                      <path
                        d="M187.035 194.043V180.124C187.035 179.019 187.93 178.124 189.035 178.124H212.618C213.723 178.124 214.618 179.019 214.618 180.124V194.043"
                        stroke="black"
                      />
                      <path
                        d="M209.802 156L209.802 166.411C209.802 167.516 208.907 168.411 207.802 168.411L192.538 168.411C191.433 168.411 190.538 167.516 190.538 166.411L190.538 156"
                        stroke="black"
                      />
                      <rect
                        x="201.108"
                        y="158.658"
                        width="4.69178"
                        height="7.09414"
                        rx="1.5"
                        fill="white"
                        stroke="black"
                      />
                      <path
                        d="M200.691 188.365V188.296C200.698 187.573 200.774 186.997 200.918 186.569C201.062 186.141 201.266 185.795 201.531 185.529C201.797 185.264 202.115 185.02 202.486 184.796C202.709 184.66 202.91 184.499 203.088 184.313C203.266 184.124 203.406 183.906 203.509 183.66C203.615 183.414 203.668 183.141 203.668 182.842C203.668 182.471 203.581 182.149 203.406 181.876C203.232 181.603 202.999 181.393 202.708 181.245C202.416 181.098 202.092 181.024 201.736 181.024C201.425 181.024 201.126 181.088 200.838 181.217C200.55 181.346 200.31 181.548 200.117 181.825C199.923 182.101 199.812 182.463 199.781 182.91H198.35C198.38 182.266 198.547 181.715 198.85 181.257C199.156 180.798 199.56 180.448 200.06 180.206C200.564 179.963 201.122 179.842 201.736 179.842C202.403 179.842 202.982 179.974 203.475 180.24C203.971 180.505 204.353 180.868 204.622 181.331C204.895 181.793 205.031 182.319 205.031 182.91C205.031 183.327 204.967 183.704 204.838 184.041C204.713 184.378 204.531 184.679 204.293 184.944C204.058 185.209 203.774 185.444 203.441 185.649C203.107 185.857 202.84 186.077 202.639 186.308C202.439 186.535 202.293 186.806 202.202 187.12C202.111 187.435 202.062 187.827 202.054 188.296V188.365H200.691ZM201.418 191.728C201.137 191.728 200.897 191.628 200.696 191.427C200.495 191.226 200.395 190.986 200.395 190.706C200.395 190.425 200.495 190.185 200.696 189.984C200.897 189.783 201.137 189.683 201.418 189.683C201.698 189.683 201.939 189.783 202.139 189.984C202.34 190.185 202.441 190.425 202.441 190.706C202.441 190.891 202.393 191.062 202.298 191.217C202.208 191.372 202.084 191.497 201.929 191.592C201.778 191.683 201.607 191.728 201.418 191.728Z"
                        fill="black"
                      />
                      <defs>
                        <filter
                          id="filter0_i_0_1"
                          x="15.0576"
                          y="502.269"
                          width="372"
                          height="54"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="21.9136" />
                          <feComposite
                            in2="hardAlpha"
                            operator="arithmetic"
                            k2="-1"
                            k3="1"
                          />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="shape"
                            result="effect1_innerShadow_0_1"
                          />
                        </filter>
                        <filter
                          id="filter1_f_0_1"
                          x="14.2439"
                          y="27.392"
                          width="373.628"
                          height="453.612"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feGaussianBlur
                            stdDeviation="0.547841"
                            result="effect1_foregroundBlur_0_1"
                          />
                        </filter>
                        <filter
                          id="filter2_f_0_1"
                          x="35.0618"
                          y="48.21"
                          width="331.992"
                          height="257.485"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feGaussianBlur
                            stdDeviation="0.547841"
                            result="effect1_foregroundBlur_0_1"
                          />
                        </filter>
                        <filter
                          id="filter3_i_0_1"
                          x="49.3057"
                          y="59.1669"
                          width="303.504"
                          height="232.301"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset />
                          <feGaussianBlur stdDeviation="18.0787" />
                          <feComposite
                            in2="hardAlpha"
                            operator="arithmetic"
                            k2="-1"
                            k3="1"
                          />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.8 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="shape"
                            result="effect1_innerShadow_0_1"
                          />
                        </filter>
                        <filter
                          id="filter4_i_0_1"
                          x="50.4014"
                          y="392.254"
                          width="53.6885"
                          height="53.6884"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feMorphology
                            radius="1.09568"
                            operator="erode"
                            in="SourceAlpha"
                            result="effect1_innerShadow_0_1"
                          />
                          <feOffset dx="1.09568" dy="1.09568" />
                          <feGaussianBlur stdDeviation="1.09568" />
                          <feComposite
                            in2="hardAlpha"
                            operator="arithmetic"
                            k2="-1"
                            k3="1"
                          />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="shape"
                            result="effect1_innerShadow_0_1"
                          />
                        </filter>
                        <filter
                          id="filter5_i_0_1"
                          x="292.547"
                          y="374.723"
                          width="53.6884"
                          height="10.9568"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="2.19136" />
                          <feGaussianBlur stdDeviation="1.09568" />
                          <feComposite
                            in2="hardAlpha"
                            operator="arithmetic"
                            k2="-1"
                            k3="1"
                          />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="shape"
                            result="effect1_innerShadow_0_1"
                          />
                        </filter>
                        <linearGradient
                          id="paint0_linear_0_1"
                          x1="201.058"
                          y1="502.269"
                          x2="201.058"
                          y2="556.269"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#807D70" />
                          <stop offset="0.693031" stop-color="#979487" />
                          <stop offset="0.810771" stop-color="#BDB9A9" />
                          <stop offset="1" stop-color="#A19E91" />
                        </linearGradient>
                        <linearGradient
                          id="paint1_linear_0_1"
                          x1="201.058"
                          y1="0"
                          x2="201.058"
                          y2="508.396"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#FBF9F8" />
                          <stop offset="0.0727187" stop-color="#DDD5C7" />
                          <stop offset="0.473103" stop-color="#B7AEA0" />
                          <stop offset="0.929747" stop-color="#BDB6AA" />
                          <stop offset="1" stop-color="#928C84" />
                        </linearGradient>
                        <linearGradient
                          id="paint2_linear_0_1"
                          x1="201.605"
                          y1="28.4877"
                          x2="201.058"
                          y2="479.909"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#EFE5DC" />
                          <stop offset="0.171789" stop-color="#CFC5BD" />
                          <stop offset="1" stop-color="#D2CCC1" />
                        </linearGradient>
                        <linearGradient
                          id="paint3_linear_0_1"
                          x1="201.058"
                          y1="28.4877"
                          x2="201.058"
                          y2="479.909"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="white" stop-opacity="0.6" />
                          <stop
                            offset="0.507222"
                            stop-color="white"
                            stop-opacity="0.1"
                          />
                          <stop
                            offset="1"
                            stop-color="white"
                            stop-opacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="paint4_linear_0_1"
                          x1="201.058"
                          y1="49.3057"
                          x2="201.058"
                          y2="304.6"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#BFB7AB" />
                          <stop offset="1" stop-color="#959088" />
                        </linearGradient>
                        <linearGradient
                          id="paint5_linear_0_1"
                          x1="45.5962"
                          y1="37.2532"
                          x2="274.94"
                          y2="333.329"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#6B6A69" />
                          <stop
                            offset="0.499548"
                            stop-color="#0B0B0A"
                            stop-opacity="0.6"
                          />
                          <stop offset="0.537071" />
                          <stop
                            offset="0.661251"
                            stop-color="#0D0D0D"
                            stop-opacity="0.7"
                          />
                          <stop offset="1" stop-color="#696967" />
                        </linearGradient>
                        <linearGradient
                          id="paint6_linear_0_1"
                          x1="293.095"
                          y1="49.3057"
                          x2="105.733"
                          y2="298.573"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-opacity="0" />
                          <stop offset="0.382803" stop-opacity="0.4" />
                          <stop offset="0.481596" />
                          <stop offset="0.540332" stop-opacity="0.5" />
                          <stop offset="1" stop-opacity="0" />
                        </linearGradient>
                        <linearGradient
                          id="paint7_linear_0_1"
                          x1="201.058"
                          y1="49.3057"
                          x2="201.058"
                          y2="304.6"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#FFF0E3" stop-opacity="0.6" />
                          <stop
                            offset="1"
                            stop-color="#FFF0E3"
                            stop-opacity="0.5"
                          />
                        </linearGradient>
                        <linearGradient
                          id="paint8_linear_0_1"
                          x1="342.948"
                          y1="283.234"
                          x2="49.3057"
                          y2="59.1669"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#1E201D" />
                          <stop offset="1" stop-color="#30332E" />
                        </linearGradient>
                        <linearGradient
                          id="paint9_linear_0_1"
                          x1="342.948"
                          y1="283.234"
                          x2="49.3057"
                          y2="59.1669"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#1E201D" />
                          <stop offset="1" stop-color="#30332E" />
                        </linearGradient>
                        <linearGradient
                          id="paint10_linear_0_1"
                          x1="76.6977"
                          y1="392.254"
                          x2="76.6977"
                          y2="444.847"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#CEC6BC" />
                          <stop offset="1" stop-color="#CAC2B5" />
                        </linearGradient>
                        <linearGradient
                          id="paint11_linear_0_1"
                          x1="340.041"
                          y1="403.297"
                          x2="322.111"
                          y2="333.214"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#1E201D" />
                          <stop offset="1" stop-color="#30332E" />
                        </linearGradient>
                        <linearGradient
                          id="paint12_linear_0_1"
                          x1="250.911"
                          y1="375.819"
                          x2="250.911"
                          y2="398.28"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#66594A" stop-opacity="0.5" />
                          <stop
                            offset="1"
                            stop-color="white"
                            stop-opacity="0.3"
                          />
                        </linearGradient>
                        <linearGradient
                          id="paint13_linear_0_1"
                          x1="319.391"
                          y1="374.723"
                          x2="319.391"
                          y2="383.489"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#8C7E71" />
                          <stop offset="1" stop-color="#B8AFA8" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <p className="py-2 text-lg text-center">
                      No notes have been Archived. Click{" "}
                      <ArchiveDrawerLineIcon className="inline-block w-5 h-5" />{" "}
                      to archive a note.
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
                        onClick={() => setActiveNoteId(note.id)}
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
                          onClick={() => handleDeleteNote(note.id)}
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
