import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Filesystem, Directory } from "@capacitor/filesystem";

interface VideoPlayerProps extends NodeViewProps {}

const VideoComponent: React.FC<VideoPlayerProps> = ({ node }) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoPlayer = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (node.attrs.src) {
      fetchVideo();
    }
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [node.attrs.src]);

  const fetchVideo = async () => {
    try {
      const fileUri = node.attrs.src;
      const { data } = await Filesystem.readFile({
        path: fileUri,
        directory: Directory.Data,
      });

      let videoData: Blob;
      if (typeof data === "string") {
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        videoData = new Blob([byteArray], { type: "video/mp4" });
      } else {
        throw new Error("Unsupported data type");
      }

      const url = URL.createObjectURL(videoData);
      setVideoSrc(url);

      const tempVideo = document.createElement("video");
      tempVideo.src = url;
      tempVideo.addEventListener("loadedmetadata", () => {
      });
      tempVideo.addEventListener("error", (e) => {
        console.error("Error loading video metadata:", e);
      });
    } catch (error) {
      console.error("Error fetching video file:", error);
    }
  };

  return (
<NodeViewWrapper>
  <div className="bg-neutral-100 dark:bg-[#353333] rounded-lg flex flex-col w-full">
    {/* Video Container */}
    <div className="relative w-full">
      <video
        id="videoPlayer"
        ref={videoPlayer}
        src={videoSrc || undefined}
        controls
        className="w-full rounded-lg m-0"
        onError={(e) => console.error("Error loading video metadata:", e)}
      />
    </div>
  </div>
</NodeViewWrapper>
  );
};

export default VideoComponent;
