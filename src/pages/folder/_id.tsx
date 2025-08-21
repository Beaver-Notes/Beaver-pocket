import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Folder, Note } from "@/store/types";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import SearchBar from "@/components/home/Search";
import { useTranslation } from "@/utils/translations";
import { useNoteStore } from "@/store/note";
import { useFolderStore } from "@/store/folder";
import NoteCard from "@/components/home/NoteCard";
import Icon from "@/components/ui/Icon";
import FolderCard from "@/components/home/HomeFolderCard";

const Home: React.FC = () => {
  const [query, setQuery] = useState("");
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const folderStore = useFolderStore();
  const noteStore = useNoteStore();
  const [sortBy, setSortBy] = useState<"createdAt" | string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    sortBy === "alphabetical" ? "asc" : "desc"
  );
  const [activeLabel, setActiveLabel] = useState("");
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"note" | "folder" | null>(null);

  // Get current folder
  const currentFolder = folderId ? folderStore.getById(folderId) : null;

  // Get folder path for breadcrumbs
  const getFolderPath = (folderId: string): Folder[] => {
    const path: Folder[] = [];
    let currentId = folderId;

    while (currentId) {
      const folder = folderStore.getById(currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    return path;
  };

  const folderPath = folderId ? getFolderPath(folderId) : [];

  // Get notes and folders for current context
  const notes = Object.values(noteStore.data as Record<string, Note>);
  const allFolders = Object.values(folderStore.data as Record<string, Folder>);

  // Filter child folders
  const childFolders = allFolders.filter(
    (folder) =>
      folder.parentId === folderId && !folderStore.deletedIds?.[folder.id]
  );

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

    const currentFolderId = folderId ?? undefined;

    const processedNotes = notes.map(extractNoteContent);

    processedNotes.forEach((note) => {
      const {
        title,
        searchableContent,
        isBookmarked,
        labels,
        folderId: noteFolderId,
      } = note;

      if (noteFolderId !== currentFolderId) return; // only include notes in current folder

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
        filteredNotes.all.push(note);
        if (isBookmarked) filteredNotes.bookmarked.push(note);
      }
    });

    return filteredNotes;
  }

  // Drag and Drop functions
  const wouldCreateCircularReference = (
    draggedFolderId: string,
    targetFolderId: string
  ): boolean => {
    if (draggedFolderId === targetFolderId) return true;

    const checkDescendant = (folderId: string, ancestorId: string): boolean => {
      const folder = folderStore.getById(folderId);
      if (!folder) return false;
      if (folder.parentId === ancestorId) return true;
      if (folder.parentId) return checkDescendant(folder.parentId, ancestorId);
      return false;
    };

    return checkDescendant(targetFolderId, draggedFolderId);
  };

  const handleNoteDragStart = (event: React.DragEvent, noteId: string) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "note", id: noteId })
    );
    setDraggedNoteId(noteId);
    setDragType("note");
    event.dataTransfer.effectAllowed = "move";
  };

  const handleFolderDragStart = (event: React.DragEvent, folderId: string) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "folder", id: folderId })
    );
    setDraggedFolderId(folderId);
    setDragType("folder");
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent, targetFolderId: string) => {
    event.preventDefault();

    const dragData = event.dataTransfer.types.includes("application/json");
    if (!dragData) return;

    if (dragType === "folder" && draggedFolderId) {
      if (wouldCreateCircularReference(draggedFolderId, targetFolderId)) {
        event.dataTransfer.dropEffect = "none";
        return;
      }
    }

    setDragOverFolderId(targetFolderId);
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (
      !(event.currentTarget as Element).contains(event.relatedTarget as Node)
    ) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (event: React.DragEvent, targetFolderId: string) => {
    event.preventDefault();

    try {
      const dragData = JSON.parse(
        event.dataTransfer.getData("application/json")
      );

      if (dragData.type === "note") {
        noteStore.update(dragData.id, { folderId: targetFolderId });
      } else if (dragData.type === "folder") {
        if (!wouldCreateCircularReference(dragData.id, targetFolderId)) {
          folderStore.update(dragData.id, { parentId: targetFolderId });
        }
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDragOverFolderId(null);
    setDraggedNoteId(null);
    setDraggedFolderId(null);
    setDragType(null);
  };

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

  useEffect(() => {
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
  });

  const [translations, setTranslations] = useState<Record<string, any>>({
    home: {},
    archive: {},
    index: {},
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

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    if (!folderId && !currentFolder) return null;

    return (
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-2 px-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <button
              onClick={() => navigate("/")}
              className="hover:text-blue-600 font-medium transition-colors"
            >
              {translations.index?.home || "Home"}
            </button>
          </li>
          {folderPath.map((pathFolder, index) => (
            <React.Fragment key={pathFolder.id}>
              <li className="mx-1 text-gray-400">/</li>
              <li>
                {index < folderPath.length - 1 ? (
                  <button
                    onClick={() => navigate(`/folder/${pathFolder.id}`)}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {pathFolder.name}
                  </button>
                ) : (
                  <span className="font-medium text-gray-900">
                    {pathFolder.name}
                  </span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  };

  // Render folder header
  const renderFolderHeader = () => {
    if (!currentFolder) return null;

    return (
      <div className="flex flex-col gap-2 mb-2 px-2">
        <div className="flex items-center gap-3">
          {currentFolder.icon ? (
            <span className="text-2xl select-none">{currentFolder.icon}</span>
          ) : (
            <Icon
              name="Folder5Fill"
              className="w-6 h-6"
              style={{ color: currentFolder.color || "#6B7280" }}
            />
          )}
          <h1 className="text-2xl md:text-3xl font-bold break-words">
            {currentFolder.name}
          </h1>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const hasContent =
      childFolders.length > 0 ||
      sortedAll.length > 0 ||
      sortedBookmarked.length > 0;
    return (
      <div className="py-2 p-2 mx-4 mb-10 cursor-pointer rounded-md items-center justify-center h-full">
        {/* Folders Section */}
        {childFolders.length > 0 && (
          <div className="mb-6">
            <p className="text-lg md:text-xl font-semibold mb-3 text-gray-600 capitalize">
              {translations.index?.folders || "Folders"}
            </p>
            <div className="grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {childFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`rounded-lg transition-all duration-200 ${
                    dragOverFolderId === folder.id
                      ? "ring-2 ring-blue-400 bg-blue-50"
                      : ""
                  }`}
                  draggable
                  onDragStart={(e) => handleFolderDragStart(e, folder.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <FolderCard folder={folder} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookmarked Notes Section */}
        {sortedBookmarked.length > 0 && (
          <div className="mb-6">
            <p className="text-lg md:text-xl font-semibold mb-3 text-gray-600">
              {translations.home.bookmarked || "Bookmarked"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {sortedBookmarked.map((note) => (
                <div
                  key={note.id}
                  className={`transition-all duration-200 ${
                    draggedNoteId === note.id
                      ? "opacity-50 transform rotate-2"
                      : ""
                  }`}
                  draggable
                  onDragStart={(e) => handleNoteDragStart(e, note.id)}
                  onDragEnd={handleDragEnd}
                >
                  <NoteCard
                    note={note}
                    onUpdate={(updatedNote: Note) =>
                      noteStore.update(note.id, updatedNote)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Notes Section */}
        {(sortedAll.length > 0 ||
          (!hasContent && childFolders.length === 0)) && (
          <div>
            <p className="text-lg md:text-xl font-semibold mb-3 text-gray-600">
              {sortedAll.length > 0 ? translations.home.all || "All Notes" : ""}
            </p>

            {/* Empty State */}
            {!hasContent && (
              <div className="text-center py-12">
                <img
                  src="./imgs/Beaver.png"
                  className="w-32 md:w-48 mx-auto mb-4"
                  alt="No content"
                />
                <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
                  {currentFolder
                    ? `This folder is empty. Start adding notes or create subfolders to organize your content.`
                    : translations.home.messagePt1 ||
                      "Create your first note"}{" "}
                  <Icon name="AddFill" className="inline-block w-5 h-5" />{" "}
                  {!currentFolder &&
                    (translations.home.messagePt2 || "to get started")}
                </p>
              </div>
            )}

            {/* All Notes Grid */}
            {sortedAll.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {sortedAll.map((note) => (
                  <div
                    key={note.id}
                    className={`transition-all duration-200 ${
                      draggedNoteId === note.id
                        ? "opacity-50 transform rotate-2"
                        : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleNoteDragStart(e, note.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <NoteCard
                      note={note}
                      onUpdate={(updatedNote) =>
                        noteStore.update(note.id, updatedNote)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="overflow-y mb-12">
        <div className="w-full md:pt-4 py-2 flex flex-col border-neutral-300 overflow-auto">
          <div className="px-6">
            {renderFolderHeader()}
            {renderBreadcrumbs()}
          </div>
          {/* Search Bar */}
          <SearchBar
            searchQuery={query}
            setSearchQuery={setQuery}
            handleLabelFilterChange={setActiveLabel}
            setSortingOption={setSortBy}
            sortingOptions={sortBy}
            sortOrder={sortOrder}
            setActiveLabel={setActiveLabel}
            activeLabel={activeLabel}
            setSortOrder={setSortOrder}
          />

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Home;
