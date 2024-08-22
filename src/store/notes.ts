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
        const filteredNotes = Object.keys(notes).reduce((acc, noteId) => {
          const note = notes[noteId];
          if (note.title) {
            acc[noteId] = note;
          } else {
            console.warn(`Note with ID ${noteId} is missing a title. Skipping.`);
          }
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

export const useSaveNote = (setNotesState: React.Dispatch<React.SetStateAction<Record<string, Note>>>) => {
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

          const updatedNote = {
            ...typedNote,
            createdAt: createdAtTimestamp,
            updatedAt: updatedAtTimestamp,
          };

          notes[typedNote.id] = updatedNote;

          const data = {
            data: {
              notes,
            },
          };

          // Write updated notes to file
          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify(data),
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
          });

          // Update the state immediately
          setNotesState((prevNotes) => ({
            ...prevNotes,
            [typedNote.id]: updatedNote,
          }));
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
          directory: Directory.Data,
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