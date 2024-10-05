import React, { useState, useEffect, useMemo } from "react";
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

  const [translations, setTranslations] = useState({
    editor: {
      noNotes: "editor.noNotes",
    },
  });

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
      setSearchQuery(textAfterAt); // Initialize search query if textAfterAt is provided
    }
  }, [textAfterAt]);

  // Memoized function to filter notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5); // Limit to 5 items
  }, [searchQuery, notes]);

  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength
      ? title.substring(0, maxLength) + "..."
      : title;
  };

  return (
    <div
      className="z-50 fixed bg-white dark:bg-[#232222] shadow border-2 shadow dark:border-neutral-600 rounded-lg min-w-24 min-h-14 p-2"
      style={{ top: popupPosition.top, left: popupPosition.left }}
    >
      {filteredNotes.length === 0 ? (
        <div className="p-2 text-sm text-gray-500">{translations.editor.noNotes || "-"}</div>
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
