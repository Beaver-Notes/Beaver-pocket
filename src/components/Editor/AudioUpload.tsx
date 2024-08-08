import React, { useState, useEffect } from "react";
import { Plugins } from "@capacitor/core";
import { FilesystemDirectory } from "@capacitor/filesystem";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Pre-request audio recording permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await VoiceRecorder.requestAudioRecordingPermission();
      setHasPermission(permission.value);
    };
    checkPermission();
  }, []);


  const startRecording = async () => {
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
      <div className="flex items-center justify-between sm:p-2 p-1 rounded-md sm:text-white bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
        {!isRecording ? (
          <button onClick={startRecording} disabled={isProcessing}>
            {isProcessing ? (
              <icons.Spinner className="text-xl w-8 h-8 cursor-pointer animate-spin" />
            ) : (
              <icons.MicLineIcon className="text-xl w-8 h-8 cursor-pointer" />
            )}
          </button>
        ) : (
          <button onClick={stopRecording} disabled={isProcessing}>
            {isProcessing ? (
              <icons.Spinner className="text-xl w-8 h-8 cursor-pointer animate-spin" />
            ) : (
              <icons.StopCircleLineIcon className="text-xl w-8 h-8 cursor-pointer" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioUploadComponent;
