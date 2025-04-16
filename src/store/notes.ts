import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import React from "react";
import { Note } from "./types";
import { trackChange } from "../composable/sync";

const STORAGE_PATH = "notes/data.json";

// Create Directory
async function createNotesDirectory() {
  const paths = ["file-assets", "note-assets", "export", "notes"];
  for (const path of paths) {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (error) {
      console.error("Error creating directory:", path, error);
    }
  }
}

// Load all data
export const loadNotes = async (): Promise<{
  notes: Record<string, Note>;
  labels: string[];
  lockStatus: Record<string, any>;
  isLocked: Record<string, any>;
  deletedIds: Record<string, any>;
}> => {
  try {
    try {
      await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Data,
      });
    } catch {
      await createNotesDirectory();
      return {
        notes: {},
        labels: [],
        lockStatus: {},
        isLocked: {},
        deletedIds: {},
      };
    }

    const data = await Filesystem.readFile({
      path: STORAGE_PATH,
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });

    const parsed = JSON.parse(typeof data.data === "string" ? data.data : await data.data.text());
    const collapsibleSetting = localStorage.getItem("collapsibleHeading");
    const notes = parsed?.notes ?? {};

    for (const noteId in notes) {
      const note = notes[noteId];
      note.title = note.title || "";
      if (collapsibleSetting === "false" && note.content?.content) {
        note.content.content = uncollapseHeading(note.content.content);
      }
    }

    return {
      notes,
      labels: parsed?.labels ?? [],
      lockStatus: parsed?.lockStatus ?? {},
      isLocked: parsed?.isLocked ?? {},
      deletedIds: parsed?.deletedIds ?? {},
    };
  } catch (error) {
    console.error("Error loading data:", error);
    return {
      notes: {},
      labels: [],
      lockStatus: {},
      isLocked: {},
      deletedIds: {},
    };
  }
};

// Save Note
export const useSaveNote = (
  setNotesState: (notes: Record<string, Note>) => void
) => {
  const saveNote = React.useCallback(
    async (note: unknown) => {
      try {
        const { notes, labels, lockStatus, isLocked, deletedIds } =
          await loadNotes();

        if (typeof note === "object" && note !== null) {
          const typedNote = note as Note;
          const updatedNote: Note = {
            ...typedNote,
            createdAt:
              typeof typedNote.createdAt === "number"
                ? typedNote.createdAt
                : Date.now(),
            updatedAt: Date.now(),
          };

          const updatedNotes = { ...notes, [typedNote.id]: updatedNote };

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({
              notes: updatedNotes,
              labels,
              lockStatus,
              isLocked,
              deletedIds,
            }),
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
          });

          await trackChange("notes", updatedNotes);
          setNotesState(updatedNotes);
        } else {
          console.error("Invalid note object:", note);
        }
      } catch (error) {
        console.error("Error saving note:", error);
      }
    },
    [setNotesState]
  );

  return { saveNote };
};

// Delete Note
export const useDeleteNote = (
  setNotesState: (notes: Record<string, Note>) => void,
  notesState: Record<string, Note>
) => {
  const deleteNote = React.useCallback(
    async (noteId: string) => {
      try {
        const { labels, lockStatus, isLocked, deletedIds } = await loadNotes();
        const updatedNotes = { ...notesState };
        delete updatedNotes[noteId];

        const assetPaths = [`file-assets/${noteId}`, `note-assets/${noteId}`];
        for (const path of assetPaths) {
          try {
            await Filesystem.rmdir({
              path,
              directory: Directory.Data,
              recursive: true,
            });
          } catch {}
        }

        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({
            notes: updatedNotes,
            labels,
            lockStatus,
            isLocked,
            deletedIds,
          }),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        await trackChange("notes", updatedNotes);
        setNotesState(updatedNotes);
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
      }
    },
    [notesState, setNotesState]
  );

  return { deleteNote };
};

// Toggle Bookmark
export const useToggleBookmark = () => {
  const toggleBookmark = async (noteId: string) => {
    try {
      const { notes, labels, lockStatus, isLocked, deletedIds } =
        await loadNotes();
      notes[noteId].isBookmarked = !notes[noteId].isBookmarked;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({
          notes,
          labels,
          lockStatus,
          isLocked,
          deletedIds,
        }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await trackChange("notes", notes);
      return notes;
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      throw error;
    }
  };

  return { toggleBookmark };
};

// Toggle Archive
export const useToggleArchive = () => {
  const toggleArchive = async (noteId: string) => {
    try {
      const { notes, labels, lockStatus, isLocked, deletedIds } =
        await loadNotes();
      notes[noteId].isArchived = !notes[noteId].isArchived;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({
          notes,
          labels,
          lockStatus,
          isLocked,
          deletedIds,
        }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await trackChange("notes", notes);
      return notes;
    } catch (error) {
      console.error("Error toggling archive:", error);
      throw error;
    }
  };

  return { toggleArchive };
};

// Uncollapse headings
function uncollapseHeading(contents: any[] = []): any[] {
  if (!Array.isArray(contents)) return contents;

  let newContents: any[] = [];
  for (const content of contents) {
    newContents.push(content);
    if (content.type === "heading") {
      let collapsed = content.attrs.collapsedContent ?? [];
      if (typeof collapsed === "string") {
        collapsed = collapsed ? JSON.parse(collapsed) : [];
      }
      content.attrs.open = true;
      content.attrs.collapsedContent = null;

      if (collapsed.length > 0) {
        newContents = [...newContents, ...uncollapseHeading(collapsed)];
      }
    }
  }
  return newContents;
}
