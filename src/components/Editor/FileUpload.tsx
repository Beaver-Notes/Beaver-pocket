import React from "react";
import { Plugins } from "@capacitor/core";
import { Directory, FilesystemDirectory } from "@capacitor/filesystem";
import icons from "../../lib/remixicon-react";

const { Filesystem } = Plugins;

interface FileUploadProps {
  onFileUpload: (fileUrl: string, fileName: string) => void;
  noteId: string;
  menu?: boolean;
  translations?: any;
}

const FileUploadComponent: React.FC<FileUploadProps> = ({
  onFileUpload,
  noteId,
  menu,
  translations,
}) => {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const { fileUrl, fileName } = await saveFileToFileSystem(file);
      onFileUpload(fileUrl, fileName);
    }
  };

  async function createDirectory() {
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

  const saveFileToFileSystem = async (
    file: File
  ): Promise<{ fileUrl: string; fileName: string }> => {
    try {
      await createDirectory();
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

  return (
    <div>
      {/* Conditionally render content based on `menu` value */}
      {menu ? (
        <div className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#353333] transition duration-200">
          <label
            htmlFor="file-upload-input"
            className="flex items-center cursor-pointer"
          >
            {/* Icon */}
            <icons.FileIcon className="text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 mr-3" />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3 className="font-medium text-gray-900 dark:text-[color:var(--selected-dark-text)]">
                {translations.menuItems.fileLabel}
              </h3>
              <p className="text-sm text-gray-500">
                {translations.menuItems.fileDescription}
              </p>
            </div>
          </label>

          {/* Hidden File Input */}
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between sm:p-2 md:p-2 p-1 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
          <label htmlFor="file-upload-input">
            <icons.FileIcon className="sm:text-white text-xl  border-none dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 sm:w-7 md:w-7 sm:h-7 md:h-7cursor-pointer" />
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
