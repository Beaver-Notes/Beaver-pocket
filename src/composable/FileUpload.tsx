import React from "react";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import Icon from "@/components/ui/Icon";

interface FileUploadProps {
  onFileUpload: (fileUrl: string, fileName: string, file: any) => void;
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
      onFileUpload(fileUrl, fileName, file);
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

  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onMouseDown={preventFocusLoss} onTouchStart={preventFocusLoss}>
      {/* Conditionally render content based on `menu` value */}
      {menu ? (
        <div
          className="flex items-center rounded-lg transition"
          aria-label={translations.menu.file || "Upload File"}
        >
          <label
            htmlFor="file-upload-input"
            className="text-left flex overflow-hidden text-ellipsis whitespace-nowrap"
            aria-label={translations.menu.file || "Upload a file"}
          >
            {/* Icon */}
            <Icon name="File" className={`mr-2 ltr:ml-2 text-lg`} />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-medium" aria-hidden="true">
                {translations.menu.file || "Upload File"}
              </h3>
            </div>
          </label>

          {/* Hidden File Input */}
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
            aria-label={translations.menu.file || "Upload a file"} // Use fallback
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-1 rounded-md hoverable bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
          aria-label={translations.menu.file || "Upload File"} // Use fallback
        >
          <label
            htmlFor="file-upload-input"
            aria-label={translations.menu.file || "Upload File"} // Use fallback
          >
            <Icon name="File" />
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            id="file-upload-input"
            className="hidden"
            aria-label={translations.menu.file || "Upload a file"} // Use fallback
          />
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;
