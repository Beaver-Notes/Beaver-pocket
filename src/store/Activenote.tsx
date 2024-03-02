import { useState, useEffect } from "react";
import { Note } from "./types";
import { loadNotes } from "./notes";

const useNotesState = () => {
  const [notesState, setNotesState] = useState<Record<string, Note>>({});
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  }, []);

  return { notesState, setNotesState, activeNoteId, setActiveNoteId };
};

const useActiveNote = (activeNoteId: string | null, notesState: Record<string, Note>) => {
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    if (activeNoteId && notesState[activeNoteId]) {
      setActiveNote(notesState[activeNoteId]);
    } else {
      setActiveNote(null);
    }
  }, [activeNoteId, notesState]);

  return activeNote;
};

export { useNotesState, useActiveNote };
