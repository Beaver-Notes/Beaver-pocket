import React, { useState } from "react";
import { Note } from "../../store/types";
import Search2LineIcon from "remixicon-react/Search2LineIcon";

type BubblemenuNoteLinkProps = {
  position: { top: number; left: number };
  notes: Note[];
  onClickNote: (note: Note) => void;
};

const BubblemenuNoteLink: React.FC<BubblemenuNoteLinkProps> = ({
  notes,
  onClickNote,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Function to filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="z-50 ml-10 fixed bg-white shadow border rounded-lg p-2">
      <div className="flex pb-2 items-center relative">
        <Search2LineIcon className="ml-2 dark:text-gray-200 text-gray-600 absolute left-0" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 outline-none rounded-xl w-full bg-input bg-transparent transition ring-neutral-200 ring-2 dark:ring-neutral-600 focus:ring-2 focus:ring-amber-300 pl-10"
        />
      </div>
      {filteredNotes.map((note) => (
        <div key={note.id} className='p-2 hover:bg-neutral-100 rounded-lg' onClick={() => onClickNote(note)}>
          {note.title}
        </div>
      ))}
    </div>
  );
};

export default BubblemenuNoteLink;
