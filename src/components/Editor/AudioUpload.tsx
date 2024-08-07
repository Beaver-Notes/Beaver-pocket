import React, { useState } from "react";
import { Plugins } from "@capacitor/core";
import { Directory, FilesystemDirectory } from "@capacitor/filesystem";
import { VoiceRecorder } from "capacitor-voice-recorder";
import icons from "../../lib/remixicon-react";

const { Filesystem } = Plugins;

interface FileUploadProps {
  onAudioUpload: (fileUrl: string, fileName: string) => void;
  noteId: string;
}

const AudioUploadComponent: React.FC<FileUploadProps> = ({
  onAudioUpload,
  noteId,
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const { fileUrl, fileName } = await saveFileToFileSystem(file);
      onAudioUpload(fileUrl, fileName);
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

  const startRecording = async () => {
    const hasPermission = await VoiceRecorder.requestAudioRecordingPermission();
    if (hasPermission.value) {
      setIsRecording(true);
      await VoiceRecorder.startRecording();
    } else {
      console.error("Recording permission denied");
    }
  };

  const stopRecording = async () => {
    const recording = await VoiceRecorder.stopRecording();
    if (recording.value) {
      const { recordDataBase64 } = recording.value;
      const fileName = `${Date.now()}.aac`; // Assuming AAC format
      const filePath = `file-assets/${noteId}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: recordDataBase64,
        directory: FilesystemDirectory.Data,
        recursive: true,
      });
      setIsRecording(false);
      onAudioUpload(filePath, fileName);
    } else {
      console.error("Recording failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between sm:p-2 p-1 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
        <label htmlFor="file-upload-input">
          <icons.FileIcon className="sm:text-white text-xl sm:w-7 sm:h-7 border-none dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          id="file-upload-input"
          className="hidden"
        />
        {!isRecording ? (
          <button onClick={startRecording}>
            <icons.MicLineIcon className="text-xl w-8 h-8 cursor-pointer" />
          </button>
        ) : (
          <button onClick={stopRecording}>
            <icons.StopCircleLineIcon className="text-xl w-8 h-8 cursor-pointer" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioUploadComponent;
