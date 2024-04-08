// importUtils.ts

// Handles importing notes and assets from both Pocket and Notes

import { Directory, Filesystem, FilesystemEncoding } from "@capacitor/filesystem";
import { Note } from "../store/types";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

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

    const importUtils = async (
        setNotesState: React.Dispatch<React.SetStateAction<Record<string, Note>>>,
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
            path: "note-assets", // Change this to your app's note-assets folder
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
                to: `note-assets/${file.name}`, // Change this to your app's note-assets folder
                directory: Directory.Data,
              });
            }
          }
    
          // Import file-assets
          const existingFileAssets = await Filesystem.readdir({
            path: "file-assets", // Change this to your app's file-assets folder
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
                to: `file-assets/${file.name}`, // Change this to your app's file-assets folder
                directory: Directory.Data,
              });
            }
          }
    
          const importedData = await Filesystem.readFile({
            path: importDataPath,
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
          });
    
          const importedJsonString: string =
            typeof importedData.data === "string"
              ? importedData.data
              : await importedData.data.text();
          const parsedData = JSON.parse(importedJsonString);
    
          // Check if sharedKey already exists in local storage
          const existingSharedKey = localStorage.getItem("sharedKey");
          if (!existingSharedKey && parsedData && parsedData.sharedKey) {
            localStorage.setItem("sharedKey", parsedData.sharedKey);
          }
    
          if (parsedData && parsedData.data && parsedData.data.notes) {
            const importedNotes = parsedData.data.notes;
    
            // Update image src paths in imported notes
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
              }
            });
    
            // Handle fileEmbed src paths in imported notes
            Object.values<Note>(importedNotes).forEach((note) => {
              if (
                note.content &&
                typeof note.content === "object" &&
                "content" in note.content
              ) {
                if (note.content.content) {
                  const updatedContent = note.content.content.map((node: any) => {
                    if (node.type === "fileEmbed" && node.attrs && node.attrs.src) {
                      const srcPath = node.attrs.src;
                      const indexOfFileAssets = srcPath.indexOf("file-assets/");
                      if (indexOfFileAssets !== -1) {
                        node.attrs.src = srcPath.substring(indexOfFileAssets);
                      }
                    }
                    return node;
                  });
                  note.content.content = updatedContent;
                }
              }
            });
    
            // Merge imported notes with existing notes
            const existingNotes = await loadNotes();
            const mergedNotes = {
              ...existingNotes,
              ...importedNotes,
            };
    
            // Filter notes based on search query
            const filtered = Object.values<Note>(mergedNotes).filter(
              (note: Note) => {
                const titleMatch = note.title
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());
                const contentMatch = JSON.stringify(note.content)
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());
                return titleMatch || contentMatch;
              }
            );
    
            // Update note createdAt and updatedAt properties
            Object.values(importedNotes).forEach((note: any) => {
              note.createdAt = new Date(note.createdAt);
              note.updatedAt = new Date(note.updatedAt);
            });
    
            // Save merged notes to storage
            await Filesystem.writeFile({
              path: STORAGE_PATH,
              data: JSON.stringify({ data: { notes: mergedNotes } }),
              directory: Directory.Documents,
              encoding: FilesystemEncoding.UTF8,
            });
    
            // Update state
            setNotesState(mergedNotes);
            setFilteredNotes(
              Object.fromEntries(filtered.map((note) => [note.id, note]))
            );
    
            alert(translations.home.importSuccess);
          } else {
            alert(translations.home.importInvalid);
          }
        } catch (error) {
          alert(translations.home.importError);
        }
      };
  return { importUtils };
};
