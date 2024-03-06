import React, { useState, useEffect } from "react";
import { Note } from "../../store/types";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import { useNavigate } from "react-router-dom";

interface CommandPromptProps {
  isOpen: boolean;
  notes: Note[];
  onClickNote: (note: Note) => Promise<void>;
  setIsCommandPromptOpen: (value: boolean) => void;
  toggleTheme: () => void;
  onCreateNewNote: () => void;
}

const CommandPrompt: React.FC<CommandPromptProps> = ({
  isOpen,
  notes,
  onClickNote,
  toggleTheme,
  setIsCommandPromptOpen,
  onCreateNewNote,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === "ArrowUp") {
          setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        } else if (e.key === "ArrowDown") {
          setSelectedIndex((prevIndex) =>
            prevIndex < filteredNotes.length + 1 ? prevIndex + 1 : prevIndex
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredNotes.length]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ">") {
      setShowSubMenu(true);
    } else if (e.key === "Backspace" && searchTerm === ">") {
      setShowSubMenu(false);
    } else if (e.key === "Enter") {
      if (showSubMenu && selectedIndex === 0) {
        createNewNote();
      } else if (showSubMenu && selectedIndex === 1) {
        goTosettings();
      } else if (showSubMenu && selectedIndex === 2) {
        switchTheme();
      } else {
        const selectedNote = filteredNotes[selectedIndex];
        handleClickNote(selectedNote);
      }
    }
  };

  const handleClickNote = async (note: Note) => {
    await onClickNote(note);
    isOpen && setIsCommandPromptOpen(false);
  };

  const createNewNote = () => {
    onCreateNewNote();
    isOpen && setIsCommandPromptOpen(false);
  };

  const switchTheme = () => {
    toggleTheme();
    isOpen && setIsCommandPromptOpen(false);
  };

  const navigate = useNavigate();

  const goTosettings = () => {
    navigate("/settings");
  }

  return (
    <>
      {isOpen && (
        <div className="fixed top-10 left-0 right-0 mx-auto sm:w-1/4 w-3/4 flex flex-col items-center justify-center z-100">
          <div className="bg-[#FDFDFA] dark:bg-[#353333] transform w-full rounded-lg shadow-xl py-2 px-4 relative">
            <div className="w-full p-2 border-b-2 dark:border-neutral-600 bg-transparent align-middle text-gray-800 cursor-pointer flex items-center justify-start dark:text-white mr-2">
              <div>
                <Search2LineIcon className="text-gray-800 dark:text-white h-6 w-6" />
              </div>
              <input
                className="text-xl text-gray-800 bg-transparent px-2 outline-none dark:text-white w-full"
                type="text"
                placeholder="Search file or type '>' to search commands"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
            <div className="py-1">
              {showSubMenu ? (
                <>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 0
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={createNewNote}
                  >
                    <h1 className="text-lg">Create new note</h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 1
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={goTosettings}
                  >
                    <h1 className="text-lg">Settings</h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 2
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={switchTheme}
                  >
                    <h1 className="text-lg">Change Theme</h1>
                  </div>
                </>
              ) : (
                filteredNotes.map((note, index) => (
                  <div
                    key={note.id}
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      index === selectedIndex - 2
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
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

export default CommandPrompt;
