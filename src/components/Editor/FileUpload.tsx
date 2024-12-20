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
  menu = false,
  translations = {}, // Default empty object to avoid undefined errors
}) => {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]; // Use optional chaining
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
    } catch (error) {
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

          // Write file to filesystem under "file-assets/noteId" directory
          const filePath = `file-assets/${noteId}/${fileName}`;
          try {
            await Filesystem.writeFile({
              path: filePath,
              data: fileDataUrl.split(",")[1], // Write only base64 data
              directory: FilesystemDirectory.Data,
              recursive: true,
            });

            resolve({ fileUrl: filePath, fileName });
          } catch (error) {
            console.error("Error writing file to filesystem:", error);
            reject(error); // Reject promise on error
          }
        };

        fileReader.onerror = (error) => {
          console.error("Error reading file:", error);
          reject(error); // Reject promise on error
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
        <div
          className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200"
          aria-label={translations.menuItems?.fileLabel || "Upload File"}
        >
          <label
            htmlFor="file-upload-input"
            className="flex items-center cursor-pointer"
            aria-label={translations.menuItems?.fileLabel || "Upload a file"}
          >
            {/* Icon */}
            <icons.FileIcon
              className="text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 mr-3"
              aria-hidden="true"
            />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3
                className="font-medium text-neutral-900 dark:text-[color:var(--selected-dark-text)]"
                aria-hidden="true" // Hidden from screen readers
              >
                {translations.menuItems?.fileLabel || "Upload File"}
              </h3>
            </div>
          </label>

          {/* Hidden File Input */}
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
            aria-label={
              translations.accessibility?.fileUploadInput || "Upload a file"
            } // Use fallback
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-2 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
          aria-label={translations.accessibility?.fileUpload || "Upload File"} // Use fallback
        >
          <label
            htmlFor="file-upload-input"
            aria-label={translations.menuItems?.fileLabel || "Upload File"} // Use fallback
          >
            <icons.FileIcon
              className="sm:text-white text-xl border-none dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 sm:w-7 md:w-7 sm:h-7 md:h-7 cursor-pointer"
              aria-hidden="true"
            />
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
            aria-label={
              translations.accessibility?.fileUploadInput || "Upload a file"
            } // Use fallback
          />
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
