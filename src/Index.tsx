import React, { useState, useEffect, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { getEmptyImage } from "react-dnd-html5-backend";
import { sortArray, extractNoteText } from "@/utils/helper";
import { Folder, Note } from "./store/types";
import { Filesystem, Encoding } from "@capacitor/filesystem";
import SearchBar from "./components/home/Search";
import { useTranslation } from "./utils/translations";
import { SendIntent } from "send-intent";
import { ImportBEA } from "./utils/share/BEA";
import { useNoteStore } from "./store/note";
import { useFolderStore } from "./store/folder";
import NoteCard from "./components/home/NoteCard";
import Icon from "./components/ui/Icon";
import FolderCard from "./components/home/HomeFolderCard";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { IconName } from "./lib/remixicon-react";

const isTouchDevice = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;
const ItemTypes = { NOTE: "note", FOLDER: "folder" };

interface DragItem {
  type: string;
  id: string;
  item: Note | Folder;
}

interface HomeProps {
  showArchived?: boolean;
}

const CustomDragLayer: React.FC<{
  onUpdate?: (item: any) => void;
}> = ({ onUpdate }) => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    })
  );

  if (!isDragging || !currentOffset) {
    return null;
  }

  const transform = `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)`;

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        inset: 0, // fills viewport
        overflow: "hidden", // clip preview so it can't grow the viewport
        transform, // translate3d prevents layout jank
        contain: "layout paint size", // isolates layout (helps prevent scrollbars)
      }}
      className="opacity-90"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl border-2 border-primary shadow-xl"
        style={{ maxWidth: "min(420px, 90vw)" }} // keep preview from being wider than viewport
      >
        {itemType === ItemTypes.NOTE ? (
          <NoteCard note={item?.item as Note} onUpdate={onUpdate!} />
        ) : (
          <FolderCard folder={item?.item as Folder} />
        )}
      </div>
    </div>
  );
};

const useDragEffects = (isDragging: boolean) => {
  const scrollRef = useRef<NodeJS.Timeout | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoScroll = useCallback((clientY: number) => {
    const threshold = 100;
    const viewportHeight = window.innerHeight;

    if (scrollRef.current) clearInterval(scrollRef.current);

    if (clientY < threshold || clientY > viewportHeight - threshold) {
      const direction = clientY < threshold ? -1 : 1;
      const speed = Math.max(
        1,
        Math.abs(clientY - (clientY < threshold ? 0 : viewportHeight)) / 20
      );

      setIsScrolling(true);

      scrollRef.current = setInterval(() => {
        window.scrollBy(0, direction * speed * 10);
      }, 16);

      // Clear scrolling flag after a delay
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 100);
    } else {
      setIsScrolling(false);
    }
  }, []);

  const stopScroll = useCallback(() => {
    if (scrollRef.current) {
      clearInterval(scrollRef.current);
      scrollRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setIsScrolling(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    setIsAnimating(true);
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      if (clientY) autoScroll(clientY);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      stopScroll();
      setTimeout(() => setIsAnimating(false), 200);
    };
  }, [isDragging, autoScroll, stopScroll]);

  return { isAnimating, stopScroll, isScrolling };
};

const DraggableItem: React.FC<{
  item: Note | Folder;
  type: string;
  onUpdate?: (item: any) => void;
  onNoteDrop?: (noteId: string, folderId: string) => void;
  onFolderDrop?: (draggedId: string, targetId: string) => void;
  folderStore?: any;
}> = ({ item, type, onUpdate, onNoteDrop, onFolderDrop, folderStore }) => {
  const dropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [preventDrop, setPreventDrop] = useState(false);

  // Touch gesture detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const isDragIntentRef = useRef(false);
  const [shouldAllowDrag, setShouldAllowDrag] = useState(true);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isDragIntentRef.current = false;
    setShouldAllowDrag(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    // If vertical movement is dominant and happens quickly, it's likely a scroll gesture
    if (deltaY > deltaX && deltaY > 10 && deltaTime < 300) {
      setShouldAllowDrag(false);
      isDragIntentRef.current = false;
    }
    // If horizontal movement or held long enough, allow drag
    else if (deltaX > deltaY || deltaTime > 300) {
      isDragIntentRef.current = true;
      setShouldAllowDrag(true);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    // Reset after a short delay to allow for drag operations
    setTimeout(() => {
      setShouldAllowDrag(true);
      isDragIntentRef.current = false;
    }, 100);
  };

  const [{ isDragging }, drag, preview] = useDrag({
    type,
    item: { type, id: item.id, item },
    canDrag: () => {
      // On touch devices, only allow drag if gesture analysis indicates drag intent
      if (isTouchDevice()) {
        return shouldAllowDrag && isDragIntentRef.current;
      }
      return true;
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (_draggedItem, monitor) => {
      if (monitor.didDrop() && "vibrate" in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    },
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.NOTE, ItemTypes.FOLDER],
    drop: (dragItem: DragItem, _monitor) => {
      // Prevent drop if we were recently scrolling
      if (preventDrop) return;

      // Add a small delay to ensure we're not in the middle of a scroll
      if (dropTimeoutRef.current) return;

      dropTimeoutRef.current = setTimeout(() => {
        if (type === ItemTypes.FOLDER) {
          if (dragItem.type === ItemTypes.NOTE) {
            onNoteDrop?.(dragItem.id, item.id);
          } else if (
            !folderStore?.wouldCreateCircularReference(dragItem.id, item.id)
          ) {
            onFolderDrop?.(dragItem.id, item.id);
          }
        }
        dropTimeoutRef.current = null;
      }, 50);
    },
    canDrop: (dragItem: DragItem) =>
      !preventDrop &&
      type === ItemTypes.FOLDER &&
      (dragItem.type === ItemTypes.NOTE ||
        !folderStore?.wouldCreateCircularReference(dragItem.id, item.id)),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const { isAnimating, stopScroll, isScrolling } = useDragEffects(isDragging);

  // Update preventDrop based on scrolling state
  useEffect(() => {
    setPreventDrop(isScrolling);
  }, [isScrolling]);

  useEffect(() => {
    if (!isTouchDevice()) {
      preview(getEmptyImage(), { captureDraggingState: true });
    }
  }, [preview]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current);
      }
    };
  }, []);

  const dragClass = isDragging
    ? "opacity-50 transform-gpu transition-all duration-200 ease-out"
    : "";

  // Don't show drop visual feedback if we're preventing drops
  const dropClass =
    isOver && canDrop && !preventDrop ? "ring-2 ring-primary" : "";

  const animClass =
    isAnimating && !isDragging
      ? "transform transition-transform duration-300 ease-out"
      : "";

  const cursorClass = isDragging
    ? "cursor-grabbing"
    : canDrop && isOver && !preventDrop
    ? "cursor-copy"
    : "cursor-grab";

  return (
    <div
      ref={(node) => {
        drag(node);
        if (type === ItemTypes.FOLDER) drop(node);
      }}
      data-folder-id={type === ItemTypes.FOLDER ? item.id : undefined}
      className={`h-full rounded-xl ${dragClass} ${dropClass} ${animClass} ${cursorClass}`}
      style={{
        transformOrigin: "center center",
      }}
      onDragEnd={stopScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="h-full transition-all duration-200">
        {type === ItemTypes.NOTE ? (
          <NoteCard note={item as Note} onUpdate={onUpdate!} />
        ) : (
          <FolderCard folder={item as Folder} />
        )}
      </div>
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ showArchived = false }) => {
  const folderStore = useFolderStore();
  const noteStore = useNoteStore();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    sortBy === "alphabetical" ? "asc" : "desc"
  );
  const [activeLabel, setActiveLabel] = useState("");
  const [translations, setTranslations] = useState<Record<string, any>>({
    home: {},
    archive: {},
  });
  const navigate = useNavigate();

  useEffect(() => {
    App.addListener("appUrlOpen", ({ url }) => {
      const m = url.match(/beaver:\/\/note\/(.+)$/);
      if (m) navigate(`/note/${m[1]}`);
    });

    const onSpotOpen = (ev: any) =>
      ev?.detail?.id && navigate(`/note/${ev.detail.id}`);
    window.addEventListener("spotsearchOpen", onSpotOpen);

    const params = new URLSearchParams(window.location.search);
    const label = params.get("label");
    if (label) setActiveLabel(decodeURIComponent(label));

    return () => window.removeEventListener("spotsearchOpen", onSpotOpen);
  }, [navigate]);

  const notes = Object.values(noteStore.data as Record<string, Note>);

  const filterNotes = (
    notes: Note[] = [],
    query: string,
    activeLabel: string
  ) => {
    const result = {
      all: [] as Note[],
      archived: [] as Note[],
      bookmarked: [] as Note[],
    };

    notes.forEach((note) => {
      if (note.folderId !== null && note.folderId !== undefined) return;

      const text = extractNoteText(note.content).toLowerCase();
      const labels = [...note.labels].sort((a, b) => a.localeCompare(b));
      const queryLower = query.toLowerCase();

      const labelMatch = !activeLabel || labels.includes(activeLabel);
      const textMatch = queryLower.startsWith("#")
        ? labels.some((l) => l?.toLowerCase().includes(queryLower.substring(1)))
        : labels.some((l) => l?.toLowerCase().includes(queryLower)) ||
          note.title?.toLowerCase().includes(queryLower) ||
          text.includes(queryLower);

      if (textMatch && labelMatch) {
        if (note.isArchived) result.archived.push(note);
        else if (note.isBookmarked) result.bookmarked.push(note);
        else result.all.push(note);
      }
    });
    return result;
  };

  const filterFolders = (folders: Folder[] = [], query: string) => {
    const queryLower = query.toLowerCase();
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(queryLower)
    );
  };

  const handleNoteDrop = useCallback(
    (noteId: string, folderId: string) => {
      noteStore.update(noteId, { folderId });

      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    },
    [noteStore]
  );

  const handleFolderDrop = useCallback(
    (draggedId: string, targetId: string) => {
      if (!folderStore.wouldCreateCircularReference(draggedId, targetId)) {
        folderStore.update(draggedId, { parentId: targetId });

        if ("vibrate" in navigator) navigator.vibrate([80, 40, 80, 40, 80]);
      }
    },
    [folderStore]
  );

  useEffect(() => {
    if (showArchived) return;

    const handleSendIntent = () => {
      SendIntent.checkSendIntentReceived().then((result) => {
        if (result?.url) {
          const normalizedUrl = decodeURIComponent(result.url).replace(
            "file%3A%2F%2F",
            "file://"
          );
          Filesystem.readFile({ path: normalizedUrl, encoding: Encoding.UTF8 })
            .then((content) => {
              if (typeof content.data === "string") ImportBEA(content.data);
              else if (content.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = (e) => ImportBEA(e.target?.result as string);
                reader.readAsText(content.data);
              }
            })
            .catch(() => console.log("Failed to read shared file"));
        }
      });
    };

    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };

    window.addEventListener("sendIntentReceived", handleSendIntent);
    fetchTranslations();

    return () =>
      window.removeEventListener("sendIntentReceived", handleSendIntent);
  }, [showArchived]);

  const filteredNotes = filterNotes(notes, query, activeLabel);
  const sortedAll = sortArray({
    data: filteredNotes.all,
    key: sortBy === "alphabetical" ? "title" : sortBy,
    order: sortOrder,
  });
  const sortedBookmarked = sortArray({
    data: filteredNotes.bookmarked,
    key: sortBy === "alphabetical" ? "title" : sortBy,
    order: sortOrder,
  });
  const sortedArchived = sortArray({
    data: filteredNotes.archived,
    key: sortBy === "alphabetical" ? "title" : sortBy,
    order: sortOrder,
  });
  const rootFolders = folderStore.rootFolders(useFolderStore.getState());
  const filteredFolders = query
    ? filterFolders(rootFolders, query)
    : rootFolders;

  const sortedFolders = sortArray({
    data: filteredFolders,
    key: sortBy === "alphabetical" ? "title" : sortBy,
    order: sortOrder,
  });

  const renderGrid = (items: any[], type: string, title?: string) =>
    items.length > 0 && (
      <>
        {title && <p className="text-2xl font-bold mb-4">{title}</p>}
        <div
          className={`grid py-2 gap-2 rounded-md items-center justify-center ${
            type === ItemTypes.FOLDER
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
          } ${
            type === ItemTypes.NOTE && title === translations.home.bookmarked
              ? "mb-8"
              : ""
          }`}
        >
          {items.map((item) => (
            <DraggableItem
              key={item.id}
              item={item}
              type={type}
              onUpdate={
                type === ItemTypes.NOTE
                  ? (updated) => noteStore.update(item.id, updated)
                  : undefined
              }
              onNoteDrop={
                type === ItemTypes.FOLDER ? handleNoteDrop : undefined
              }
              onFolderDrop={
                type === ItemTypes.FOLDER ? handleFolderDrop : undefined
              }
              folderStore={type === ItemTypes.FOLDER ? folderStore : undefined}
            />
          ))}
        </div>
      </>
    );

  const emptyState = (
    img: string,
    message1: string,
    message2: string,
    icon: string
  ) => (
    <div className="flex flex-col justify-center min-h-full max-h-screen items-center text-center">
      <img src={img} className="block mx-auto sm:w-1/3" alt="No content" />
      <p className="py-2 text-lg">
        {message1}{" "}
        <Icon name={icon as IconName} className="inline-block w-5 h-5" />{" "}
        {message2}
      </p>
    </div>
  );

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <CustomDragLayer />
      <div className="overflow-x-hidden overflow-y-auto mb-12">
        <div className="w-full md:pt-4  p-2 py-2 flex flex-col border-neutral-300 overflow-y-auto overflow-x-hidden">
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

          <div className="py-2 mx-4 mb-10 rounded-md items-center justify-center h-full">
            {showArchived ? (
              <>
                <h2 className="text-3xl font-bold mb-4">
                  {translations.archive.archived || "Archived"}
                </h2>
                {sortedArchived.length === 0
                  ? emptyState(
                      "./imgs/archive.png",
                      translations.archive.messagePt1 || "No archived notes",
                      translations.archive.messagePt2 || "",
                      "ArchiveDrawerLine"
                    )
                  : renderGrid(sortedArchived, ItemTypes.NOTE)}
              </>
            ) : (
              <>
                {renderGrid(
                  sortedFolders,
                  ItemTypes.FOLDER,
                  sortedFolders.length > 0 ? "Folders" : undefined
                )}
                {renderGrid(
                  sortedBookmarked,
                  ItemTypes.NOTE,
                  sortedBookmarked.length > 0
                    ? translations.home.bookmarked || "Bookmarked"
                    : undefined
                )}
                <p className="text-2xl font-bold mb-4">
                  {translations.home.all || "All Notes"}
                </p>
                {sortedAll.length === 0 && sortedBookmarked.length === 0
                  ? emptyState(
                      "./imgs/home.png",
                      translations.home.messagePt1 || "Create your first note",
                      translations.home.messagePt2 || "to get started",
                      "AddFill"
                    )
                  : renderGrid(sortedAll, ItemTypes.NOTE)}
              </>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default Home;
