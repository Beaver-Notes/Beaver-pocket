import { SetStateAction, useState } from 'react';
import { Note } from './types';
import { JSONContent } from '@tiptap/react';

// Typing for the saveNote function
type SaveNoteFunction = (note: Note) => Promise<void>;

// Typing for the setNotesState function
type SetNotesStateFunction = React.Dispatch<SetStateAction<Record<string, Note>>>;

const useNoteEditor = (
  activeNoteId: string | number | null, 
  notesState: Record<string, Note>, 
  setNotesState: SetNotesStateFunction, 
  saveNote: SaveNoteFunction
) => {
  // Initialize title state based on the active note
  const [title, setTitle] = useState<string>(activeNoteId ? notesState[activeNoteId]?.title || "" : "");

  const handleChangeNoteContent = async (
    content: JSONContent, // Update type here if JSONContent is expected
    newTitle?: string, 
    newLabels?: string[]
  ) => {
    try {
      if (activeNoteId) {
        const existingNote = notesState[activeNoteId];
        if (!existingNote) {
          throw new Error(`Note with id ${activeNoteId} not found in notesState.`);
        }

        // Update title if provided
        const updatedTitle = newTitle !== undefined && newTitle.trim() !== "" ? newTitle : existingNote.title;

        // Update labels if provided
        const updatedLabels = newLabels !== undefined ? newLabels : existingNote.labels;

        const updatedNote: Note = {
          ...existingNote,
          updatedAt: Date.now(), // Use timestamp for updatedAt
          content, // No conversion needed if content is JSONContent
          title: updatedTitle,
          labels: updatedLabels,
        };

        // Update notes state
        setNotesState((prevNotes) => ({
          ...prevNotes,
          [activeNoteId]: updatedNote,
        }));

        // Save the updated note
        await saveNote(updatedNote);
      } else {
        console.warn("No active note ID provided.");
      }
    } catch (error) {
      console.error("Error in handleChangeNoteContent:", error);
    }
  };

  return { title, setTitle, handleChangeNoteContent };
};

export default useNoteEditor;
