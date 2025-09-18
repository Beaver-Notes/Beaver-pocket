import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Folder, Note } from "@/store/types";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import SearchBar from "@/components/home/Search";
import { useTranslation } from "@/utils/translations";
import { useNoteStore } from "@/store/note";
import { useFolderStore } from "@/store/folder";
import NoteCard from "@/components/home/HomeNoteCard";
import Icon from "@/components/ui/Icon";
import FolderCard from "@/components/home/HomeFolderCard";
import folderIcon from "../../../public/imgs/folder.png";

const isTouchDevice = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;
const ItemTypes = { NOTE: "note", FOLDER: "folder" } as const;

type DragKind = (typeof ItemTypes)[keyof typeof ItemTypes];

interface DragItem {
  type: DragKind;
  id: string;
  item: Note | Folder;
}

function extractTextFromNodes(nodes: any[]): string {
  let text = "";
  for (const node of nodes) {
    if (node.type === "text" && node.text) text += node.text;
    else if (node.content && Array.isArray(node.content))
      text += extractTextFromNodes(node.content);
    if (node.type === "paragraph" || node.type === "heading") text += " ";
  }
  return text;
}

function extractNoteText(content: any): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    if (content.content && Array.isArray(content.content))
      return extractTextFromNodes(content.content);
    if (content.content) return extractNoteText(content.content);
  }
  return "";
}

function extractNoteContent(note: Note): Note & { searchableContent: string } {
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
    if (typeof aVal === "string" && typeof bVal === "string")
      return aVal.localeCompare(bVal);
    if (typeof aVal === "number" && typeof bVal === "number")
      return aVal - bVal;
    return String(aVal).localeCompare(String(bVal));
  });
  return order === "desc" ? sorted.reverse() : sorted;
}

const CustomDragLayer: React.FC<{ onUpdate?: (item: any) => void }> = ({
  onUpdate,
}) => {
  const { itemType, isDragging, item, currentOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType() as DragKind | null,
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    })
  );

  if (!isDragging || !currentOffset) return null;
  const transform = `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)`;

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        inset: 0,
        transform,
      }}
      className="opacity-90"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl border-2 border-primary shadow-xl"
        style={{ maxWidth: "min(420px, 90vw)" }}
      >
        {itemType === ItemTypes.NOTE ? (
          <NoteCard
            note={(item as DragItem)?.item as Note}
            onUpdate={onUpdate!}
          />
        ) : (
          <FolderCard folder={(item as DragItem)?.item as Folder} />
        )}
      </div>
    </div>
  );
};

const useDragEffects = (isDragging: boolean) => {
  const scrollRef = useRef<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const autoScroll = useCallback((clientY: number) => {
    const threshold = 100;
    const viewportHeight = window.innerHeight;

    if (scrollRef.current) window.clearInterval(scrollRef.current);

    if (clientY < threshold || clientY > viewportHeight - threshold) {
      const direction = clientY < threshold ? -1 : 1;
      const speed = Math.max(
        1,
        Math.abs(clientY - (clientY < threshold ? 0 : viewportHeight)) / 20
      );

      setIsScrolling(true);
      scrollRef.current = window.setInterval(
        () => window.scrollBy(0, direction * speed * 10),
        16
      );

      if (scrollTimeoutRef.current)
        window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(
        () => setIsScrolling(false),
        100
      );
    } else {
      setIsScrolling(false);
    }
  }, []);

  const stopScroll = useCallback(() => {
    if (scrollRef.current) {
      window.clearInterval(scrollRef.current);
      scrollRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setIsScrolling(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY =
        "touches" in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (clientY) autoScroll(clientY);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      stopScroll();
    };
  }, [isDragging, autoScroll, stopScroll]);

  return { stopScroll, isScrolling };
};

const DraggableItem: React.FC<{
  item: Note | Folder;
  type: DragKind;
  onUpdate?: (item: any) => void;
  onNoteDrop?: (noteId: string, folderId: string) => void;
  onFolderDrop?: (draggedId: string, targetId: string) => void;
  folderStore?: any;
}> = ({ item, type, onUpdate, onNoteDrop, onFolderDrop, folderStore }) => {
  const [preventDrop, setPreventDrop] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const isDragIntentRef = useRef(false);
  const [shouldAllowDrag, setShouldAllowDrag] = useState(true);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    isDragIntentRef.current = false;
    setShouldAllowDrag(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;
    if (dy > dx && dy > 10 && dt < 300) {
      setShouldAllowDrag(false);
      isDragIntentRef.current = false;
    } else if (dx > dy || dt > 300) {
      isDragIntentRef.current = true;
      setShouldAllowDrag(true);
    }
  };
  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setTimeout(() => {
      setShouldAllowDrag(true);
      isDragIntentRef.current = false;
    }, 100);
  };

  const [{ isDragging }, drag, preview] = useDrag({
    type,
    item: { type, id: (item as any).id, item },
    canDrag: () =>
      isTouchDevice() ? shouldAllowDrag && isDragIntentRef.current : true,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (_draggedItem, monitor) => {
      if (monitor.didDrop() && "vibrate" in navigator)
        (navigator as any).vibrate?.([50, 50, 50]);
    },
  });

  const [{ isOver, canDrop }, drop] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: [ItemTypes.NOTE, ItemTypes.FOLDER],
    drop: (dragItem) => {
      if (preventDrop) return;
      if (type === ItemTypes.FOLDER) {
        if (dragItem.type === ItemTypes.NOTE)
          onNoteDrop?.(dragItem.id, (item as Folder).id);
        else if (
          !folderStore?.wouldCreateCircularReference(
            dragItem.id,
            (item as Folder).id
          )
        )
          onFolderDrop?.(dragItem.id, (item as Folder).id);
      }
    },
    canDrop: (dragItem) =>
      !preventDrop &&
      type === ItemTypes.FOLDER &&
      (dragItem.type === ItemTypes.NOTE ||
        !folderStore?.wouldCreateCircularReference(
          dragItem.id,
          (item as Folder).id
        )),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const { stopScroll, isScrolling } = useDragEffects(isDragging);
  useEffect(() => setPreventDrop(isScrolling), [isScrolling]);
  useEffect(() => {
    if (!isTouchDevice())
      preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const dragClass = isDragging
    ? "opacity-50 transform-gpu transition-all duration-200 ease-out"
    : "";
  const dropClass =
    isOver && canDrop && !preventDrop ? "ring-2 ring-primary" : "";
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
      className={`rounded-xl ${dragClass} ${dropClass} ${cursorClass}`}
      onDragEnd={stopScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {type === ItemTypes.NOTE ? (
        <NoteCard note={item as Note} onUpdate={onUpdate!} />
      ) : (
        <FolderCard folder={item as Folder} />
      )}
    </div>
  );
};

const FolderPage: React.FC = () => {
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
  const [translations, setTranslations] = useState<Record<string, any>>({
    home: {},
    archive: {},
    index: {},
  });

  const currentFolder = folderId ? folderStore.getById(folderId) : null;

  const getFolderPath = (fid: string): Folder[] => {
    const path: Folder[] = [];
    let currentId = fid;
    while (currentId) {
      const folder = folderStore.getById(currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else break;
    }
    return path;
  };
  const folderPath = folderId ? getFolderPath(folderId) : [];

  const notes = Object.values(noteStore.data as Record<string, Note>);
  const allFolders = Object.values(folderStore.data as Record<string, Folder>);
  const childFolders = allFolders.filter(
    (f) => f.parentId === folderId && !folderStore.deletedIds?.[f.id]
  );

  const wouldCreateCircularReference = (
    draggedFolderId: string,
    targetFolderId: string
  ): boolean => {
    if (draggedFolderId === targetFolderId) return true;
    const checkDesc = (fid: string, ancestorId: string): boolean => {
      const f = folderStore.getById(fid);
      if (!f) return false;
      if (f.parentId === ancestorId) return true;
      return f.parentId ? checkDesc(f.parentId, ancestorId) : false;
    };
    return checkDesc(targetFolderId, draggedFolderId);
  };
  (folderStore as any).wouldCreateCircularReference =
    wouldCreateCircularReference;

  function filterNotesLocal(notesIn: Note[] = [], q: string, label: string) {
    const out = { all: [] as Note[], bookmarked: [] as Note[] };
    const currentFolderId = folderId ?? undefined;
    const processed = notesIn.map(extractNoteContent);
    const qLower = q.toLowerCase();

    processed.forEach((note) => {
      const {
        title,
        searchableContent,
        isBookmarked,
        labels,
        folderId: nFolderId,
      } = note as any;
      if (nFolderId !== currentFolderId) return;
      const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
      const labelFilter = label ? sortedLabels.includes(label) : true;
      const isMatch = qLower.startsWith("#")
        ? sortedLabels.some((l) =>
            l?.toLowerCase().includes(qLower.substring(1))
          )
        : sortedLabels.some((l) => l?.toLowerCase().includes(qLower)) ||
          (title?.toLowerCase().includes(qLower) ?? false) ||
          (searchableContent?.includes(qLower) ?? false);
      if (isMatch && labelFilter) {
        if (isBookmarked) {
          out.bookmarked.push(note);
        } else {
          out.all.push(note);
        }
      }
    });
    return out;
  }

  const filteredNotes = filterNotesLocal(notes, query, activeLabel);
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
      const { src, fileName } = (customEvent?.detail || {}) as {
        src: string;
        fileName: string;
      };
      try {
        const result = await Filesystem.getUri({
          directory: Directory.Data,
          path: src,
        });
        const encodedFilePath = result.uri.replace(/ /g, "%20");
        await Share.share({
          title: `Open ${fileName}`,
          url: encodedFilePath,
          dialogTitle: `Share ${fileName}`,
        });
      } catch (err) {
        console.log(`Error sharing ${fileName}: ${(err as any)?.message}`);
      }
    };
    document.addEventListener("fileEmbedClick", handleFileEmbedClick);
    return () =>
      document.removeEventListener("fileEmbedClick", handleFileEmbedClick);
  }, []);

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };

    fetchTranslations();
  }, []);

  const renderBreadcrumbs = () => {
    if (!folderId && !currentFolder) return null;
    return (
      <nav aria-label="Breadcrumb" className="text-sm mb-2 px-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <button
              onClick={() => navigate("/")}
              className="hover:text-primary font-medium transition-colors"
            >
              {translations.index?.home || "Home"}
            </button>
          </li>
          {folderPath.map((pathFolder, index) => (
            <React.Fragment key={pathFolder.id}>
              <li className="mx-1">/</li>
              <li>
                {index < folderPath.length - 1 ? (
                  <button
                    onClick={() => navigate(`/folder/${pathFolder.id}`)}
                    className="hover:text-primary transition-colors truncate"
                  >
                    {pathFolder.name}
                  </button>
                ) : (
                  <span className="font-medium truncate truncate">
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
          <h1 className="text-2xl md:text-3xl font-bold break-words truncate">
            {currentFolder.name}
          </h1>
        </div>
      </div>
    );
  };

  const handleNoteDrop = useCallback(
    (noteId: string, targetFolderId: string) => {
      noteStore.update(noteId, { folderId: targetFolderId });
      (navigator as any).vibrate?.([100, 50, 100]);
    },
    [noteStore]
  );

  const handleFolderDrop = useCallback(
    (draggedId: string, targetId: string) => {
      if (!wouldCreateCircularReference(draggedId, targetId)) {
        folderStore.update(draggedId, { parentId: targetId });
        (navigator as any).vibrate?.([80, 40, 80, 40, 80]);
      }
    },
    [folderStore]
  );

  const hasContent =
    childFolders.length > 0 ||
    sortedAll.length > 0 ||
    sortedBookmarked.length > 0;

  const renderFolderGrid = () =>
    childFolders.length > 0 && (
      <div className="mb-6">
        <p className="text-lg md:text-xl font-semibold mb-3 capitalize">
          {translations.index?.folders || "Folders"}
        </p>
        <div className="grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {childFolders.map((folder) => (
            <DraggableItem
              key={folder.id}
              item={folder}
              type={ItemTypes.FOLDER}
              onNoteDrop={handleNoteDrop}
              onFolderDrop={handleFolderDrop}
              folderStore={folderStore}
            />
          ))}
        </div>
      </div>
    );

  const renderNotesGrid = (items: Note[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {items.map((note) => (
        <DraggableItem
          key={note.id}
          item={note}
          type={ItemTypes.NOTE}
          onUpdate={(updated: Note) => noteStore.update(note.id, updated)}
        />
      ))}
    </div>
  );

  const renderContent = () => (
    <div className="py-2 p-2 mx-4 mb-10 rounded-md items-center justify-center h-full">
      {renderFolderGrid()}

      {sortedBookmarked.length > 0 && (
        <div className="mb-6">
          <p className="text-lg md:text-xl font-semibold mb-3">
            {translations.home.bookmarked || "Bookmarked"}
          </p>
          {renderNotesGrid(sortedBookmarked)}
        </div>
      )}

      {(sortedAll.length > 0 || (!hasContent && childFolders.length === 0)) && (
        <div>
          <p className="text-lg md:text-xl font-semibold mb-3">
            {sortedAll.length > 0 ? translations.home.all || "All Notes" : ""}
          </p>

          {!hasContent && (
            <div className="text-center py-12 items-center justify-center">
              <img
                src={folderIcon}
                className="block mx-auto sm:w-1/3"
                alt="No content"
              />
              <p className="text-base md:text-lg max-w-md mx-auto">
                {currentFolder
                  ? `This folder is empty. Start adding notes or subfolders to organize your content.`
                  : translations.home.messagePt1 ||
                    "Create your first note"}{" "}
                {!currentFolder &&
                  (translations.home.messagePt2 || "to get started")}
              </p>
            </div>
          )}

          {sortedAll.length > 0 && renderNotesGrid(sortedAll)}
        </div>
      )}
    </div>
  );

  return (
    <DndProvider
      backend={isTouchDevice() ? TouchBackend : HTML5Backend}
      options={isTouchDevice() ? { enableMouseEvents: true } : undefined}
    >
      <CustomDragLayer />
      <div className="overflow-y mb-12">
        <div className="w-full md:pt-4 py-2 flex flex-col border-neutral-300 overflow-auto">
          <div className="px-6">
            {renderFolderHeader()}
            {renderBreadcrumbs()}
          </div>

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
    </DndProvider>
  );
};

export default FolderPage;
