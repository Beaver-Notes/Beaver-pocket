import React from "react";
import {
  Directory,
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import Icon from "@/components/UI/Icon";

interface FileUploadProps {
  onVideoUpload: (fileUrl: string) => void;
  noteId: string;
  menu?: boolean;
  translations?: any;
}

const VideoUploadComponent: React.FC<FileUploadProps> = ({
  onVideoUpload,
  noteId,
  menu,
  translations,
}) => {
  const handleVideoInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const { fileUrl } = await saveFileToFileSystem(file);
      onVideoUpload(fileUrl);
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

      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      return new Promise((resolve, reject) => {
        fileReader.onload = async () => {
          const fileDataUrl = fileReader.result as string;

          const filePath = `file-assets/${noteId}/${fileName}`;
          await Filesystem.writeFile({
            path: filePath,
            data: fileDataUrl,
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
        <div className="flex items-center rounded-lg transition">
          <button
            onClick={() => {
              const inputElement = document.getElementById(
                "video-upload-input"
              ) as HTMLInputElement | null;
              if (inputElement) {
                inputElement.click();
              }
            }}
            className="flex items-center cursor-pointer"
            aria-label={translations.menu.video}
          >
            {/* Icon */}
            <Icon name="Video" className={`mr-2 ltr:ml-2 text-lg`} />

            {/* Text Container */}
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-medium">{translations.menu.video}</h3>
            </div>
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            onChange={handleVideoInputChange}
            id="video-upload-input"
            className="hidden"
            aria-label={translations.menu.video}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-1 rounded-md  bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
          <button
            onClick={() => {
              const inputElement = document.getElementById(
                "video-upload-input"
              ) as HTMLInputElement | null;
              if (inputElement) {
                inputElement.click();
              }
            }}
            aria-label={translations.menu.video}
          >
            <Icon name="Video" />
          </button>
          <input
            type="file"
            onChange={handleVideoInputChange}
            id="video-upload-input"
            className="hidden"
            aria-label={translations.menu.video}
          />
        </div>
      )}
    </div>
  );
};

export default VideoUploadComponent;
