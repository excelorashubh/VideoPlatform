"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { getStoredSessionToken, registerVideoView } from "../../../lib/api";

export function VideoPlayer({ source, poster, videoId }: { source: string | null; poster: string | null; videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const countedRef = useRef(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !source) return;
    const onTimeUpdate = () => {
      if (!countedRef.current && element.currentTime >= 5 && getStoredSessionToken()) {
        countedRef.current = true;
        void registerVideoView(videoId);
      }
    };
    element.addEventListener("timeupdate", onTimeUpdate);
    if (element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = source;
      return () => element.removeEventListener("timeupdate", onTimeUpdate);
    }
    if (!Hls.isSupported()) return;
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(source);
    hls.attachMedia(element);
    return () => { element.removeEventListener("timeupdate", onTimeUpdate); hls.destroy(); };
  }, [source, videoId]);

  return <div className="watch-player-frame"><video ref={videoRef} className="watch-player" controls playsInline poster={poster ?? undefined} aria-label="Video player" /></div>;
}
