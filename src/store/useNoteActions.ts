// useNoteEditor.js
import { SetStateAction, useState } from 'react';
import { Note } from './types';

const useNoteEditor = (activeNoteId: string | number | null, notesState: Record<string, Note>, setNotesState: { (value: SetStateAction<Record<string, Note>>): void; (arg0: (prevNotes: any) => any): void; }, saveNote: { (note: unknown): Promise<void>; (arg0: any): void; }) => {
  const [title, setTitle] = useState(activeNoteId ? notesState[activeNoteId].title : "");

  const handleChangeNoteContent = (content: any, newTitle: string | undefined) => {
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

  return { title, setTitle, handleChangeNoteContent };
};

export default useNoteEditor;
