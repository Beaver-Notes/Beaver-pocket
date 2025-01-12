import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import React from "react";
import { Note } from "./types";
const STORAGE_PATH = "notes/data.json";
const CHANGE_LOG_PATH = "notes/change-log.json";

// Log Change
export const logChange = async (
  action: "created" | "updated" | "deleted",
  paths: string[]
) => {
  try {
    let logData = [];

    // Load existing log data
    try {
      const existingLog = await Filesystem.readFile({
        path: CHANGE_LOG_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      logData = JSON.parse(existingLog.data as string);
    } catch {
      // If the log file doesn't exist, initialize with an empty array
      logData = [];
    }

    // Ensure no duplicate entries in the log
    const existingPaths = new Set(logData.map((entry: any) => entry.path));

    // Add new log entries
    paths.forEach((path) => {
      if (!existingPaths.has(path)) {
        logData.push({
          action,
          path,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Write the updated log back to the file
    await Filesystem.writeFile({
      path: CHANGE_LOG_PATH,
      data: JSON.stringify(logData),
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });
  } catch (error) {
    console.error("Error logging change:", error);
  }
};

// Get changelog

export const getChangeLogs = async (): Promise<
  { action: string; path: string; timestamp: string }[]
> => {
  try {
    const logFile = await Filesystem.readFile({
      path: CHANGE_LOG_PATH,
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });
    return JSON.parse(logFile.data as string);
  } catch {
    return []; // Return an empty array if no log exists
  }
};

// Create Directory

async function createNotesDirectory() {
  const notesPath = "notes";
  const exportPath = "export";
  const assetsPath = "note-assets";
  const fileAssetsPath = "file-assets";

  try {
    await Filesystem.mkdir({
      path: fileAssetsPath,
      directory: Directory.Data,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: assetsPath,
      directory: Directory.Data,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: exportPath,
      directory: Directory.Data,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: notesPath,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (error: any) {
    console.error("Error creating the directory:", error);
  }
}

// Load

export const loadNotes = async (): Promise<Record<string, Note>> => {
  try {
    let fileExists = true;

    try {
      await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Data,
      });
    } catch {
      console.log("The file doesn't exist. Marking as not found.");
      fileExists = false;
    }

    if (!fileExists) {
      await createNotesDirectory();
      console.log("Notes directory created because no file was found.");
      return {};
    }

    // Read the file only if it exists
    const data = await Filesystem.readFile({
      path: STORAGE_PATH,
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });

    if (data.data) {
      const parsedData = JSON.parse(data.data as string);

      if (parsedData?.data?.notes) {
        const notes = parsedData.data.notes;
        const collapsibleSetting = localStorage.getItem("collapsibleHeading");

        const filteredNotes: Record<string, Note> = {};

        for (const noteId in notes) {
          if (notes.hasOwnProperty(noteId)) {
            const note = notes[noteId];

            // Ensure the title is not missing
            note.title = note.title || "";

            // If collapsible headings are disabled, uncollapse all headings
            if (collapsibleSetting === "false" && note.content?.content) {
              note.content.content = uncollapseHeading(note.content.content);
            }

            // Add the note to the accumulator
            filteredNotes[noteId] = note;
          }
        }

        return filteredNotes;
      } else {
        console.log(
          "The file is missing the 'notes' data. Returning an empty object."
        );
        return {};
      }
    } else {
      console.log("The file is empty. Returning an empty object.");
      return {};
    }
  } catch (error) {
    console.error("Error loading notes:", error);
    return {};
  }
};

// Save

export const useSaveNote = (
  setNotesState: (notes: Record<string, Note>) => void
) => {
  const saveNote = React.useCallback(
    async (note: unknown) => {
      try {
        const notes = await loadNotes();

        if (typeof note === "object" && note !== null) {
          const typedNote = note as Note;

          const isUpdate = !!notes[typedNote.id];

          const updatedNote: Note = {
            ...typedNote,
            createdAt:
              typeof typedNote.createdAt === "number"
                ? typedNote.createdAt
                : Date.now(),
            updatedAt: Date.now(),
          };

          const updatedNotes: Record<string, Note> = {
            ...notes,
            [typedNote.id]: updatedNote,
          };

          const data = {
            data: {
              notes: updatedNotes,
            },
          };

          // Write updated notes to file
          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify(data),
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
          });

          // Determine related paths for logging
          const relatedPaths = [`${STORAGE_PATH}`];

          // Check for the existence of related folders and add to paths
          const fileAssetsPath = `file-assets/${typedNote.id}`;
          const noteAssetsPath = `note-assets/${typedNote.id}`;
          try {
            await Filesystem.stat({
              path: fileAssetsPath,
              directory: Directory.Data,
            });
            relatedPaths.push(fileAssetsPath);
          } catch {}

          try {
            await Filesystem.stat({
              path: noteAssetsPath,
              directory: Directory.Data,
            });
            relatedPaths.push(noteAssetsPath);
          } catch {}

          // Log the action
          await logChange(isUpdate ? "updated" : "created", relatedPaths);

          // Update the state
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

// Delete

export const useDeleteNote = (
  setNotesState: (notes: Record<string, Note>) => void,
  notesState: Record<string, Note>
) => {
  const deleteNote = React.useCallback(
    async (noteId: string) => {
      try {
        const notes = { ...notesState };
        delete notes[noteId];

        const fileAssetsPath = `file-assets/${noteId}`;
        const noteAssetsPath = `note-assets/${noteId}`;
        const relatedPaths = [`${STORAGE_PATH}`];

        // Attempt to delete related folders and add to paths
        try {
          await Filesystem.rmdir({
            path: fileAssetsPath,
            directory: Directory.Data,
            recursive: true,
          });
          relatedPaths.push(fileAssetsPath);
        } catch {}

        try {
          await Filesystem.rmdir({
            path: noteAssetsPath,
            directory: Directory.Data,
            recursive: true,
          });
          relatedPaths.push(noteAssetsPath);
        } catch {}

        // Update the storage
        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({ data: { notes } }),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        // Log the deletion
        await logChange("deleted", relatedPaths);

        setNotesState(notes);
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Error deleting note: " + (error as any).message);
      }
    },
    [notesState, setNotesState]
  );

  return { deleteNote };
};

// Bookmark

export const useToggleBookmark = () => {
  const toggleBookmark = async (noteId: string) => {
    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isBookmarked' property
      updatedNote.isBookmarked = !updatedNote.isBookmarked;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await logChange("updated", [`${STORAGE_PATH}`]);

      return notes; // Return the updated notes
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      throw error; // Throw the error for the caller to handle
    }
  };

  return { toggleBookmark };
};

// Archive
export const useToggleArchive = () => {
  const toggleArchive = async (noteId: string) => {
    try {
      const notes = await loadNotes();
      const updatedNote = { ...notes[noteId] };

      // Toggle the 'isArchived' property
      updatedNote.isArchived = !updatedNote.isArchived;

      // Update the note in the dictionary
      notes[noteId] = updatedNote;

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await logChange("updated", [`${STORAGE_PATH}`]);

      return notes; // Return the updated notes
    } catch (error) {
      console.error("Error toggling archive:", error);
      throw error; // Throw the error for the caller to handle
    }
  };

  return { toggleArchive };
};

// Function to uncollapse headings
function uncollapseHeading(contents: any[] = []): any[] {
  if (contents.length === 0) {
    return contents;
  }

  let newContents = [];
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    newContents.push(content);

    if (content.type === "heading") {
      let collapsedContent = content.attrs.collapsedContent ?? [];

      if (typeof collapsedContent === "string") {
        collapsedContent = collapsedContent ? JSON.parse(collapsedContent) : [];
      }

      // Mark the heading as open and remove collapsed content
      content.attrs.open = true;
      content.attrs.collapsedContent = null;

      // Recursively uncollapse any nested collapsed content
      if (collapsedContent.length > 0) {
        newContents = [...newContents, ...uncollapseHeading(collapsedContent)];
      }
    }
  }

  return newContents;
}
