"use client";

import { useEffect, useRef, useState } from "react";
import { getPublicVideoPlayback, getStoredSessionToken, registerVideoView } from "../../../lib/api";

export function VideoPlayer({ poster, videoId }: { poster: string | null; videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const countedRef = useRef(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlaybackUrl(null);
    setPlaybackError(null);
    void getPublicVideoPlayback(videoId).then((playback) => {
      if (!cancelled) setPlaybackUrl(playback.url);
    }).catch((error: unknown) => {
      if (!cancelled) setPlaybackError(error instanceof Error ? error.message : "Unable to load this video.");
    });
    return () => { cancelled = true; };
  }, [videoId, requestVersion]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !playbackUrl) return;
    const onTimeUpdate = () => {
      if (!countedRef.current && element.currentTime >= 5 && getStoredSessionToken()) {
        countedRef.current = true;
        void registerVideoView(videoId);
      }
    };
    const onError = () => setPlaybackError("Unable to play this video. Retry to get a fresh playback URL.");
    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("error", onError);
    return () => {
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("error", onError);
    };
  }, [playbackUrl, videoId]);

  return <div className="watch-player-frame"><video ref={videoRef} className="watch-player" src={playbackUrl ?? undefined} controls playsInline preload="metadata" poster={poster ?? undefined} aria-label="Video player" />{!playbackUrl && !playbackError ? <div className="watch-player-state" role="status">Loading video...</div> : null}{playbackError ? <div className="watch-player-state" role="alert"><span>{playbackError}</span><button type="button" className="watch-player-retry" onClick={() => { setPlaybackError(null); setRequestVersion((version) => version + 1); }}>Retry</button></div> : null}</div>;
}
