import { Directory, Filesystem, FilesystemEncoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { Note } from "../store/types";
import { Zip } from "capa-zip";

export const useExportData = () => {
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

  const exportUtils = async (notesState: Record<string, Note>) => {
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      const exportFolderName = `Beaver Notes ${formattedDate}`;
      const exportFolderPath = `export/${exportFolderName}`;

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
        data: {
          notes: {},
          lockStatus: {},
          isLocked: {},
        },
        labels: [],
      };

      Object.values(notesState).forEach((note) => {
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
            exportedData.data.notes[note.id] = note;

            exportedData.labels = exportedData.labels.concat(note.labels);

            if (note.isLocked) {
              exportedData.data.lockStatus[note.id] = "locked";
              exportedData.data.isLocked[note.id] = true;
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

      alert(translations.home.exportSuccess);

      await shareExportFolder(exportFolderPath);
    } catch (error) {
      alert(translations.home.exportError + (error as any).message);
    }
  };

  const shareExportFolder = async (folderPath: string) => {
    try {
      const zipFilePath = `${folderPath}.zip`;
      await Zip.zip({ sourcePath: folderPath, destinationPath: zipFilePath });

      const result = await Filesystem.getUri({
        directory: Directory.Data,
        path: zipFilePath,
      });
      await Share.share({
        title: translations.home.shareTitle,
        url: result.uri,
        dialogTitle: translations.home.shareTitle,
      });
    } catch (error) {
      alert(translations.home.shareError + error);
    }
  };

  return { exportUtils };
};