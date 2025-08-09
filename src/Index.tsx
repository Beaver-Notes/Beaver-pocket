import React, { useState, useEffect } from "react";
import { Note } from "./store/types";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import SearchBar from "./components/home/Search";
import { useTranslation } from "./utils/translations";
import { SendIntent } from "send-intent";
import { ImportBEA } from "./utils/share/BEA";
import { useNoteStore } from "./store/note";
import NoteCard from "./components/home/NoteCard";
import Icon from "./components/ui/Icon";

interface HomeProps {
  showArchived?: boolean; 
}

const Home: React.FC<HomeProps> = ({ showArchived = false }) => {
  const noteStore = useNoteStore();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | string>("createdAt");
  const [activeLabel, setActiveLabel] = useState("");

  const notes = Object.values(noteStore.data as Record<string, Note>);

  function extractNoteText(content: any): string {
    if (typeof content === "string") {
      return content;
    }

    if (content && typeof content === "object") {
      
      if (content.content && Array.isArray(content.content)) {
        return extractTextFromNodes(content.content);
      }

      
      if (content.content) {
        return extractNoteText(content.content);
      }
    }

    return "";
  }

  function extractTextFromNodes(nodes: any[]): string {
    let text = "";

    for (const node of nodes) {
      if (node.type === "text" && node.text) {
        text += node.text;
      } else if (node.content && Array.isArray(node.content)) {
        text += extractTextFromNodes(node.content);
      }

      
      if (node.type === "paragraph" || node.type === "heading") {
        text += " ";
      }
    }

    return text;
  }

  function extractNoteContent(
    note: Note
  ): Note & { searchableContent: string } {
    const searchableContent = extractNoteText(note.content).toLowerCase();
    return { ...note, searchableContent };
  }

  function sortArray<T>(
    data: T[],
    sortBy: string,
    order: "asc" | "desc" = "desc"
  ): T[] {
    const sorted = [...data].sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }

      
      return String(aVal).localeCompare(String(bVal));
    });

    return order === "desc" ? sorted.reverse() : sorted;
  }

  function filterNotes(notes: Note[] = [], query: string, activeLabel: string) {
    const filteredNotes = {
      all: [] as Note[],
      archived: [] as Note[],
      bookmarked: [] as Note[],
    };

    const processedNotes = notes.map(extractNoteContent);

    processedNotes.forEach((note) => {
      const {
        title,
        searchableContent,
        isArchived,
        isBookmarked,
        labels,
        folderId,
      } = note;

      if (folderId !== null && folderId !== undefined) return;

      const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));

      const labelFilter = activeLabel
        ? sortedLabels.includes(activeLabel)
        : true;

      const queryLower = query.toLowerCase();

      const isMatch = queryLower.startsWith("#")
        ? sortedLabels.some((label) =>
            label?.toLowerCase().includes(queryLower.substring(1))
          )
        : sortedLabels.some((label) =>
            label?.toLowerCase().includes(queryLower)
          ) ||
          (title?.toLowerCase().includes(queryLower) ?? false) ||
          (searchableContent?.includes(queryLower) ?? false);

      if (isMatch && labelFilter) {
        if (isArchived) {
          filteredNotes.archived.push(note);
        } else if (isBookmarked) {
          filteredNotes.bookmarked.push(note);
        } else {
          filteredNotes.all.push(note);
        }
      }
    });

    return filteredNotes;
  }

  
  const filteredNotes = filterNotes(notes, query, activeLabel);

  
  const sortedAll = sortArray(
    filteredNotes.all,
    sortBy === "alphabetical" ? "title" : sortBy,
    sortBy === "createdAt" ? "asc" : "desc"
  );
  const sortedBookmarked = sortArray(
    filteredNotes.bookmarked,
    sortBy === "alphabetical" ? "title" : sortBy,
    sortBy === "createdAt" ? "asc" : "desc"
  );
  const sortedArchived = sortArray(
    filteredNotes.archived,
    sortBy === "alphabetical" ? "title" : sortBy,
    sortBy === "createdAt" ? "asc" : "desc"
  );

  const handleLabelFilterChange = (selectedLabel: string) => {
    setActiveLabel(selectedLabel);
  };

  
  useEffect(() => {
    if (showArchived) return;

    const handleFileEmbedClick = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;
      const { src, fileName } = eventData;

      try {
        const result = await Filesystem.getUri({
          directory: Directory.Data,
          path: src,
        });

        const resolvedFilePath = result.uri;
        const encodedFilePath = resolvedFilePath.replace(/ /g, "%20");

        await Share.share({
          title: `Open ${fileName}`,
          url: encodedFilePath,
          dialogTitle: `Share ${fileName}`,
        });
      } catch (error) {
        console.log(`Error sharing ${fileName}: ${(error as any).message}`);
      }
    };

    document.addEventListener("fileEmbedClick", handleFileEmbedClick);

    return () => {
      document.removeEventListener("fileEmbedClick", handleFileEmbedClick);
    };
  }, [showArchived]);

  
  const [translations, setTranslations] = useState<Record<string, any>>({
    home: {},
    archive: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  function normalizeFilePath(encodedUrl: any) {
    try {
      let decodedUrl = decodeURIComponent(encodedUrl);

      if (decodedUrl.startsWith("file%3A%2F%2F")) {
        decodedUrl = decodedUrl.replace("file%3A%2F%2F", "file://");
      }

      return decodedUrl;
    } catch (err) {
      console.error("Error normalizing file path:", err);
      return "";
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

            Filesystem.readFile({
              path: normalizedUrl,
              encoding: Encoding.UTF8,
            })
              .then((content) => {
                if (typeof content.data === "string") {
                  ImportBEA(content.data); 
                } else if (content.data instanceof Blob) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const textContent = event.target?.result as string;
                    alert("test 2");
                    ImportBEA(textContent);
                  };
                  reader.onerror = (error) => {
                    console.error("Error reading Blob content:", error);
                    alert("Failed to process file content.");
                  };
                  reader.readAsText(content.data);
                } else {
                  alert("Unexpected content.data type");
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
    if (showArchived) return;

    window.addEventListener("sendIntentReceived", handleSendIntent);

    return () => {
      window.removeEventListener("sendIntentReceived", handleSendIntent);
    };
  }, [showArchived]);

  
  const renderContent = () => {
    if (showArchived) {
      
      return (
        <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
          <h2 className="text-3xl font-bold mb-4">
            {translations.archive.archived || "Archived"}
          </h2>

          {sortedArchived.length === 0 && (
            <div className="mx-auto text-center">
              <img
                src="./imgs/Beaver-classic-mac.png"
                className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
                alt="No content"
              />
              <p className="py-2 text-lg">
                {translations.archive.messagePt1 || "No archived notes"}{" "}
                <Icon
                  name="ArchiveDrawerLine"
                  className="inline-block w-5 h-5"
                />{" "}
                {translations.archive.messagePt2 || ""}
              </p>
            </div>
          )}

          <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
            {sortedArchived.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={(updatedNote: Note) =>
                  noteStore.update(note.id, updatedNote)
                }
              />
            ))}
          </div>
        </div>
      );
    }

    
    return (
      <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
        {/* Bookmarked Notes Section */}
        {sortedBookmarked.length > 0 && (
          <>
            <h2 className="text-3xl font-bold mb-4">
              {translations.home.bookmarked || "Bookmarked"}
            </h2>
            <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center mb-8">
              {sortedBookmarked.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={(updatedNote: Note) =>
                    noteStore.update(note.id, updatedNote)
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* All Notes Section */}
        <h2 className="text-3xl font-bold mb-4">
          {translations.home.all || "All Notes"}
        </h2>

        {/* Empty State */}
        {sortedAll.length === 0 && sortedBookmarked.length === 0 && (
          <div className="mx-auto text-center">
            <img
              src="./imgs/Beaver.png"
              className="max-w-auto sm:w-1/3 mx-auto flex justify-center items-center"
              alt="No content"
            />
            <p className="py-2 text-lg">
              {translations.home.messagePt1 || "Create your first note"}{" "}
              <Icon name="AddFill" className="inline-block w-5 h-5" />{" "}
              {translations.home.messagePt2 || "to get started"}
            </p>
          </div>
        )}

        {/* All Notes Grid */}
        <div className="grid py-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
          {sortedAll.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={(updatedNote) => noteStore.update(note.id, updatedNote)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="overflow-y mb-12">
        <div className="w-full md:pt-4 py-2 flex flex-col border-neutral-300 overflow-auto">
          <SearchBar
            searchQuery={query}
            setSearchQuery={setQuery}
            handleLabelFilterChange={handleLabelFilterChange}
            setSortingOption={setSortBy}
          />
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Home;
