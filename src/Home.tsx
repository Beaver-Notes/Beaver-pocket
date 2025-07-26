import React, { useState, useEffect } from "react";
import { Note } from "./store/types";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import dayjs from "dayjs";
import "dayjs/locale/it";
import relativeTime from "dayjs/plugin/relativeTime";
import SearchBar from "./components/Home/Search";
import { useNotesState } from "./store/Activenote";
import { SendIntent } from "send-intent";
import { useImportBea } from "./utils/share";
import { loadNotes } from "./store/notes";
import NoteCard from "./components/Home/NoteCard";
import Icon from "./components/UI/Icon";

interface HomeProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Home: React.FC<HomeProps> = ({ notesState, setNotesState }) => {
  const { importUtils } = useImportBea();
  const { activeNoteId, setActiveNoteId } = useNotesState();
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

        // Check if the searchQuery starts with "#"
        if (searchQuery.startsWith("#")) {
          const labelQuery = searchQuery.slice(1).toLowerCase(); // Remove the "#" for comparison
          return (
            labelMatch &&
            note.labels.some((label) =>
              label.toLowerCase().includes(labelQuery)
            )
          );
        }

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

  const [sortingOption, setSortingOption] = useState("updatedAt");

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

  // catching editNote's emits

  document.addEventListener("editNote", (event: Event) => {
    const customEvent = event as CustomEvent;
    const noteId = customEvent.detail.editedNote;
    if (notesState[noteId]) {
      setActiveNoteId(noteId);
    } else {
      console.warn(`Note with ID ${noteId} does not exist.`);
    }
  });

  // catching file-embed's emits

  document.addEventListener("fileEmbedClick", async (event: Event) => {
    const customEvent = event as CustomEvent;
    const eventData = customEvent.detail;
    const { src, fileName } = eventData;

    try {
      const result = await Filesystem.getUri({
        directory: Directory.Data,
        path: src, // Assuming src contains the full path relative to the file-assets directory
      });

      const resolvedFilePath = result.uri;

      const encodedFilePath = resolvedFilePath.replace(/ /g, "%20");

      await Share.share({
        title: `Open ${fileName}`, // Title for the sharing dialog
        url: encodedFilePath, // URL to be shared
        dialogTitle: `Share ${fileName}`, // Title for the sharing dialog
      });
    } catch (error) {
      console.log(`Error sharing ${fileName}: ${(error as any).message}`);
    }
  });

  // Helper function to prompt the user for a password

  dayjs.extend(relativeTime);

  // Translations
  const [translations, setTranslations] = useState({
    home: {
      bookmarked: "home.bookmarked",
      all: "home.all",
      messagePt1: "home.messagePt1",
      messagePt2: "home.messagePt2",
      messagePt3: "home.messagePt3",
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

  function normalizeFilePath(encodedUrl: any) {
    try {
      // Decode the URL
      let decodedUrl = decodeURIComponent(encodedUrl);

      // Replace specific URL encoding for 'file://'
      if (decodedUrl.startsWith("file%3A%2F%2F")) {
        decodedUrl = decodedUrl.replace("file%3A%2F%2F", "file://");
      }

      return decodedUrl;
    } catch (err) {
      console.error("Error normalizing file path:", err);
      return ""; // Return empty string or handle gracefully
    }
  }
  const handleSendIntent = () => {
    SendIntent.checkSendIntentReceived()
      .then((result) => {
        if (result) {
          console.log("SendIntent Result:", result);

          if (result.url) {
            const normalizedUrl = normalizeFilePath(result.url);
            console.log("Normalized URL:", normalizedUrl);

            // Read the file and decode its content
            Filesystem.readFile({
              path: normalizedUrl,
              encoding: Encoding.UTF8, // Explicitly specify UTF-8 encoding
            })
              .then((content) => {
                if (typeof content.data === "string") {
                  // Safe to use as a string
                  importUtils(
                    setNotesState,
                    async () => await loadNotes(),
                    content.data
                  );
                } else if (content.data instanceof Blob) {
                  // Convert Blob to a string
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const textContent = event.target?.result as string;
                    importUtils(
                      setNotesState,
                      async () => await loadNotes(),
                      textContent
                    );
                  };
                  reader.onerror = (error) => {
                    console.error("Error reading Blob content:", error);
                    alert("Failed to process file content.");
                  };
                  reader.readAsText(content.data);
                } else {
                  console.error(
                    "Unexpected content.data type:",
                    typeof content.data
                  );
                  alert("Unexpected file format. Please try another file.");
                }
              })
              .catch((readError) => {
                console.error("Error reading file:", readError);
                alert("Failed to read the file. Please check the file path.");
              });
          } else {
            console.error("Result does not contain 'url'.");
            alert("No file URL found in the intent result.");
          }
        } else {
          console.warn("No SendIntent result received.");
        }
      })
      .catch((intentError) => {
        console.error("Error checking send intent:", intentError);
        alert("Failed to check the send intent. Please try again.");
      });
  };

  useEffect(() => {
    // Attach event listener for SendIntent
    window.addEventListener("sendIntentReceived", handleSendIntent);

    return () => {
      // Cleanup listener
      window.removeEventListener("sendIntentReceived", handleSendIntent);
    };
  }, []);

  return (
    <div>
      <div className="overflow-y mb-12">
        {!activeNoteId && (
          <div className="w-full md:pt-4 py-2 flex flex-col border-neutral-300 overflow-auto">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleLabelFilterChange={handleLabelFilterChange}
              setSortingOption={setSortingOption}
            />
            <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
              {notesList.filter((note) => note.isBookmarked && !note.isArchived)
                .length > 0 && (
                <h2 className="text-3xl font-bold">
                  {translations.home.bookmarked || "-"}
                </h2>
              )}
              <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
                {notesList
                  .filter((note) => note.isBookmarked && !note.isArchived)
                  .map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      setNotesState={setNotesState}
                      notesState={notesState}
                    />
                  ))}
              </div>
              <h2 className="text-3xl font-bold">
                {translations.home.all || "-"}
              </h2>
              {notesList.length === 0 && (
                <div className="mx-auto">
                  <img
                    src="./imgs/Beaver.png"
                    className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                    alt="No content"
                  />
                  <p className="py-2 text-lg text-center">
                    {translations.home.messagePt1 || "-"}
                    <Icon
                      name="AddFill"
                      className="inline-block w-5 h-5"
                    />{" "}
                    {translations.home.messagePt2 || "-"}
                  </p>
                </div>
              )}
              <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg-grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
                {notesList
                  .filter((note) => !note.isBookmarked && !note.isArchived)
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
  );
};

export default Home;
