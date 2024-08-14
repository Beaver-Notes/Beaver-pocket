import { SetStateAction, useState } from 'react';
import { Note } from './types';

const useNoteEditor = (
  activeNoteId: string | number | null, 
  notesState: Record<string, Note>, 
  setNotesState: { 
    (value: SetStateAction<Record<string, Note>>): void; 
    (arg0: (prevNotes: any) => any): void; 
  }, 
  saveNote: { 
    (note: unknown): Promise<void>; 
    (arg0: any): void; 
  }
) => {
  const [title, setTitle] = useState(activeNoteId ? notesState[activeNoteId]?.title || "" : "");

  const handleChangeNoteContent = (
    content: any,
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
        const updatedTitle =
          newTitle !== undefined && newTitle.trim() !== ""
            ? newTitle
            : existingNote.title;
  
        // Update labels if provided
        const updatedLabels = newLabels !== undefined ? newLabels : existingNote.labels;
  
        const updateNote = {
          ...existingNote,
          updatedAt: new Date(),
          content,
          title: updatedTitle,
          labels: updatedLabels,
        };
  
        setNotesState((prevNotes) => ({
          ...prevNotes,
          [activeNoteId]: updateNote,
        }));
  
        saveNote(updateNote).catch((error) => {
          console.error("Error saving note:", error);
        });
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
