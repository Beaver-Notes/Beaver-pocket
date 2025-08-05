import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { Zip } from "capa-zip";
import { useNoteStore } from "@/store/note";
import { Note } from "@/store/types";

export const useExportData = () => {
  const noteStore = useNoteStore.getState();
  const [translations, setTranslations] = useState({
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareError: "home.shareError",
      shareTitle: "home.shareTitle",
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
  }, []); // Empty dependency array to run once on mount

  const exportUtils = async () => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `export/${exportFolderName}`;

      try {
        await Filesystem.rmdir({
          path: "export",
          directory: Directory.Data,
          recursive: true,
        });
      } catch (error) {
        console.log("No existing export folder found, continuing...");
      }

      await Filesystem.mkdir({
        path: exportFolderPath,
        directory: Directory.Data,
        recursive: true,
      });

      // Copy note-assets folder
      await Filesystem.copy({
        from: "note-assets",
        to: `${exportFolderPath}/assets`,
        directory: Directory.Data,
      });

      // Copy file-assets folder
      await Filesystem.copy({
        from: "file-assets",
        to: `${exportFolderPath}/file-assets`,
        directory: Directory.Data,
      });

      const exportedData: any = {
        notes: {},
        labels: [],
        lockStatus: {},
        isLocked: {},
        deletedIds: {},
      };

      (Object.values(noteStore.data) as Note[]).forEach((note: Note) => {
        // Check if note.content exists and is not null
        if (
          note.content &&
          typeof note.content === "object" &&
          "content" in note.content
        ) {
          // Check if note.content.content is defined
          if (note.content.content) {
            // Replace src attribute in each note's content
            const updatedImageContent = note.content.content.map((node) => {
              if (node.type === "image" && node.attrs && node.attrs.src) {
                node.attrs.src = node.attrs.src.replace(
                  "note-assets/",
                  "assets://"
                );
              }
              return node;
            });

            const updatedFileContent = note.content.content.map((node) => {
              if (node.type === "image" && node.attrs && node.attrs.src) {
                node.attrs.src = node.attrs.src.replace(
                  "file-assets/",
                  "file-assets://"
                );
              }
              return node;
            });

            // Update note's content with modified content
            note.content.content = updatedImageContent;

            note.content.content = updatedFileContent;

            // Add the modified note to exportedData
            exportedData.notes[note.id] = note;

            exportedData.labels = exportedData.labels.concat(note.labels);

            if (note.isLocked) {
              exportedData.lockStatus[note.id] = "locked";
              exportedData.isLocked[note.id] = true;
            }
          }
        }
      });

      exportedData.labels = Array.from(new Set(exportedData.labels));

      const jsonData = JSON.stringify(exportedData, null, 2);
      const jsonFilePath = `${exportFolderPath}/data.json`;

      await Filesystem.writeFile({
        path: jsonFilePath,
        data: jsonData,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await shareExportFolder(exportFolderPath);
    } catch (error) {
      console.log((error as any).message);
    }
  };

  const shareExportFolder = async (folderPath: string) => {
    try {
      const zipFilePath = `${folderPath}.zip`;
      await Zip.zip({ sourcePath: folderPath, destinationPath: zipFilePath });
      await Filesystem.rmdir({
        path: folderPath,
        directory: Directory.Data,
        recursive: true,
      });
      const result = await Filesystem.getUri({
        directory: Directory.Data,
        path: zipFilePath,
      });
      await Share.share({
        title: translations.home.shareTitle,
        url: result.uri,
        dialogTitle: translations.home.shareTitle,
      });
      await Filesystem.deleteFile({
        path: zipFilePath,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return { exportUtils };
};
