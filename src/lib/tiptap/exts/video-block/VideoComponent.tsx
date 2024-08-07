import React, { useRef, useState, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Filesystem, Directory } from '@capacitor/filesystem';

const VideoComponent: React.FC<{ node: any; updateAttributes: any }> = ({
  node,
}) => {
  const videoPlayer = useRef<HTMLVideoElement>(null);
  const [, setIsPlaying] = useState(false);
  const [, setCurrentTime] = useState(0);
  const [, setDuration] = useState(0);
  const [playbackRate] = useState(1);
  const [videoSrc, setVideoSrc] = useState('');

  useEffect(() => {
    if (node.attrs.src) {
      loadVideo(node.attrs.src);
    }
  }, [node.attrs.src]);

  useEffect(() => {
    if (videoPlayer.current) {
      videoPlayer.current.volume = 1;
      videoPlayer.current.playbackRate = playbackRate;
      preloadVideo();
    }
  }, [videoSrc, playbackRate]);

  const loadVideo = async (path: string) => {
    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data,
      });
      setVideoSrc(`data:video/mp4;base64,${result.data}`);
    } catch (e) {
      console.error('Unable to read file', e);
    }
  };

  const updateProgress = () => {
    if (videoPlayer.current) {
      setCurrentTime(videoPlayer.current.currentTime);
    }
  };

  const preloadVideo = () => {
    const tempVideo = document.createElement('video');
    tempVideo.src = videoSrc;

    tempVideo.addEventListener('loadedmetadata', () => {
      if (!isNaN(tempVideo.duration) && tempVideo.duration > 0) {
        setDuration(tempVideo.duration);
      } else {
        console.error('Invalid video duration');
      }
    });

    tempVideo.addEventListener('error', (event) => {
      console.error('Error loading video metadata:', event);
    });
  };

  const videoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <NodeViewWrapper as="div" className="bg-neutral-100 dark:bg-[#353333] rounded-lg flex flex-col w-full">
      <div className="relative w-full">
        <video
          id="videoPlayer"
          ref={videoPlayer}
          src={videoSrc}
          controls
          className="w-full rounded-lg m-0"
          onTimeUpdate={updateProgress}
          onLoadedMetadata={() => setDuration(videoPlayer.current?.duration || 0)}
          onEnded={videoEnded}
          onError={() => console.error('Video error')}
        ></video>
      </div>
    </NodeViewWrapper>
  );
};

export default VideoComponent;
