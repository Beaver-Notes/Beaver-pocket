import React, { useState } from "react";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { VoiceRecorder } from "capacitor-voice-recorder";
import icons from "../lib/remixicon-react";

interface FileUploadProps {
  onAudioUpload: (fileUrl: string, fileName: string) => void;
  noteId: string;
  translations?: any;
}

const AudioUploadComponent: React.FC<FileUploadProps> = ({
  onAudioUpload,
  noteId,
  translations,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const startRecording = async () => {
    if (hasPermission === null) {
      const permission = await VoiceRecorder.requestAudioRecordingPermission();
      setHasPermission(permission.value);
      if (!permission.value) {
        console.error("Recording permission not granted");
        return;
      }
    }

    if (!hasPermission) {
      console.error("Recording permission not granted");
      return;
    }

    setIsProcessing(true);
    try {
      await VoiceRecorder.startRecording();
      setIsRecording(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    setIsProcessing(true);
    try {
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
        onAudioUpload(filePath, fileName);
      } else {
        console.error("Recording failed");
      }
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between p-1 rounded-md  bg-transparent cursor-pointer text-neutral-700 dark:dark:text-[color:var(--selected-dark-text)] text-neutral-800">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            aria-label={
              isProcessing
                ? translations.accessibility.processing
                : translations.accessibility.startRecording
            }
            aria-disabled={isProcessing}
          >
            {isProcessing ? (
              <icons.Spinner className="text-xl w-7 h-7 cursor-pointer animate-spin" />
            ) : (
              <icons.MicLineIcon className="text-xl w-7 h-7 cursor-pointer" />
            )}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            disabled={isProcessing}
            aria-label={
              isProcessing
                ? translations.accessibility.processing
                : translations.accessibility.stopRecording
            }
            aria-disabled={isProcessing}
          >
            {isProcessing ? (
              <icons.Spinner className="text-xl w-7 h-7 cursor-pointer animate-spin" />
            ) : (
              <icons.StopCircleLineIcon className="text-xl w-7 h-7 cursor-pointer" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioUploadComponent;
