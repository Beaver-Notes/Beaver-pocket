import { Note } from "../store/types";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";

const STORAGE_PATH = "notes/data.json";

export const useHandleImportData = () => {
  const [translations, setTranslations] = useState({
    home: {
      importSuccess: "home.importSuccess",
      importInvalid: "home.importInvalid",
      importError: "home.importError",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  const readJsonFile = async (path: string): Promise<any> => {
    try {
      const fileContents = await Filesystem.readFile({
        path,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      let jsonString: string;
      if (typeof fileContents.data === "string") {
        jsonString = fileContents.data;
      } else {
        // If data is a Blob, convert it to string
        jsonString = await fileContents.data.text();
      }

      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error reading JSON file:", error);
      throw new Error("Failed to read JSON file");
    }
  };

  const importUtils = async (
    setNotesState: (notes: Record<string, Note>) => void,
    loadNotes: () => Promise<Record<string, Note>>,
    searchQuery: string,
    setFilteredNotes: React.Dispatch<React.SetStateAction<Record<string, Note>>>
  ) => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0];
      const importFolderPath = `/export/Beaver Notes ${formattedDate}`;
      const importDataPath = `${importFolderPath}/data.json`;
      const importAssetsPath = `${importFolderPath}/assets`;
      const importFileAssetsPath = `${importFolderPath}/file-assets`;

      // Import note-assets
      const existingNoteAssets = await Filesystem.readdir({
        path: "note-assets",
        directory: Directory.Data,
      });

      const existingNoteFiles = new Set(
        existingNoteAssets.files.map((file) => file.name)
      );

      const importedNoteAssets = await Filesystem.readdir({
        path: importAssetsPath,
        directory: Directory.Data,
      });

      for (const file of importedNoteAssets.files) {
        if (!existingNoteFiles.has(file.name)) {
          await Filesystem.copy({
            from: `${importAssetsPath}/${file.name}`,
            to: `note-assets/${file.name}`,
            directory: Directory.Data,
          });
        }
      }

      // Import file-assets
      const existingFileAssets = await Filesystem.readdir({
        path: "file-assets",
        directory: Directory.Data,
      });

      const existingFileFiles = new Set(
        existingFileAssets.files.map((file) => file.name)
      );

      const importedFileAssets = await Filesystem.readdir({
        path: importFileAssetsPath,
        directory: Directory.Data,
      });

      for (const file of importedFileAssets.files) {
        if (!existingFileFiles.has(file.name)) {
          await Filesystem.copy({
            from: `${importFileAssetsPath}/${file.name}`,
            to: `file-assets/${file.name}`,
            directory: Directory.Data,
          });
        }
      }

      const parsedData = await readJsonFile(importDataPath);

      const existingSharedKey = localStorage.getItem("sharedKey");
      if (!existingSharedKey && parsedData && parsedData.sharedKey) {
        localStorage.setItem("sharedKey", parsedData.sharedKey);
      }

      if (parsedData && parsedData.data && parsedData.data.notes) {
        const importedNotes = parsedData.data.notes;

        Object.values<Note>(importedNotes).forEach((note) => {
          if (
            note.content &&
            typeof note.content === "object" &&
            "content" in note.content
          ) {
            if (note.content.content) {
              const updatedContent = note.content.content.map((node: any) => {
                if (node.type === "image" && node.attrs && node.attrs.src) {
                  node.attrs.src = node.attrs.src.replace(
                    "assets://",
                    "note-assets/"
                  );
                }
                return node;
              });
              note.content.content = updatedContent;
            }
            if (note.content.content) {
              const updatedContent = note.content.content.map((node: any) => {
                if (node.type === "fileEmbed" && node.attrs && node.attrs.src) {
                  node.attrs.src = node.attrs.src.replace(
                    "file-assets://",
                    "file-assets/"
                  );
                }
                return node;
              });
              note.content.content = updatedContent;
            }
          }
        });

        const existingNotes = await loadNotes();
        const mergedNotes = {
          ...existingNotes,
          ...importedNotes,
        };

        const filtered = Object.values<Note>(mergedNotes).filter(
          (note: Note) => {
            const titleMatch = note.title
              ? note.title.toLowerCase().includes(searchQuery.toLowerCase())
              : false;
            const contentMatch = note.content
              ? JSON.stringify(note.content)
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              : false;
            return titleMatch || contentMatch;
          }
        );

        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify({ data: { notes: mergedNotes } }),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        setNotesState(mergedNotes);
        setFilteredNotes(
          Object.fromEntries(filtered.map((note) => [note.id, note]))
        );
      }
    } catch (error: any) {
      alert(error);
      console.error("Error importing data:", error);
    }
  };

  return { importUtils };
};