import {
  Directory,
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";

export const saveImageToFileSystem = async (
  file: File,
  noteId: string
): Promise<{ imageUrl: string; fileUri: string }> => {
  try {
    // Ensure the directory exists
    await createImageDirectory(noteId);

    // Construct the filename and path for the image
    const fileName = `${Date.now()}_${file.name}`;
    const relativeFilePath = `note-assets/${noteId}/${fileName}`;

    // Read file data as a base64 encoded string
    const reader = new FileReader();
    reader.readAsDataURL(file);

    // Wait for reader to load the file data
    await new Promise<void>((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = () => reject(new Error("Error reading file"));
    });

    // Get the base64 data (strip metadata)
    const base64Data = reader.result as string;
    const base64DataWithoutMetadata = base64Data.split(",")[1];

    // Write file to filesystem
    await Filesystem.writeFile({
      path: relativeFilePath,
      data: base64DataWithoutMetadata,
      directory: FilesystemDirectory.Data,
      recursive: true,
    });

    // Get the URL of the saved file
    const { uri } = await Filesystem.getUri({
      directory: FilesystemDirectory.Data,
      path: relativeFilePath,
    });

    console.log("Saved file URI:", uri);

    // Return the relative path and full URI
    return { imageUrl: relativeFilePath, fileUri: uri };
  } catch (error) {
    console.error("Error saving image to file system:", error);
    return { imageUrl: "", fileUri: "" };
  }
};

export const saveFileToFileSystem = async (
  file: File,
  noteId: string
): Promise<{ fileUrl: string; fileName: string }> => {
  try {
    await createDirectory(noteId);
    const fileName = `${Date.now()}_${file.name}`;

    // Read file contents as data URL
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);

    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        const fileDataUrl = fileReader.result as string;

        // Write file to filesystem under "note-assets/noteId" directory
        const filePath = `file-assets/${noteId}/${fileName}`;
        await Filesystem.writeFile({
          path: filePath,
          data: fileDataUrl, // Write the data URL instead of the file object
          directory: FilesystemDirectory.Data,
          recursive: true,
        });

        resolve({ fileUrl: filePath, fileName: file.name });
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  } catch (error) {
    console.error("Error saving file to file system:", error);
    return { fileUrl: "", fileName: "" };
  }
};

async function createDirectory(noteId: string): Promise<void> {
  const directoryPath = `file-assets/${noteId}`;

  try {
    await Filesystem.mkdir({
      path: directoryPath,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (error: unknown) {
    console.error("Error creating the directory:", error);
  }
}

const createImageDirectory = async (noteId: string) => {
  try {
    await Filesystem.mkdir({
      path: `note-assets/${noteId}`,
      directory: FilesystemDirectory.Data,
      recursive: true,
    });
  } catch (e) {
    console.error("Error creating directory:", e);
  }
};
