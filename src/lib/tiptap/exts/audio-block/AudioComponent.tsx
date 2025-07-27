import React, {
  useState,
  useRef,
  useEffect,
  MouseEvent,
  TouchEvent,
} from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import VolumeUpLineIcon from "remixicon-react/VolumeUpLineIcon";
import { Filesystem, Directory } from "@capacitor/filesystem";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";

interface AudioPlayerProps extends NodeViewProps {}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ node }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [, setPlaybackRateState] = useState(1);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const playbackRates = [0.5, 1, 1.5, 2];
  const [progressBarWidth, setProgressBarWidth] = useState("0%");
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (node.attrs.src) {
      fetchAudio();
    }
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [node.attrs.src]);

  const fetchAudio = async () => {
    try {
      const fileUri = node.attrs.src;
      const { data } = await Filesystem.readFile({
        path: fileUri,
        directory: Directory.Data,
      });

      let audioData: Blob;
      if (typeof data === "string") {
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioData = new Blob([byteArray], { type: "audio/mp3" });
      } else {
        throw new Error("Unsupported data type");
      }

      const url = URL.createObjectURL(audioData);
      setAudioSrc(url);

      const tempAudio = new Audio(url);
      tempAudio.addEventListener("loadedmetadata", () => {
        setDuration(tempAudio.duration);
      });
      tempAudio.addEventListener("error", (e) => {
        console.error("Error loading audio metadata:", e);
      });
    } catch (error) {
      console.error("Error fetching audio file:", error);
    }
  };

  const togglePlay = () => {
    if (audioPlayer.current) {
      if (isPlaying) {
        audioPlayer.current.pause();
      } else {
        audioPlayer.current.play().catch((error) => {
          console.error("Error attempting to play audio:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const updateProgress = () => {
    if (audioPlayer.current) {
      setCurrentTime(audioPlayer.current.currentTime);
      setProgressBarWidth(
        `${(audioPlayer.current.currentTime / duration) * 100}%`
      );
    }
  };

  const seek = (
    event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
  ) => {
    const progressBar = event.currentTarget;
    const boundingRect = progressBar.getBoundingClientRect();
    const offsetX =
      "clientX" in event
        ? event.clientX - boundingRect.left
        : event.touches[0].clientX - boundingRect.left;
    const newTime = (offsetX / progressBar.offsetWidth) * duration;
    if (audioPlayer.current) {
      audioPlayer.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgressBarWidth(`${(newTime / duration) * 100}%`);
    }
  };

  const startDrag = (
    event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
  ) => {
    const progressBar = event.currentTarget;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const boundingRect = progressBar.getBoundingClientRect();
      const offsetX =
        "clientX" in moveEvent
          ? moveEvent.clientX - boundingRect.left
          : moveEvent.touches[0].clientX - boundingRect.left;
      const newTime = (offsetX / progressBar.offsetWidth) * duration;
      if (audioPlayer.current) {
        audioPlayer.current.currentTime = newTime;
        setCurrentTime(newTime);
        setProgressBarWidth(`${(newTime / duration) * 100}%`);
      }
    };

    const onUp = () => {
      // @ts-ignore
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // @ts-ignore
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
    // @ts-ignore
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    // @ts-ignore
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);
  };

  const audioEnded = () => {
    setIsPlaying(false);
  };

  const toggleMute = () => {
    if (audioPlayer.current) {
      setIsMuted(!isMuted);
      audioPlayer.current.muted = !isMuted;
    }
  };

  const toggleSpeedOptions = () => {
    setShowSpeedOptions(!showSpeedOptions);
  };

  const setPlaybackRate = (speed: number) => {
    setPlaybackRateState(speed);
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate = speed;
    }
    setShowSpeedOptions(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const [translations, setTranslations] = useState<Record<string, any>>({
    accessibility: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  return (
    <NodeViewWrapper>
      <div className="mt-2 mb-2 bg-neutral-100 dark:bg-[#353333] p-3 rounded-lg flex flex-row items-center justify-between w-full">
        <audio
          id="audioPlayer"
          ref={audioPlayer}
          className="hidden"
          src={audioSrc || undefined}
          onTimeUpdate={updateProgress}
          onLoadedMetadata={updateProgress}
          onEnded={audioEnded}
        />
        <button
          className="bg-primary text-white p-2 rounded-full mr-2"
          onClick={togglePlay}
          aria-label={
            isPlaying
              ? translations.accessibility.pauseAudio
              : translations.accessibility.pauseAudio
          }
        >
          {isPlaying ? <Icon name="PauseLine" /> : <Icon name="PlayLine" />}
        </button>
        <span
          className="mr-2 text-sm text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
          aria-live="polite"
          aria-label={`${translations.accessibility.currentTime} ${formatTime(
            currentTime
          )}`}
        >
          {formatTime(currentTime)}
        </span>
        <div
          className="flex w-full mx-0 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700 relative"
          role="progressbar"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          onClick={seek}
          onTouchStart={startDrag}
        >
          <div
            className="flex flex-col justify-center rounded-full bg-primary text-xs text-white text-center transition duration-500 dark:bg-primary"
            style={{ width: progressBarWidth }}
          />
          <div
            className="absolute top-0 left-0 h-full w-4 bg-secondary rounded-full transform -translate-x-1/2"
            style={{ left: progressBarWidth }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          />
        </div>
        <span
          className="ml-2 text-sm text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
          aria-live="polite"
          aria-label={`${translations.accessibility.timeRemaining} ${formatTime(
            duration - currentTime
          )}`}
        >
          {formatTime(duration - currentTime)}
        </span>
        <button
          className="ml-2"
          onClick={toggleMute}
          aria-label={
            isMuted
              ? translations.accessibility.unmute
              : translations.accessibility.mute
          }
        >
          {isMuted ? (
            <Icon name="VolumeMuteLine" className="w-6 h-6" />
          ) : (
            <VolumeUpLineIcon className="w-6 h-6" />
          )}
        </button>
        <button
          className="ml-2"
          onClick={toggleSpeedOptions}
          aria-label={translations.accessibility.playbackspeed}
        >
          <Icon name="SpeedLine" className="w-6 h-6" />
        </button>
      </div>
      {showSpeedOptions && (
        <div className="right-0 mt-2 bg-neutral-100 dark:bg-[#353333] border border-gray-300 dark:border-neutral-600 shadow-lg rounded-lg z-10">
          {playbackRates.map((rate) => (
            <button
              key={rate}
              className="block px-4 py-2 text-gray-800 dark:text-[color:var(--selected-dark-text)]"
              onClick={() => setPlaybackRate(rate)}
              aria-label={`${translations.accessibility.setSpeed} ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default AudioPlayer;
