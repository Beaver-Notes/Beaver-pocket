import {
  Directory,
  Filesystem,
  FilesystemEncoding,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import React from "react";
import { Note } from "./types";
import { Capacitor } from "@capacitor/core";
import { setStoreRemotePath } from "./useDataPath";

const STORAGE_PATH = "notes/data.json";

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
    const { uri } = await Filesystem.getUri({
      directory: FilesystemDirectory.Data,
      path: "",
    });
    setStoreRemotePath(Capacitor.convertFileSrc(uri));
    await createNotesDirectory(); // Create the directory before reading/writing

    try {
      await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Data,
      });
    } catch {
      console.log("The file doesn't exist. Returning an empty object.");
      return {};
    }

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

        const filteredNotes = Object.keys(notes).reduce((acc, noteId) => {
          const note = notes[noteId];

          // If the title is missing or empty, assign an empty string as the title
          note.title = note.title || "";

          // If collapsible headings are disabled, uncollapse all headings
          if (collapsibleSetting === "false" && note.content?.content) {
            note.content.content = uncollapseHeading(note.content.content);
          }

          // Add the note to the accumulator
          acc[noteId] = note;

          return acc;
        }, {} as Record<string, Note>);

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

          // Ensure createdAt and updatedAt are timestamps
          const createdAtTimestamp =
            typeof typedNote.createdAt === "number"
              ? typedNote.createdAt
              : Date.now();

          const updatedAtTimestamp =
            typeof typedNote.updatedAt === "number"
              ? typedNote.updatedAt
              : Date.now();

          const updatedNote: Note = {
            ...typedNote,
            createdAt: createdAtTimestamp,
            updatedAt: updatedAtTimestamp,
          };

          // Update the notes object with the new/updated note
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

          // Update the state directly
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
        const notes = { ...notesState }; // Create a copy of notesState
        delete notes[noteId]; // Delete the note with the given noteId

        // Define paths for the folders
        const fileAssetsPath = `file-assets/${noteId}`;
        const noteAssetsPath = `note-assets/${noteId}`;

        // Attempt to delete the folders if they exist
        await Filesystem.rmdir({
          path: fileAssetsPath,
          directory: Directory.Data,
          recursive: true, // This will ensure the directory is deleted even if it contains files
        }).catch((error) => {
          console.warn(`Error deleting file-assets for note ${noteId}:`, error);
        });

        await Filesystem.rmdir({
          path: noteAssetsPath,
          directory: Directory.Data,
          recursive: true,
        }).catch((error) => {
          console.warn(`Error deleting note-assets for note ${noteId}:`, error);
        });

        // Update the storage after deletion
        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({ data: { notes } }),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        // Update the state with the new notes object
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
