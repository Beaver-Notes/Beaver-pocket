import React, { useState, useEffect, useMemo } from "react";
import { Note } from "../../store/types";

type BubblemenuNoteLinkProps = {
  notes: Note[];
  onClickNote: (note: Note) => void;
  textAfterAt: string | null;
};

const BubblemenuNoteLink: React.FC<BubblemenuNoteLinkProps> = ({
  notes,
  onClickNote,
  textAfterAt,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (textAfterAt !== null) {
      setSearchQuery(textAfterAt);
    }
  }, [textAfterAt]);

  const filteredNotes = useMemo(() => {
    const results = notes
      .filter((note) => note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5);

    console.log('Filtered Notes in Bubblemenu:', results); // Log filtered notes
    return results;
  }, [searchQuery, notes]);

  return (
    <div
      className="bubblemenu z-50 fixed bg-white dark:bg-[#232222] shadow border-2 shadow dark:border-neutral-600 rounded-lg min-w-24 min-h-14 p-2"
    >
      {filteredNotes.length === 0 ? (
        <div className="p-2 text-sm text-neutral-500">No notes found.</div>
      ) : (
        filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer"
            onClick={() => {
              console.log('Note clicked:', note);
              onClickNote(note);
            }}
          >
            {note.title}
          </div>
        ))
      )}
    </div>
  );
};

export default BubblemenuNoteLink;
