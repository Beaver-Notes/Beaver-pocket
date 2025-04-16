import React, { useState, useEffect } from "react";
import { Note } from "./store/types";
import SearchBar from "./components/Home/Search";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/it";
import { useNotesState } from "./store/Activenote";
import Icons from "./lib/remixicon-react";
import dayjs from "dayjs";
import NoteCard from "./components/Home/NoteCard";

interface ArchiveProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Archive: React.FC<ArchiveProps> = ({ notesState, setNotesState }) => {
  const { activeNoteId } = useNotesState();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      try {
        // Label filter
        const labelMatch = selectedLabel
          ? note.labels.includes(selectedLabel)
          : true;

        // Search query filter
        const titleMatch = note.title
          ? note.title.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

        const contentMatch = note.content
          ? JSON.stringify(note.content)
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : false;

        return labelMatch && (titleMatch || contentMatch);
      } catch (error) {
        console.error("Error processing note:", error);
        return false; // Skip the note if there's any error
      }
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, selectedLabel, notesState]);

  const [sortingOption] = useState("updatedAt");

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdAtB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdAtA - createdAtB;
      case "updatedAt":
      default:
        const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        return updatedAtB - updatedAtA;
    }
  });

  const handleLabelFilterChange = (selectedLabel: string) => {
    setSelectedLabel(selectedLabel); // This updates the label filter
  };

  dayjs.extend(relativeTime);

  const [translations, setTranslations] = useState({
    archive: {
      archived: "archive.archived",
      messagePt1: "archive.messagePt1",
      messagePt2: "archive.messagePt2",
      unlocktoeditor: "archive.unlocktoeditor",
      noContent: "archive.noContent",
      title: "archive.title",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  return (
    <div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          {!activeNoteId && (
            <div className="w-full md:pt-4 py-2 flex flex-col border-gray-300 overflow-auto">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleLabelFilterChange={handleLabelFilterChange}
                setSortingOption={handleLabelFilterChange}
              />
              <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
                <h2 className="text-3xl font-bold">
                  {translations.archive.archived || "-"}
                </h2>
                {notesList.filter((note) => note.isArchived).length === 0 && (
                  <div className="mx-auto">
                    <img
                      src="./imgs/Beaver-classic-mac.png"
                      className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                      alt="No content"
                    />
                    <p className="py-2 text-lg text-center">
                      {translations.archive.messagePt1 || "-"}
                      <Icons.ArchiveDrawerLineIcon className="inline-block w-5 h-5" />{" "}
                      {translations.archive.messagePt2 || "-"}
                    </p>
                  </div>
                )}
                <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
                  {notesList
                    .filter((note) => note.isArchived)
                    .map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        setNotesState={setNotesState}
                        notesState={notesState}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
