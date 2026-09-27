"use client";

import { useState } from "react";

export function WatchActions({ videoId }: { videoId: string }) {
  const [notice, setNotice] = useState("");

  async function share() {
    const url = `${window.location.origin}/watch/${videoId}`;
    try {
      if (navigator.share) await navigator.share({ title: "Watch this video on GVP", url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
        window.setTimeout(() => setNotice(""), 2200);
      }
    } catch {
      setNotice("");
    }
  }

  return <div className="watch-actions" aria-label="Video actions">
    <button type="button" disabled aria-label="Like video">Like</button>
    <button type="button" onClick={() => void share()}>Share</button>
    <button type="button" disabled aria-label="Save video">Save</button>
    {notice ? <span className="watch-action-notice" role="status">{notice}</span> : null}
  </div>;
}
