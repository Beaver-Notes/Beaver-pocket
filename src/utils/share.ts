import {
  Filesystem,
  Directory,
  Encoding as FilesystemEncoding,
} from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { useNoteStore } from "@/store/note";
import { useStorage } from "@/composable/storage";

const noteStore = useNoteStore.getState();

export const shareNote = async (
  noteId: string,
) => {
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
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

    const note = noteStore.getById[noteId];

    if (!note) {
      throw new Error(`Note with ID ${noteId} not found.`);
    }

    const exportedData: any = {
      data: {
        id: noteId,
        title: note.title,
        content: note.content,
        lockedNotes: {},
        assets: {
          notesAssets: {},
          fileAssets: {},
        },
        labels: note.labels || [],
      },
    };

    if (note.isLocked) {
      exportedData.data.lockedNotes[noteId] = true;
    }

    if (
      note.content &&
      typeof note.content === "object" &&
      "content" in note.content
    ) {
      if (note.content.content) {
        const updatedContent = note.content.content.map((node: any) => {
          if (node.type === "image" && node.attrs?.src) {
            node.attrs.src = node.attrs.src.replace(
              "note-assets/",
              "assets://"
            );
            node.attrs.src = node.attrs.src.replace(
              "file-assets/",
              "file-assets://"
            );
          }
          return node;
        });

        note.content.content = updatedContent;
      }
    }

    const noteAssetsPath = `note-assets/${noteId}`;
    const fileAssetsPath = `file-assets/${noteId}`;

    exportedData.data.assets.notesAssets = await encodeAssets(noteAssetsPath);

    exportedData.data.assets.fileAssets = await encodeAssets(fileAssetsPath);

    const jsonData = JSON.stringify(exportedData, null, 2);
    const beaFilePath = `${exportFolderPath}/${note.title}.bea`;

    await Filesystem.writeFile({
      path: beaFilePath,
      data: jsonData,
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });

    const result = await Filesystem.getUri({
      directory: Directory.Data,
      path: beaFilePath,
    });

    const resolvedFolderPath = result.uri;

    await Share.share({
      url: resolvedFolderPath,
    });
  } catch (error) {
    console.error("Error exporting note:", error);
  }
};

const encodeAssets = async (sourcePath: string) => {
  const assets: Record<string, string> = {};

  try {
    const result = await Filesystem.readdir({
      path: sourcePath,
      directory: Directory.Data,
    });

    for (const fileInfo of result.files) {
      if (fileInfo.type === "file") {
        const filePath = `${sourcePath}/${fileInfo.name}`;

        const fileData = await Filesystem.readFile({
          path: filePath,
          directory: Directory.Data,
        });

        let encodedData: string;
        if (typeof fileData.data === "string") {
          encodedData = fileData.data;
        } else if (fileData.data instanceof Blob) {
          encodedData = await blobToBase64(fileData.data);
        } else {
          throw new Error("Unsupported file data type");
        }

        assets[fileInfo.name] = encodedData;
      }
    }
  } catch (error) {
    console.error(`Error reading assets from ${sourcePath}:`, error);
  }

  return assets;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (typeof base64String === "string") {
        resolve(base64String.split(",")[1]);
      } else {
        reject(new Error("Failed to convert Blob to Base64 string"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

const STORAGE_PATH = "notes/data.json";

const base64ToFile = async (base64Data: string, filePath: string) => {
  try {
    await Filesystem.writeFile({
      path: filePath,
      data: base64Data,
      directory: Directory.Data,
    });
  } catch (error) {
    console.error("Error writing file:", error);
  }
};

export const useImportBea = () => {
  const importUtils = async (
    fileContent: string
  ) => {
    try {
      const storage = useStorage();
      const parsedData = JSON.parse(fileContent);

      const updateAssetLinks = (obj: any) => {
        for (const key in obj) {
          if (typeof obj[key] === "object" && obj[key] !== null) {
            updateAssetLinks(obj[key]);
          } else if (typeof obj[key] === "string") {
            if (obj[key].startsWith("assets://")) {
              obj[key] = obj[key].replace("assets://", "note-assets/");
            } else if (obj[key].startsWith("file-assets://")) {
              obj[key] = obj[key].replace("file-assets://", "file-assets/");
            }
          }
        }
      };

      updateAssetLinks(parsedData);

      if (
        !parsedData.data ||
        !parsedData.data.id ||
        !parsedData.data.title ||
        !parsedData.data.content
      ) {
        throw new Error(
          "Invalid .bea file structure. Missing required fields."
        );
      }

      const noteId = parsedData.data.id;

      const importedNote = {
        id: noteId,
        title: parsedData.data.title,
        content: parsedData.data.content,
      };

      const noteAssetsFolder = `note-assets/${noteId}`;
      const fileAssetsFolder = `file-assets/${noteId}`;

      await Filesystem.mkdir({
        path: noteAssetsFolder,
        directory: Directory.Data,
        recursive: true,
      });

      await Filesystem.mkdir({
        path: fileAssetsFolder,
        directory: Directory.Data,
        recursive: true,
      });

      if (parsedData.data.assets) {
        if (parsedData.data.assets.notesAssets) {
          for (const assetName in parsedData.data.assets.notesAssets) {
            const base64Data = parsedData.data.assets.notesAssets[assetName];
            await base64ToFile(base64Data, `${noteAssetsFolder}/${assetName}`);
          }
        }

        if (parsedData.data.assets.fileAssets) {
          for (const assetName in parsedData.data.assets.fileAssets) {
            const base64Data = parsedData.data.assets.fileAssets[assetName];
            await base64ToFile(base64Data, `${fileAssetsFolder}/${assetName}`);
          }
        }
      }

      const existingData = noteStore.data;

      const mergedNotes = {
        ...existingData.notes,
        [noteId]: importedNote,
      };

      let mergedLabels = [...existingData.labels];
      if (parsedData.data.labels && Array.isArray(parsedData.data.labels)) {
        parsedData.data.labels.forEach((label: string) => {
          if (!mergedLabels.includes(label)) {
            mergedLabels.push(label);
          }
        });
      }

      const mergedLockStatus = { ...existingData.lockStatus };
      const mergedIsLocked = { ...existingData.isLocked };
      if (parsedData.data.lockedNotes && parsedData.data.lockedNotes[noteId]) {
        mergedLockStatus[noteId] = true;
        mergedIsLocked[noteId] = true;
      }

      const updatedData = {
        notes: mergedNotes,
        labels: mergedLabels,
        lockStatus: mergedLockStatus,
        isLocked: mergedIsLocked,
        deletedIds: existingData.deletedIds,
      };

      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify(updatedData),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      await storage.set('notes', mergedNotes);

      const event = new CustomEvent("notelink", { detail: { noteId } });
      document.dispatchEvent(event);

      return {
        success: true,
        noteId,
      };
    } catch (error) {
      console.error("Import error:", error);
      return {
        success: false,
        error: error,
      };
    }
  };

  return { importUtils };
};
