import {
  Directory,
  Filesystem,
  FilesystemEncoding,
  FilesystemDirectory
} from "@capacitor/filesystem";
import React, { useState } from "react";
import { Note } from "./types";
import {Capacitor} from "@capacitor/core";
import {setStoreRemotePath} from "./useDataPath";

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
      directory: Directory.Documents,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: assetsPath,
      directory: Directory.Documents,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: exportPath,
      directory: Directory.Documents,
      recursive: true,
    });
    await Filesystem.mkdir({
      path: notesPath,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (error: any) {
    console.error("Error creating the directory:", error);
  }
}

// Load

export const loadNotes = async () => {
  try {
    const { uri } = await Filesystem.getUri({
      directory: FilesystemDirectory.Data,
      path: "",
    });
    setStoreRemotePath(Capacitor.convertFileSrc(uri));
    await createNotesDirectory(); // Create the directory before reading/writing

    const fileExists = await Filesystem.stat({
      path: STORAGE_PATH,
      directory: Directory.Documents,
    });

    if (fileExists) {
      const data = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Documents,
        encoding: FilesystemEncoding.UTF8,
      });

      if (data.data) {
        const parsedData = JSON.parse(data.data as string);

        if (parsedData?.data?.notes) {
          return parsedData.data.notes;
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
    } else {
      console.log("The file doesn't exist. Returning an empty object.");
      return {};
    }
  } catch (error) {
    console.error("Error loading notes:", error);
    return {};
  }
};

// Save

export const useSaveNote = () => {
  const saveNote = React.useCallback(
    async (note: unknown) => {
      try {
        const notes = await loadNotes();

        if (typeof note === "object" && note !== null) {
          const typedNote = note as Note;

          // Check if createdAt and updatedAt are Dates
          const createdAtTimestamp =
            typeof typedNote.createdAt === "number"
              ? typedNote.createdAt
              : Date.now();

          const updatedAtTimestamp =
            typeof typedNote.updatedAt === "number"
              ? typedNote.updatedAt
              : Date.now();

          notes[typedNote.id] = {
            ...typedNote,
            createdAt: createdAtTimestamp,
            updatedAt: updatedAtTimestamp,
          };

          const data = {
            data: {
              notes,
            },
          };

          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify(data),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });
        } else {
          console.error("Invalid note object:", note);
        }
      } catch (error) {
        console.error("Error saving note:", error);
      }
    },
    [loadNotes]
  );

  return { saveNote };
};



// Delete

export const useDeleteNote = () => {
  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const deleteNote = React.useCallback(
    async (noteId: string) => {
      try {
        const notes = { ...notesState }; // Create a copy of notesState
        delete notes[noteId]; // Delete the note with the given noteId
  
        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({ data: { notes } }),
          directory: Directory.Documents,
          encoding: FilesystemEncoding.UTF8,
        });
  
        setNotesState(notes); // Update the state with the new notes object
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
        directory: Directory.Documents,
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
        directory: Directory.Documents,
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
