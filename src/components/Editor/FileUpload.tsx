import React from "react";
import { Plugins } from "@capacitor/core";
import { Directory, FilesystemDirectory } from "@capacitor/filesystem";
import FileIcon from "remixicon-react/FileLineIcon";

const { Filesystem } = Plugins;

interface FileUploadProps {
  onFileUpload: (fileUrl: string, fileName: string) => void;
  noteId: string; // New prop to hold the note ID
}

const FileUploadComponent: React.FC<FileUploadProps> = ({
  onFileUpload,
  noteId,
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
          const filePath = `file-assets/${fileName}`;
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
      <div className="p-[11px] hidden sm:block rounded-full cursor-pointer">
        <label htmlFor="file-upload-input">
          <FileIcon className="border-none text-white text-xl w-7 h-7 cursor-pointer" />
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          id="file-upload-input"
          className="hidden"
        />
      </div>
      <div className="p-[11px] sm:hidden rounded-full cursor-pointer">
        <label htmlFor="file-upload-input">
          <FileIcon className="border-none text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          id="file-upload-input"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUploadComponent;
