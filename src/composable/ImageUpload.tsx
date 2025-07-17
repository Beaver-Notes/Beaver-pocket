import React from "react";
import { Directory, Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import icons from "../lib/remixicon-react";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string, fileUri: string) => void;
  noteId: string;
  menu?: boolean;
  translations: any;
}

const ImageUploadComponent: React.FC<ImageUploadProps> = ({
  onImageUpload,
  noteId,
  translations,
  menu = false, // default value for the `menu` prop
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

      return { imageUrl: filePath, fileUri: uri };
    } catch (error) {
      console.error("Error saving image to file system:", error);
      return { imageUrl: "", fileUri: "" };
    }
  };

  // Function to trigger the file input click
  const triggerFileInput = () => {
    const inputElement = document.getElementById(
      "image-upload-input"
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.click();
    }
  };

  return (
    <div>
      {/* Conditionally render content based on `menu` value */}
      {menu ? (
        <div className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200">
          <button
            onClick={triggerFileInput}
            className="flex items-center cursor-pointer"
            aria-label={translations.menu.image}
          >
            {/* Icon */}
            <icons.ImageLineIcon
              className="text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 mr-3"
              aria-hidden="true"
            />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3 className="font-medium text-neutral-900 dark:text-[color:var(--selected-dark-text)]">
                {translations.menu.image}
              </h3>
            </div>
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            id="image-upload-input"
            className="hidden"
          />
        </div>
      ) : (
        // Default image upload component
        <div className="flex items-center justify-between p-1 rounded-md  bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
          <button
            onClick={triggerFileInput}
            aria-label={translations.menu.image}
          >
            <icons.ImageLineIcon
              className="text-xl border-none dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7 cursor-pointer"
              aria-hidden="true"
            />
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            id="image-upload-input"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploadComponent;
