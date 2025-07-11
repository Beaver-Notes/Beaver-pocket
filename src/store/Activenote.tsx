import { useState, useEffect } from "react";
import { Note } from "./types";

const useNotesState = () => {
  const [notesState, setNotesState] = useState<Record<string, Note>>({});
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  return { notesState, setNotesState, activeNoteId, setActiveNoteId };
};

const useActiveNote = (
  activeNoteId: string | null,
  notesState: Record<string, Note>
) => {
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    if (activeNoteId && notesState[activeNoteId]) {
      setActiveNote(notesState[activeNoteId]);
      localStorage.setItem("lastNoteEdit", activeNoteId);
    } else {
      setActiveNote(null);
    }
  }, [activeNoteId, notesState]);

  return activeNote;
};

export { useNotesState, useActiveNote };
