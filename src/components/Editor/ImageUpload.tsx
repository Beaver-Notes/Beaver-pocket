import React from "react";
import { Plugins } from "@capacitor/core";
import { Directory, FilesystemDirectory } from "@capacitor/filesystem";
import icons from "../../lib/remixicon-react";

const { Filesystem } = Plugins;

interface ImageUploadProps {
  onImageUpload: (imageUrl: string, fileUri: string) => void;
  noteId: string;
  menu?: boolean;
  translations?: any;
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

  return (
    <div>
      {/* Conditionally render content based on `menu` value */}
      {menu ? (
        <div className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200">
          <label
            htmlFor="image-upload-input"
            className="flex items-center cursor-pointer"
          >
            {/* Icon */}
            <icons.ImageLineIcon className="text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 mr-3" />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3 className="font-medium text-neutral-900 dark:text-[color:var(--selected-dark-text)]">
                {translations.menuItems.imageLabel}
              </h3>
              <p className="text-sm text-neutral-500">
                {translations.menuItems.imageDescription}
              </p>
            </div>
          </label>

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
        <div className="flex items-center justify-between sm:p-2 md:p-2 p-1 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
          <label htmlFor="image-upload-input">
            <icons.ImageLineIcon className="sm:text-white text-xl border-none dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 sm:w-7 md:w-7 sm:h-7 md:h-7 cursor-pointer" />
          </label>
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
