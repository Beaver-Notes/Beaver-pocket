import React, { useState, useEffect } from "react";
import { Note } from "../../store/types";
import icons from "../../lib/remixicon-react";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useSaveNote } from "../../store/notes";
import Mousetrap from "mousetrap";
import { formatTime } from "../../utils/time-format";
import { JSONContent } from "@tiptap/react";

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
    card: {
      noContent: "card.noContent",
    },
    home: {
      title: "home.title",
    },
    commandprompt: {
      newNote: "commandprompt.newNote",
      settings: "commandprompt.settings",
      theme: "commandprompt.theme",
      placeholder: "commandprompt.placeholder",
    },
  });

  const navigate = useNavigate();

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
      try {
        const titleMatch = note.title
          ? note.title.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        const contentMatch = note.content
          ? JSON.stringify(note.content)
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : false;

        return titleMatch || contentMatch;
      } catch (error) {
        console.error("Error processing note:", error);
        return false;
      }
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
        return (a.createdAt || 0) - (b.createdAt || 0);
      case "updatedAt":
      default:
        return (a.updatedAt || 0) - (b.updatedAt || 0);
    }
  });

  const handleClickNote = async (note: Note) => {
    navigate(`/editor/${note.id}`);
  };

  const handleCreateNewNote = async () => {
    const newNote = {
      id: uuid(),
      title: `${translations.home.title || "-"}`,
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    setThemeMode(!darkMode ? "dark" : "light");
    setIsCommandPromptOpen(false);
  };

  const goToSettings = () => {
    navigate("/settings");
    setIsCommandPromptOpen(false);
  };

  // Keyboard navigation for submenu and notes
  useEffect(() => {
    if (isOpen) {
      Mousetrap.bind("up", (e) => {
        e.preventDefault();
        setSelectedIndex((prevIndex) => {
          const maxIndex = showSubMenu ? 2 : Math.min(4, notes.length - 1); // Change maxIndex to limit to 5 notes
          return prevIndex > 0 ? prevIndex - 1 : maxIndex;
        });
      });

      Mousetrap.bind("down", (e) => {
        e.preventDefault();
        setSelectedIndex((prevIndex) => {
          const maxIndex = showSubMenu ? 2 : Math.min(4, notes.length - 1); // Change maxIndex to limit to 5 notes
          return prevIndex < maxIndex ? prevIndex + 1 : 0;
        });
      });

      return () => {
        Mousetrap.unbind("up");
        Mousetrap.unbind("down");
      };
    }
  }, [isOpen, showSubMenu, notes.length]);

  // Handle specific key presses in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;

    if (key === ">") {
      setShowSubMenu(true);
    } else if (key === "Backspace" && searchTerm === ">") {
      setShowSubMenu(false);
    } else if (key === "Enter") {
      if (showSubMenu) {
        switch (selectedIndex) {
          case 0:
            handleCreateNewNote();
            break;
          case 1:
            goToSettings();
            break;
          case 2:
            toggleTheme();
            break;
        }
      } else {
        const selectedNote = notes[selectedIndex];
        handleClickNote(selectedNote);
      }
    }
  };

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return translations.card.noContent;
    }
    if (
      content.content.length === 1 &&
      content.content[0].type === "paragraph" &&
      (!content.content[0].content || content.content[0].content.length === 0)
    ) {
      return "";
    }

    const paragraphText = content.content
      .filter((node) => node.type === "paragraph")
      .map((node) => {
        if (node.content && Array.isArray(node.content)) {
          const textContent = node.content
            .filter((innerNode) => innerNode.type === "text")
            .map((innerNode) => innerNode.text)
            .join(" ");
          return textContent;
        }
        return "";
      })
      .join(" ");

    return paragraphText || translations.card.noContent;
  }

  function truncateContentPreview(
    content: JSONContent | string | JSONContent[]
  ) {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent);
    } else if (content && content.content) {
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle);
    }

    if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed top-16 shadow-xl left-0 right-0 mx-auto sm:w-2/4 w-4/5 flex flex-col items-center justify-center z-100">
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
                    <h1 className="text-lg">
                      {translations.commandprompt.newNote}
                    </h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 1
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={goToSettings}
                  >
                    <h1 className="text-lg">
                      {translations.commandprompt.settings}
                    </h1>
                  </div>
                  <div
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      selectedIndex === 2
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={toggleTheme}
                  >
                    <h1 className="text-lg">
                      {translations.commandprompt.theme}
                    </h1>
                  </div>
                </>
              ) : (
                notes.slice(0, 5).map((note, index) => ( // Limit to 5 notes
                  <div
                    key={note.id}
                    className={`note-item cursor-pointer rounded-lg p-2 ${
                      index === selectedIndex
                        ? "bg-amber-400 bg-opacity-10 text-amber-400"
                        : "hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400"
                    }`}
                    onClick={() => handleClickNote(note)}
                  >
                    <div className="w-full flex items-center justify-between">
                      <p className="text-overflow w-full flex justify-between">
                        <span>
                          {note.title || "Untitled Note"}
                          {note.isLocked && (
                            <icons.LockClosedIcon className="text-gray-600 ml-2 w-4 translate-y-[-1.5px]" />
                          )}
                        </span>
                        <span>
                          {note.updatedAt && formatTime(note.updatedAt)}{" "}
                          {/* Ensure date is formatted */}
                        </span>
                      </p>
                      {note.isLocked && (
                        <icons.LockClosedIcon className="text-gray-600 ml-2 w-4 translate-y-[-1.5px]" />
                      )}
                    </div>
                    {!note.isLocked && (
                      <p className="text-overflow text-xs">
                        {" "}
                        {note.content && truncateContentPreview(note.content)}
                      </p>
                    )}
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
