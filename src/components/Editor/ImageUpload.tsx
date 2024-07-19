import React from "react";
import { Plugins } from "@capacitor/core";
import { Directory, FilesystemDirectory } from "@capacitor/filesystem";
import icons from "../../lib/remixicon-react";

const { Filesystem } = Plugins;

interface ImageUploadProps {
  onImageUpload: (imageUrl: string, fileUri: string) => void;
  noteId: string; // New prop to hold the note ID
}

const ImageUploadComponent: React.FC<ImageUploadProps> = ({
  onImageUpload,
  noteId,
}) => {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const { imageUrl, fileUri } = await saveImageToFileSystem(file);
      onImageUpload(imageUrl, fileUri);
    }
  };

  async function createDirectory() {
    const directoryPath = `note-assets/${noteId}`;

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

  const saveImageToFileSystem = async (
    file: File
  ): Promise<{ imageUrl: string; fileUri: string }> => {
    try {
      await createDirectory();
      const fileName = `${Date.now()}_${file.name}`;

      // Read file data as base64 encoded string
      const reader = new FileReader();
      reader.readAsDataURL(file);

      // Wait for reader to load the file data
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => resolve();
        reader.onerror = () => reject(new Error("Error reading file"));
      });

      // Get base64 encoded string
      const base64Data = reader.result as string;

      // Extract the actual base64 data (remove metadata)
      const base64DataWithoutMetadata = base64Data.split(",")[1];

      // Write file to filesystem under "note-assets/noteId" directory
      const filePath = `note-assets/${noteId}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: base64DataWithoutMetadata,
        directory: FilesystemDirectory.Data,
        recursive: true,
      });

      // Read the saved file to get its URL
      const { uri } = await Filesystem.getUri({
        directory: FilesystemDirectory.Data,
        path: filePath,
      });

      console.log("upload", uri);

      // const imageUrl = Capacitor.convertFileSrc(uri); // Convert file URI to displayable URL
      return { imageUrl: filePath, fileUri: uri };
    } catch (error) {
      console.error("Error saving image to file system:", error);
      return { imageUrl: "", fileUri: "" };
    }
  };

  return (
    <>
      <div className="flex items-center justify-between sm:p-2 p-1 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
        <label htmlFor="image-upload-input">
          <icons.ImageLineIcon className="sm:text-white text-xl sm:w-7 sm:h-7 border-none dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          id="image-upload-input"
          className="hidden"
        />
      </div>
    </>
  );
};

export default ImageUploadComponent;
