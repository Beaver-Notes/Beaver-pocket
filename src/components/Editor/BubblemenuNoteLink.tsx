import React, { useState, useEffect, useMemo } from "react";
import { Note } from "../../store/types";
import Mousetrap from "mousetrap";

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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0); // Track keyboard focus
  const [translations, setTranslations] = useState({
    editor: {
      noNotes: "editor.noNotes",
    },
    accessibility: {
      filterednotes: "accessibility.filterednotes"
    },
  });

  // Load translations based on language setting
  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations((prevTranslations) => ({
          ...prevTranslations,
          ...translationModule.default,
        }));
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  useEffect(() => {
    if (textAfterAt !== null) {
      setSearchQuery(textAfterAt);
    }
  }, [textAfterAt]);

  const filteredNotes = useMemo(() => {
    const results = notes
      .filter(
        (note) =>
          note.title &&
          note.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5);

    return results;
  }, [searchQuery, notes]);

  // Handle keyboard navigation
  useEffect(() => {
    Mousetrap.bind("down", () => {
      setHighlightedIndex((prevIndex) =>
        Math.min(prevIndex + 1, filteredNotes.length - 1)
      );
    });

    Mousetrap.bind("up", () => {
      setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    });

    Mousetrap.bind("enter", () => {
      if (filteredNotes.length > 0) {
        onClickNote(filteredNotes[highlightedIndex]);
      }
    });

    return () => {
      Mousetrap.unbind("down");
      Mousetrap.unbind("up");
      Mousetrap.unbind("enter");
    };
  }, [highlightedIndex, filteredNotes, onClickNote]);

  return (
    <div
      className="bubblemenu z-50 fixed bg-white dark:bg-[#232222] shadow border-2 dark:border-neutral-600 rounded-lg min-w-24 min-h-14 p-2"
      role="listbox"
      aria-activedescendant={`note-option-${highlightedIndex}`} // Highlighted option
      aria-label={translations.accessibility.filterednotes}
    >
      {filteredNotes.length === 0 ? (
        <div className="p-2 text-sm text-neutral-500" role="alert">
          {translations.editor.noNotes}
        </div>
      ) : (
        filteredNotes.map((note, index) => (
          <div
            id={`note-option-${index}`}
            key={note.id}
            role="option"
            aria-selected={highlightedIndex === index}
            className={`p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer ${
              highlightedIndex === index
                ? "bg-neutral-200 dark:bg-neutral-600"
                : ""
            }`}
            onClick={() => {
              onClickNote(note);
            }}
            onMouseOver={() => setHighlightedIndex(index)} // To highlight on hover
          >
            <span className="block w-52 truncate" title={note.title}>
              {note.title}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default BubblemenuNoteLink;
