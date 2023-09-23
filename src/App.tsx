import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import styles from './App.module.css';
import { Note } from './types';
import debounce from './debounce';
import storage from './storage';
import NoteEditor from './NoteEditor';
import { JSONContent } from '@tiptap/react';
import { Filesystem, Directory, FilesystemEncoding } from '@capacitor/filesystem';

// Import Remix icons
import AddFillIcon from 'remixicon-react/AddFillIcon';
import DeleteBinLineIcon from 'remixicon-react/DeleteBinLineIcon';
import Search2LineIcon from 'remixicon-react/Search2LineIcon';

const STORAGE_KEY = 'notes';

function App() {
  const loadNotes = () => {
    const noteIds = storage.get<string[]>(STORAGE_KEY, []);
    const notes: Record<string, Note> = {};
    noteIds.forEach((id) => {
      let note = storage.get<Note>(`${STORAGE_KEY}:${id}`);

      // Ensure updatedAt is a Date object
      note.updatedAt = note.updatedAt instanceof Date ? note.updatedAt : new Date(); // Add this line
      note.createdAt = note.createdAt instanceof Date ? note.createdAt : new Date(); // Add this line


      // ... other property checks

      notes[note.id] = note;
    });
    return notes;
  };

  const handleDeleteNote = (noteId: string) => {
    // Confirm with the user before deleting the note
    const isConfirmed = window.confirm('Are you sure you want to delete this note?');

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

  const [notesState, setNotesState] = useState<Record<string, Note>>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredNotes, setFilteredNotes] = useState<Record<string, Note>>(notesState);

  useEffect(() => {
    // Initialize notesState with the stored notes
    setNotesState(loadNotes());
  }, []);

  useEffect(() => {
    // Update the filteredNotes when searchQuery changes
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
      const contentMatch = JSON.stringify(note.content).toLowerCase().includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
    });

    setFilteredNotes(Object.fromEntries(filtered.map((note) => [note.id, note])));
  }, [searchQuery, notesState]);


const exportData = async () => {
  console.log('Exporting data...');

  const notes = Object.values(notesState);

  const exportedData : any = {
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

  console.log('Exported data:', exportedData);

  // Use FileSaver.js to prompt the user to select a save location
  try {
    const { uri } = await Filesystem.writeFile({
      path: 'data.json',
      data: jsonData,
      directory: Directory.Documents,
      encoding: FilesystemEncoding.UTF8,
    });

    console.log('File written successfully:', uri);

    // Now, you can use the file opener plugin to open the file
    // This is where you'd use the @capacitor-community/file-opener plugin
    // to open the file, allowing the user to save it or open it with other apps.
    // You can follow the plugin's documentation for usage.
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data: '+ (error as any).message);
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
            delete importedNote.updatedAt;

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

          alert('Data imported successfully!');
        } else {
          alert('Invalid data format.');
        }
      } catch (error) {
        console.error('Error while importing data:', error);
        alert('Error while importing data.');
      }
    };

    reader.readAsText(file);
  };

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const handleChangeNoteContent = (
    content: JSONContent,
    title: string = 'New Note'
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
      title: 'New Note',
      content: { type: 'doc', content: [] },
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

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    const updatedAtA = a.updatedAt instanceof Date ? a.updatedAt : new Date(0);
    const updatedAtB = b.updatedAt instanceof Date ? b.updatedAt : new Date(0);
    // Reverse the sorting order to sort from most recent (last edited) to oldest
    return updatedAtA.getTime() - updatedAtB.getTime();
  });  

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
            <button className={styles.sidebarButton} onClick={handleCreateNewNote}>
              <AddFillIcon /> New Note
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
                style={{ display: 'none' }}
                onChange={handleImportData}
              />
            </div>
          </div>
          </div>
          <div className={styles.sidebarList}>
            {notesList.map((note) => (
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
                <div className={styles.sidebarTitle}>{note.title}</div>
                <button
                  className={styles.buttons}
                  onClick={() => handleDeleteNote(note.id)}
                >
                  <DeleteBinLineIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={styles.noteContainer}>
        {activeNote && (
          <NoteEditor
            note={activeNote}
            onChange={handleChangeNoteContent}
          />
        )}
      </div>
    </div>
  );
}

export default App;