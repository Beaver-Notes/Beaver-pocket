import {
  Filesystem,
  Directory,
  Encoding as FilesystemEncoding,
} from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Note } from "../store/types";

export const shareNote = async (
  noteId: string,
  notesState: Record<string, Note>
) => {
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

    // Find the specific note by ID
    const note = notesState[noteId];

    if (!note) {
      throw new Error(`Note with ID ${noteId} not found.`);
    }

    // Prepare data for export
    const exportedData: any = {
      data: {
        id: noteId,
        title: note.title,
        content: note.content,
        lockedNotes: {},
        // This will hold locked note status, if any
        assets: {
          notesAssets: {},
          fileAssets: {},
        },
        labels: note.labels || [],
      },
    };

    // Include locked note status
    if (note.isLocked) {
      exportedData.data.lockedNotes[noteId] = true;
    }

    // Update asset paths in note content
    if (
      note.content &&
      typeof note.content === "object" &&
      "content" in note.content
    ) {
      if (note.content.content) {
        const updatedContent = note.content.content.map((node) => {
          if (node.type === "image" && node.attrs?.src) {
            // Replace asset paths with proper scheme
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

    // Read and encode assets from note-assets and file-assets folders
    const noteAssetsPath = `note-assets/${noteId}`;
    const fileAssetsPath = `file-assets/${noteId}`;

    // Encode assets from note-assets
    exportedData.data.assets.notesAssets = await encodeAssets(noteAssetsPath);

    // Encode assets from file-assets
    exportedData.data.assets.fileAssets = await encodeAssets(fileAssetsPath);

    // Save exported data as .bea file
    const jsonData = JSON.stringify(exportedData, null, 2);
    const beaFilePath = `${exportFolderPath}/${note.title}.bea`;

    await Filesystem.writeFile({
      path: beaFilePath,
      data: jsonData,
      directory: Directory.Data,
      encoding: FilesystemEncoding.UTF8,
    });

    // Notify the user of success
    console.log("Note exported successfully!");

    const result = await Filesystem.getUri({
      directory: Directory.Data,
      path: beaFilePath,
    });

    const resolvedFolderPath = result.uri;

    // Share the exported .bea file
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
    // List all files in the directory
    const result = await Filesystem.readdir({
      path: sourcePath,
      directory: Directory.Data,
    });

    // Loop through the files array in ReaddirResult
    for (const fileInfo of result.files) {
      // Make sure we're only dealing with files, not directories
      if (fileInfo.type === "file") {
        const filePath = `${sourcePath}/${fileInfo.name}`;

        // Read the file and encode it as Base64
        const fileData = await Filesystem.readFile({
          path: filePath,
          directory: Directory.Data,
        });

        let encodedData: string;
        if (typeof fileData.data === "string") {
          // If fileData.data is a string, use it directly
          encodedData = fileData.data;
        } else if (fileData.data instanceof Blob) {
          // If fileData.data is a Blob, convert it to a Base64 string
          encodedData = await blobToBase64(fileData.data);
        } else {
          throw new Error("Unsupported file data type");
        }

        // Store base64-encoded file data in assets
        assets[fileInfo.name] = encodedData;
      }
    }
  } catch (error) {
    console.error(`Error reading assets from ${sourcePath}:`, error);
  }

  return assets;
};

// Utility function to convert a Blob to a Base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (typeof base64String === "string") {
        resolve(base64String.split(",")[1]); // Remove the data URI prefix if present
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
      data: base64Data, // Direct binary string
      directory: Directory.Data,
    });
  } catch (error) {
    console.error("Error writing file:", error);
  }
};

export const useImportBea = () => {
  const importUtils = async (
    setNotesState: (notes: Record<string, Note>) => void,
    loadNotes: () => Promise<Record<string, Note>>, // Existing notes loader
    fileContent: string // UTF-8 file content
  ) => {
    try {
      const parsedData = JSON.parse(fileContent);

      // Debug parsed data
      console.log("Parsed Data:", JSON.stringify(parsedData, null, 2));

      // Replace assets:// and file-assets:// prefixes in the parsed data
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

      // Validate the parsed data structure
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

      // Structure the note for merging
      const importedNotes = { [parsedData.data.id]: parsedData.data };

      // Handle assets for the note (but don't include them in the data.json)
      for (const noteId in importedNotes) {
        const note = importedNotes[noteId];

        const noteAssetsFolder = `note-assets/${noteId}`;
        const fileAssetsFolder = `file-assets/${noteId}`;

        // Create folders for note assets
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

        // Save assets if available (but don't add them to the note in data.json)
        if (note.assets) {
          // Save note-specific assets (e.g., images)
          if (note.assets.notesAssets) {
            for (const assetName in note.assets.notesAssets) {
              const base64Data = note.assets.notesAssets[assetName];
              await base64ToFile(
                base64Data,
                `${noteAssetsFolder}/${assetName}`
              );
            }
          }

          // Save file-specific assets (e.g., PDFs, etc.)
          if (note.assets.fileAssets) {
            for (const assetName in note.assets.fileAssets) {
              const base64Data = note.assets.fileAssets[assetName];
              await base64ToFile(
                base64Data,
                `${fileAssetsFolder}/${assetName}`
              );
            }
          }

          // Remove assets field from the note (do not include in data.json)
          delete note.assets;
        }
      }

      // Modify the content links of the notes that are about to be merged (import mode)
      const notesToMerge = Object.keys(importedNotes).reduce((acc) => {
        const note = { ...importedNotes };

        acc = note;
        return acc;
      }, {});

      // Merge with existing notes (without assets and with modified links)
      const existingNotes = await loadNotes();
      console.log("Existing Notes:", JSON.stringify(existingNotes, null, 2));

      const mergedNotes = { ...existingNotes, ...notesToMerge };

      // Write updated notes back to data.json (without assets)
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes: mergedNotes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // Debug merged notes
      console.log("Merged Notes:", JSON.stringify(mergedNotes, null, 2));

      // Update application state
      setNotesState(mergedNotes);

      // Trigger UI update
      const noteId = parsedData.data.id;
      const event = new CustomEvent("notelink", { detail: { noteId } });
      document.dispatchEvent(event);
    } catch (error) {
      console.error(error);
    }
  };

  return { importUtils };
};
