<<<<<<< Updated upstream
import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import styles from "./App.module.css";
import { Note } from "./types";
import storage from "./storage";
import NoteEditor from "./NoteEditor";
import { JSONContent } from "@tiptap/react";
import BottomNavBar from './components/BottomNavBar';
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";

// Import Remix icons
import AddFillIcon from "remixicon-react/AddFillIcon";
import ArchiveLineIcon from "remixicon-react/ArchiveLineIcon";
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import Bookmark3LineIcon from "remixicon-react/Bookmark3LineIcon";
import Bookmark3FillIcon from "remixicon-react/Bookmark3FillIcon";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import ArchiveDrawerFillIcon from "remixicon-react/InboxUnarchiveLineIcon";

const STORAGE_KEY = "notes";

async function createNotesDirectory() {
  const directoryPath = 'notes';

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


function App() {
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
            console.log("The file is missing the 'notes' data. Returning an empty object.");
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
  
          setNotesState(notes); // Update the state
          window.location.reload(); // Reload the app
        } else {
          console.log(`Note with id ${noteId} not found.`);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
      }
    }
  };  

  const STORAGE_PATH = "notes/data.json";

  const saveNote = React.useCallback(
    async (note: Note) => {
      try {
        const notes = await loadNotes();
        notes[note.id] = note;
  
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
      } catch (error) {
        console.error("Error saving note:", error);
      }
    },
    [loadNotes]
  );

  const handleToggleBookmark = async (noteId: string, event: React.MouseEvent) => {
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
  

  const handleToggleArchive = async (noteId: string, event: React.MouseEvent) => {
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
    console.log("Exporting data...");

    const notes = Object.values(notesState);

    const exportedData: any = {
      data: {
        notes: {},
      },
    };

    notes.forEach((note) => {
      // Ensure updatedAt is in the correct format (number)
      exportedData.data.notes[note.id] = {
        id: note.id,
        title: note.title,
        content: note.content,
        labels: note.labels,
        createdAt: note.createdAt.getTime(),
        updatedAt: note.updatedAt.getTime(), // Ensure updatedAt is in the correct format
        isBookmarked: note.isBookmarked,
        isArchived: note.isArchived,
        lastCursorPosition: note.lastCursorPosition,
      };
    });

    const jsonData = JSON.stringify(exportedData, null, 2); // Indent JSON for readability

    console.log("Exported data:", exportedData);

    // Use FileSaver.js to prompt the user to select a save location
    try {
      const { uri } = await Filesystem.writeFile({
        path: "data.json",
        data: jsonData,
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      console.log("File written successfully:", uri);

      // Now, you can use the file opener plugin to open the file
      // This is where you'd use the @capacitor-community/file-opener plugin
      // to open the file, allowing the user to save it or open it with other apps.
      // You can follow the plugin's documentation for usage.
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data: " + (error as any).message);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        if (importedData && importedData.data && importedData.data.notes) {
          const importedNotes = importedData.data.notes;

          // Create an object to store the notes to be imported
          const notesToImport: Record<string, Note> = {};

          for (const noteId in importedNotes) {
            const importedNote = importedNotes[noteId];

            // Remove the updatedAt property from the imported note
            if (importedNote.hasOwnProperty("updatedAt")) {
              delete importedNote.updatedAt;
            }

            // Store the note in the notesToImport object
            notesToImport[noteId] = importedNote;
          }

          // Merge the imported notes with the existing notes in notesState
          const mergedNotes = { ...notesState, ...notesToImport };

          // Update the notesState with the merged notes
          setNotesState(mergedNotes);

          // Save the merged notes to local storage
          storage.set(STORAGE_KEY, Object.keys(mergedNotes));
          Object.values(mergedNotes).forEach((note) => {
            storage.set(`${STORAGE_KEY}:${note.id}`, note);
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

  const handleChangeNoteContent = (
    content: JSONContent,
    title: string = "New Note"
  ) => {
    if (activeNoteId) {
      const updateNote = {
        ...notesState[activeNoteId],
        updatedAt: new Date(),
        content,
        title,
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

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    const updatedAtA = a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
    const updatedAtB = b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
    return updatedAtA.getTime() - updatedAtB.getTime();
  });

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return "no content"; // Return "no content" if there's no content or empty content
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

    return paragraphText || "no content"; // If no paragraph text, return "no content"
  }

  function truncateContentPreview(content: JSONContent | string | JSONContent[]) {
    let text = "";
  
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent);
    } else if (content && content.content) {
      // Exclude the title from the content when displaying
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle);
    }
  
    if (text.trim() === "") {
      return "No content"; // Show a placeholder for no content
    } else if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }  

  return (
    <div className={styles.pageContainer}>
      {!activeNoteId && (
        <div className={styles.sidebar}>
          <div className={styles.topContainer}>
            <div className={styles.searchContainer}>
              <div className={styles.searchBar}>
                <Search2LineIcon className={styles.searchIcon} />
                <input
                  className={styles.searchBarInput}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.buttonContainer}>
              <button
                className={styles.sidebarButton}
                onClick={handleCreateNewNote}
              >
                <AddFillIcon className={styles.icon} /> Note
              </button>
              <button className={styles.sidebarButton} onClick={exportData}>
                Export
              </button>
              <div className={styles.sidebarButton}>
                <label htmlFor="importData">Import</label>
                <input
                  className={styles.input}
                  type="file"
                  id="importData"
                  accept=".json"
                  onChange={handleImportData}
                />
             </div>
              <button
                className={styles.sidebarButton}
                onClick={() => setIsArchiveVisible(!isArchiveVisible)}
              >
                <ArchiveLineIcon className={styles.icon} /> Archive
              </button>
            </div>
          </div>
          <div className={styles.sidebarList}>
            <div className={styles.bookmarkedSection}>
              {notesList.filter((note) => note.isBookmarked && !note.isArchived)
                .length > 0 && <h3>Bookmarked</h3>}
              <div className={styles.categories}>
                {notesList.map((note) => {
                  if (note.isBookmarked && !note.isArchived) {
                    return (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className={
                          note.id === activeNoteId
                            ? styles.bookmarkedsidebarItemActive
                            : styles.bookmarkedsidebarItem
                        }
                        onClick={() => setActiveNoteId(note.id)}
                      >
                        <div className={styles.cardContent}>
                          <div className={styles.sidebarTitle}>
                            {note.title}
                          </div>
                          <div className={styles.sidebarParagraph}>
                            {note.content &&
                              truncateContentPreview(note.content)}
                          </div>
                        </div>
                        <div className={styles.Cardbutton}>
                          <button
                            className={styles.button}
                            onClick={(e) => handleToggleBookmark(note.id, e)}
                          >
                            {note.isBookmarked ? (
                              <Bookmark3FillIcon className={styles.cardIcon} />
                            ) : (
                              <Bookmark3LineIcon className={styles.cardIcon} />
                            )}
                          </button>
                          <button
                            className={styles.trash}
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <DeleteBinLineIcon className={styles.cardIcon} />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            {isArchiveVisible ? (
              <div className={styles.ArchivedSection}>
                {notesList.filter((note) => note.isArchived).length > 0 && (
                  <h3>Archived</h3>
                )}
                <div className={styles.categories}>
                  {notesList
                    .filter((note) => note.isArchived)
                    .map((note) => (
                      <div
                        key={note.id}
                        role="button"
                        tabIndex={0}
                        className={
                          note.id === activeNoteId
                            ? styles.bookmarkedsidebarItemActive
                            : styles.bookmarkedsidebarItem
                        }
                        onClick={() => setActiveNoteId(note.id)}
                      >
                        <div className={styles.cardContent}>
                          <div className={styles.sidebarTitle}>
                            {note.title}
                          </div>
                          <div className={styles.sidebarParagraph}>
                            {note.content &&
                              truncateContentPreview(note.content)}
                          </div>
                        </div>
                        <button
                          className={styles.button}
                          onClick={(e) => handleToggleArchive(note.id, e)}
                        >
                          {note.isArchived ? (
                            <ArchiveDrawerFillIcon
                              className={styles.cardIcon}
                            />
                          ) : (
                            <ArchiveDrawerLineIcon
                              className={styles.cardIcon}
                            />
                          )}
                        </button>
                        <button
                          className={styles.trash}
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <DeleteBinLineIcon className={styles.cardIcon} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
            <div className={styles.allNotesSection}>
              <h2>All Notes</h2>
              <div className={styles.categories}>
                {notesList
                  .filter((note) => !note.isBookmarked && !note.isArchived)
                  .map((note) => (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      className={
                        note.id === activeNoteId
                          ? styles.sidebarItemActive
                          : styles.sidebarItem
                      }
                      onClick={() => setActiveNoteId(note.id)}
                    >
                      <div className={styles.cardContent}>
                        <div className={styles.sidebarTitle}>{note.title}</div>
                        <div className={styles.sidebarParagraph}>
                          {note.content && truncateContentPreview(note.content)}
                        </div>
                      </div>
                      <button
                        className={styles.button}
                        onClick={(e) => handleToggleBookmark(note.id, e)} // Pass the event
                      >
                        {note.isBookmarked ? (
                          <Bookmark3FillIcon className={styles.cardIcon} />
                        ) : (
                          <Bookmark3LineIcon className={styles.cardIcon} />
                        )}
                      </button>
                      <button
                        className={styles.button}
                        onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
                      >
                        {note.isBookmarked ? (
                          <ArchiveDrawerFillIcon className={styles.cardIcon} />
                        ) : (
                          <ArchiveDrawerLineIcon className={styles.cardIcon} />
                        )}
                      </button>
                      <button
                        className={styles.trash}
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <DeleteBinLineIcon className={styles.cardIcon} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <BottomNavBar
                onCreateNewNote={handleCreateNewNote}
                onToggleArchiveVisibility={() => setIsArchiveVisible(!isArchiveVisible)}
              />        
              </div>
      )}
      <div className={styles.noteContainer}>
        {activeNote && (
          <NoteEditor note={activeNote} onChange={handleChangeNoteContent} />
        )}
      </div>
    </div>
  );
}
=======
// App.js
import React from "react";
import { Routes, Route } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/archive" element={<Archive />} />
  </Routes>
);
>>>>>>> Stashed changes

export default App;
