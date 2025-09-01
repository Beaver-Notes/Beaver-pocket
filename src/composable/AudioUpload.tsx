import React, { useState, useRef, useEffect } from "react";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import Popover from "@/components/ui/Popover";
import { VoiceRecorder } from "capacitor-voice-recorder";
import Icon from "@/components/ui/Icon";

interface FileUploadProps {
  onAudioUpload: (fileUrl: string, fileName: string) => void;
  noteId: string;
  translations?: any;
}

const AudioUploadComponent: React.FC<FileUploadProps> = ({
  onAudioUpload,
  noteId,
  translations = {},
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ⏱ Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, isPaused]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const requestPermission = async () => {
    if (hasPermission === null) {
      const permission = await VoiceRecorder.requestAudioRecordingPermission();
      setHasPermission(permission.value);
      return permission.value;
    }
    return hasPermission;
  };

  const startRecording = async () => {
    const ok = await requestPermission();
    if (!ok) return;

    setIsProcessing(true);
    try {
      await VoiceRecorder.startRecording();
      setIsRecording(true);
      setElapsed(0);
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
        const fileName = `${Date.now()}.aac`;
        const filePath = `file-assets/${noteId}/${fileName}`;
        await Filesystem.writeFile({
          path: filePath,
          data: recordDataBase64,
          directory: FilesystemDirectory.Data,
          recursive: true,
        });
        onAudioUpload(filePath, fileName);
      }
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const pauseResume = () => {
    setIsPaused((p) => !p);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      onAudioUpload(URL.createObjectURL(file), file.name);
    }
  };

  return (
    <div
      className={`flex items-center space-x-2 ${
        isRecording ? "bg-primary rounded-full" : ""
      }`}
    >
      {isRecording ? (
        <>
          {/* Stop Recording */}
          <button
            onClick={stopRecording}
            disabled={isProcessing}
            className="transition hoverable h-8 px-1 flex items-center justify-center rounded-full bg-primary"
            aria-label={translations?.menu?.record || "Stop Recording"}
          >
            <Icon name="StopCircleLine" className="text-white" />
          </button>

          {/* Timer */}
          <span className="font-secondary font-semibold text-sm text-white">
            {formatTime(elapsed)}
          </span>

          {/* Pause / Resume */}
          <button
            onClick={pauseResume}
            className={`transition hoverable h-8 px-1 flex items-center justify-center rounded-full ${
              isPaused
                ? "bg-primary text-[color:var(--selected-dark-text)]"
                : "hover"
            }`}
            aria-label={
              isPaused
                ? translations?.menu?.resume || "Resume"
                : translations?.menu?.pause || "Pause"
            }
          >
            <Icon
              name={isPaused ? "PlayFill" : "PauseLine"}
              className="text-white"
            />
          </button>
        </>
      ) : (
        <>
          {/* Popover menu when not recording */}
          <Popover
            placement="bottom"
            trigger="click"
            triggerContent={
              <button
                className="flex items-center justify-between p-1 rounded-md hoverable bg-transparent cursor-pointer text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                aria-label={translations?.menu?.audio || "Audio"}
              >
                <Icon name="MicLine" />
              </button>
            }
          >
            {/* Start Recording */}
            <button
              onClick={startRecording}
              className="flex items-center p-1 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200"
            >
              <Icon name="MicLine" />
              <p className="font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)] pl-2">
                {translations?.menu?.startRecording || "Record"}
              </p>
            </button>

            {/* Upload Audio */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center p-1 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200"
            >
              <Icon name="File" />
              <p className="font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)] pl-2">
                {" "}
                {translations?.menu?.uploadAudio || "Upload"}
              </p>
            </button>
          </Popover>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*"
            multiple
            onChange={handleFileSelect}
          />
        </>
      )}
    </div>
  );
};

export default AudioUploadComponent;
