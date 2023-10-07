import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import styles from "./App.module.css";
import { Note } from "./types";
import debounce from "./debounce";
import storage from "./storage";
import NoteEditor from "./NoteEditor";
import { JSONContent } from "@tiptap/react";
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

function App() {
  const loadNotes = () => {
    const noteIds = storage.get<string[]>(STORAGE_KEY, []);
    const notes: Record<string, Note> = {};
    noteIds.forEach((id) => {
      let note = storage.get<Note>(`${STORAGE_KEY}:${id}`);

      // Check if note is defined
      if (note) {
        // Ensure updatedAt is a Date object
        note.updatedAt = new Date(note.updatedAt);

        // Ensure createdAt is a Date object
        note.createdAt = new Date(note.createdAt);

        // ... other property checks

        notes[note.id] = note;
      }
    });
    return notes;
  };

  const handleDeleteNote = (noteId: string) => {
    // Confirm with the user before deleting the note
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (isConfirmed) {
      // Remove the note from the notesState and local storage
      const updatedNotes = { ...notesState };
      delete updatedNotes[noteId];
      setNotesState(updatedNotes);

      // Update local storage
      const noteIds = Object.keys(updatedNotes);
      storage.set(STORAGE_KEY, noteIds);
      storage.remove(`${STORAGE_KEY}:${noteId}`);

      // If the deleted note was active, clear the activeNoteId
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }

      // Reload the page
      window.location.reload();
    }
  };

  const saveNote = debounce((note: Note) => {
    const noteIds = storage.get<string[]>(STORAGE_KEY, []);
    const noteIdsWithoutNote = noteIds.filter((id) => id !== note.id);

    // Update the local storage with the note
    storage.set(STORAGE_KEY, [...noteIdsWithoutNote, note.id]);
    storage.set(`${STORAGE_KEY}:${note.id}`, note);

    // Update the notesState with the note
    setNotesState((prevNotes) => ({
      ...prevNotes,
      [note.id]: note,
    }));
  }, 200);

  const handleToggleBookmark = (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event propagation

    setNotesState((prevNotes) => {
      const updatedNotes = { ...prevNotes };
      const updatedNote = { ...updatedNotes[noteId] };

      // Check if the note is archived
      if (updatedNote.isArchived) {
        // If it's archived, it cannot be bookmarked, so unarchive it
        updatedNote.isArchived = false;
      } else {
        // Toggle the 'isBookmarked' property
        updatedNote.isBookmarked = !updatedNote.isBookmarked;
      }

      // Update the note in the dictionary
      updatedNotes[noteId] = updatedNote;

      // Update local storage
      const noteIds = Object.keys(updatedNotes);
      storage.set(STORAGE_KEY, noteIds);
      storage.set(`${STORAGE_KEY}:${noteId}`, updatedNote);

      return updatedNotes;
    });
  };

  const handleToggleArchive = (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event propagation

    setNotesState((prevNotes) => {
      const updatedNotes = { ...prevNotes };
      const updatedNote = { ...updatedNotes[noteId] };

      // Check if the note is bookmarked
      if (updatedNote.isBookmarked) {
        // If it's bookmarked, it cannot be archived, so unbookmark it
        updatedNote.isBookmarked = false;
      } else {
        // Toggle the 'isArchived' property
        updatedNote.isArchived = !updatedNote.isArchived;
      }

      // Update the note in the dictionary
      updatedNotes[noteId] = updatedNote;

      // Update local storage
      const noteIds = Object.keys(updatedNotes);
      storage.set(STORAGE_KEY, noteIds);
      storage.set(`${STORAGE_KEY}:${noteId}`, updatedNote);

      return updatedNotes;
    });
  };

  const [notesState, setNotesState] = useState<Record<string, Note>>(() =>
    loadNotes()
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

  useEffect(() => {
    // Initialize notesState with the stored notes
    setNotesState(loadNotes());
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
    // Reverse the sorting order to sort from most recent (last edited) to oldest
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

  function truncateContentPreview(
    content: string | JSONContent | JSONContent[]
  ): string {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = JSON.stringify(jsonContent);
    } else {
      text = JSON.stringify(content);
    }

    if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      // Truncate the extracted paragraph text
      const extractedText = extractParagraphTextFromContent(JSON.parse(text));
      return extractedText.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
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
                  type="file"
                  id="importData"
                  accept=".json"
                  style={{ display: "none" }}
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
                .length > 0 && <h2>Bookmarked</h2>}
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
                        <button
                          className={styles.button}
                          onClick={(e) => handleToggleBookmark(note.id, e)}
                        >
                          {note.isBookmarked ? (
                            <Bookmark3FillIcon />
                          ) : (
                            <Bookmark3LineIcon />
                          )}
                        </button>
                        <button
                          className={styles.trash}
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <DeleteBinLineIcon />
                        </button>
                      </div>
                    );
                  }
                  return null; // Return null for notes that are not bookmarked or archived
                })}
              </div>
            </div>
            {isArchiveVisible ? (
              <div className={styles.ArchivedSection}>
                {notesList.filter((note) => note.isArchived).length > 0 && (
                  <h2>Archived</h2>
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
                            <ArchiveDrawerFillIcon />
                          ) : (
                            <ArchiveDrawerLineIcon />
                          )}
                        </button>
                        <button
                          className={styles.trash}
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <DeleteBinLineIcon />
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
                  .filter((note) => !note.isBookmarked)
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
                          <Bookmark3FillIcon />
                        ) : (
                          <Bookmark3LineIcon />
                        )}
                      </button>
                      <button
                        className={styles.button}
                        onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
                      >
                        {note.isBookmarked ? (
                          <ArchiveDrawerFillIcon />
                        ) : (
                          <ArchiveDrawerLineIcon />
                        )}
                      </button>
                      <button
                        className={styles.trash}
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <DeleteBinLineIcon />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
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

export default App;
