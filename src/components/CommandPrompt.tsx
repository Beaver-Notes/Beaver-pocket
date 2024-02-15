import React, { useState } from "react";
import { Note } from "../store/types";
import Search2LineIcon from "remixicon-react/Search2LineIcon";

interface ShortcutPromptProps {
  isOpen: boolean;
  notes: Note[];
  onClickNote: (note: Note) => Promise<void>;
  setIsShortcutPromptOpen: (value: boolean) => void;
}

const ShortcutPrompt: React.FC<ShortcutPromptProps> = ({
  isOpen,
  notes,
  onClickNote,
  setIsShortcutPromptOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSubMenu, setShowSubMenu] = useState(false);

  // Function to handle key press events
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ">") {
      setShowSubMenu(true);
    } else if (e.key === "Backspace" && searchTerm === ">") {
      setShowSubMenu(false);
    }
  };

  // Function to handle clicking a note or submenu option
  const handleClickNote = async (note: Note) => {
    await onClickNote(note);
    // Hide the prompt after clicking a note
    isOpen && setIsShortcutPromptOpen(false);
  };

  const handleClickSubMenuOption = () => {
    // Hide the prompt after clicking a submenu option
    isOpen && setIsShortcutPromptOpen(false);
  };

  // Filter the notes based on the search term
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {isOpen && (
        <div className="fixed top-10 left-0 right-0 mx-auto w-1/4 flex flex-col items-center justify-center z-100">
          <div className="bg-[#FDFDFA] dark:bg-[#353333] transform w-full rounded-lg shadow-xl py-2 px-4 relative">
            <div className="w-full p-2 border-b-2 dark:border-neutral-600 bg-transparent align-middle inline text-gray-800 cursor-pointer flex items-center justify-start dark:text-white mr-2">
              <div>
                <Search2LineIcon className="text-gray-800 dark:text-white h-6 w-6" />
              </div>
              <input
                className="text-xl text-gray-800 bg-transparent px-2 outline-none dark:text-white w-full"
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress} // Call handleKeyPress function on key down
              />
            </div>
            <div className="py-1">
              {showSubMenu ? (
                <>
                  <div
                    className="note-item cursor-pointer hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400 rounded-lg p-2"
                    onClick={handleClickSubMenuOption}
                  >
                    <h1 className="text-lg">Submenu Item 1</h1>
                  </div>
                  <div
                    className="note-item cursor-pointer hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400 rounded-lg p-2"
                    onClick={handleClickSubMenuOption}
                  >
                    <h1 className="text-lg">Submenu Item 2</h1>
                  </div>
                </>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="note-item cursor-pointer hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400 rounded-lg p-2"
                    onClick={() => handleClickNote(note)}
                  >
                    <h1 className="text-lg">{note.title}</h1>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShortcutPrompt;
