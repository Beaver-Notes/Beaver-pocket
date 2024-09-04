import React, { useState, useEffect } from "react";
import { Note } from "../../store/types";
import icons from "../../lib/remixicon-react"
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useSaveNote } from "../../store/notes";

interface CommandPromptProps {
  isOpen: boolean;
  setIsCommandPromptOpen: (value: boolean) => void;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const CommandPrompt: React.FC<CommandPromptProps> = ({
  isOpen,
  setIsCommandPromptOpen,
  notesState,
  setNotesState,
}) => {
  const { saveNote } = useSaveNote(setNotesState);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortingOption] = useState("updatedAt");
  const [searchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
  useState<Record<string, Note>>(notesState);

  const [translations, setTranslations] = useState({
    commandprompt: {
      newNote: "commandprompt.newNote",
      settings: "commandprompt.settings",
      theme: "commandprompt.theme",
      placeholder: "commandprompt.placeholder"
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const contentMatch = JSON.stringify(note.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const notes = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdAtB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdAtA - createdAtB;
      case "updatedAt":
      default:
        const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return updatedAtA - updatedAtB;
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === "ArrowUp") {
          setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        } else if (e.key === "ArrowDown") {
          setSelectedIndex((prevIndex) =>
            prevIndex < Notes.length + 1 ? prevIndex + 1 : prevIndex
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
        handleCreateNewNote();
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
    navigate(`/editor/${note.id}`);
  };

  const handleCreateNewNote = async () => {
    const newNote = {
      id: uuid(),
      title: "New Note",
      content: { type: "doc", content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };

    await saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  };

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  const switchTheme = () => {
    toggleTheme(!darkMode);
    isOpen && setIsCommandPromptOpen(false);
  };

  const navigate = useNavigate();

  const goTosettings = () => {
    navigate("/settings");
  }

  const Notes = notes.filter((note) => {
    const noteTitle = note.title;
    return noteTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  return (
    <>
      {isOpen && (
        <div className="fixed top-16 shadow-xl left-0 right-0 mx-auto sm:w-1/4 w-4/5 flex flex-col items-center justify-center z-100">
          <div className="bg-[#FDFDFA] dark:bg-[#353333] transform w-full rounded-lg shadow-xl py-2 px-4 relative">
            <div className="w-full p-2 border-b-2 dark:border-neutral-600 bg-transparent align-middle text-gray-800 cursor-pointer flex items-center justify-start dark:text-[color:var(--selected-dark-text)] mr-2">
              <div>
                <icons.Search2LineIcon className="text-gray-800 dark:text-[color:var(--selected-dark-text)] h-6 w-6" />
              </div>
              <input
                className="text-xl text-gray-800 bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
                type="text"
                placeholder={translations.commandprompt.placeholder}
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
                    onClick={handleCreateNewNote}
                  >
                    <h1 className="text-lg">{translations.commandprompt.newNote}</h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 1
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={goTosettings}
                  >
                    <h1 className="text-lg">{translations.commandprompt.settings}</h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 2
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={switchTheme}
                  >
                    <h1 className="text-lg">{translations.commandprompt.theme}</h1>
                  </div>
                </>
              ) : (
                Notes.map((note, index) => (
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
