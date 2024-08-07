import React, { useState, useEffect } from "react";
import { Note } from "../../store/types";

type BubblemenuNoteLinkProps = {
  popupPosition: { top: number; left: number } | any;
  notes: Note[];
  onClickNote: (note: Note) => void;
  textAfterAt: string | null;
};

const BubblemenuNoteLink: React.FC<BubblemenuNoteLinkProps> = ({
  popupPosition,
  notes,
  onClickNote,
  textAfterAt,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (textAfterAt !== null) {
      setSearchQuery(textAfterAt); // Initialize search query if textAfterAt is provided
    }
  }, [textAfterAt]);

  // Function to filter notes based on search query
  const filteredNotes = notes
    .filter((note) => note.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5); // Limit to 5 items

  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength ? title.substring(0, maxLength) + "..." : title;
  };

  return (
    <div
      className="z-50 fixed bg-white dark:bg-[#232222] shadow border-2 shadow dark:border-neutral-600 rounded-lg min-w-24 min-h-14 p-2"
      style={{ top: popupPosition.top, left: popupPosition.left }}
    >
      {filteredNotes.length === 0 ? (
        <div className="p-2 text-sm text-gray-500">No notes found.</div>
      ) : (
        filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer"
            onClick={() => onClickNote(note)}
          >
            {truncateTitle(note.title, 20)} {/* Adjust maxLength as needed */}
          </div>
        ))
      )}
    </div>
  );
};

export default BubblemenuNoteLink;
