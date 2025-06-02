import { Note } from "../store/types";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { loadNotes } from "../store/notes";
import { mergeData, revertAssetPaths } from "./merge";

const STORAGE_PATH = "notes/data.json";

export const useHandleImportData = () => {
  const readJsonFile = async (path: string): Promise<any> => {
    try {
      const fileContents = await Filesystem.readFile({
        path,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      return JSON.parse(fileContents.data as string);
    } catch (error) {
      console.error("Error reading JSON file:", error);
      throw new Error("Failed to read JSON file");
    }
  };

  const importUtils = async (
    setNotesState: (notes: Record<string, Note>) => void
  ) => {
    try {
      const currentDate = new Date();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      let importFolderPath = "";

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(currentDate.getTime() - i * oneDayInMs);
        const formattedDate = checkDate.toISOString().split("T")[0];
        importFolderPath = `/export/Beaver Notes ${formattedDate}`;

        const folderExists = await Filesystem.readdir({
          path: importFolderPath,
          directory: Directory.Data,
        }).then(() => true).catch(() => false);

        if (folderExists) break;
      }

      if (!importFolderPath) {
        throw new Error("No viable folder found for the past 30 days.");
      }

      const importDataPath = `${importFolderPath}/data.json`;
      const importAssetsPath = `${importFolderPath}/assets`;
      const importFileAssetsPath = `${importFolderPath}/file-assets`;

      // Copy note-assets
      try {
        const existingAssets = new Set(
          (await Filesystem.readdir({ path: "note-assets", directory: Directory.Data })).files.map(f => f.name)
        );

        const importedAssets = await Filesystem.readdir({
          path: importAssetsPath,
          directory: Directory.Data,
        });

        for (const file of importedAssets.files) {
          if (!existingAssets.has(file.name)) {
            await Filesystem.copy({
              from: `${importAssetsPath}/${file.name}`,
              to: `note-assets/${file.name}`,
              directory: Directory.Data,
            });
          }
        }
      } catch (error) {
        console.warn("Note-assets folder not found:", error);
      }

      // Copy file-assets
      try {
        const existingFileAssets = new Set(
          (await Filesystem.readdir({ path: "file-assets", directory: Directory.Data })).files.map(f => f.name)
        );

        const importedFileAssets = await Filesystem.readdir({
          path: importFileAssetsPath,
          directory: Directory.Data,
        });

        for (const file of importedFileAssets.files) {
          if (!existingFileAssets.has(file.name)) {
            await Filesystem.copy({
              from: `${importFileAssetsPath}/${file.name}`,
              to: `file-assets/${file.name}`,
              directory: Directory.Data,
            });
          }
        }
      } catch (error) {
        console.warn("File-assets folder not found:", error);
      }

      const parsedData = await readJsonFile(importDataPath);

      const existingSharedKey = localStorage.getItem("sharedKey");
      if (!existingSharedKey && parsedData?.sharedKey) {
        localStorage.setItem("sharedKey", parsedData.sharedKey);
      }

      if (parsedData?.data?.notes) {
        // First load existing notes
        const localData = await loadNotes();

        // Merge imported data (assumes imported notes are already in assets:// and file-assets:// format)
        const merged = mergeData(
          {
            notes: localData.notes,
            labels: localData.labels,
            lockStatus: localData.lockStatus,
            isLocked: localData.isLocked,
            deletedIds: localData.deletedIds,
          },
          {
            notes: parsedData.data.notes,
            labels: parsedData?.labels || [],
            lockStatus: parsedData?.lockStatus || {},
            isLocked: parsedData?.isLocked || {},
            deletedIds: parsedData?.deletedIds || {},
          }
        );

        // Revert asset paths back to platform format before saving
        const cleanedNotes = revertAssetPaths((await merged).notes);

        const mergedWithRevertedPaths = {
          ...merged,
          notes: cleanedNotes,
        };

        await Filesystem.writeFile({
          path: STORAGE_PATH,
          data: JSON.stringify(mergedWithRevertedPaths),
          directory: Directory.Data,
          encoding: FilesystemEncoding.UTF8,
        });

        setNotesState(await cleanedNotes);
        document.dispatchEvent(new Event("reload"));
      }
    } catch (error) {
      console.error("Import error:", error);
    }
  };

  return { importUtils };
};
