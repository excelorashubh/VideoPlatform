"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteCreatorVideo, retryCreatorVideoProcessing, type CreatorContentItem } from "../../../lib/api";

export function ContentRowActions({ video, onChanged }: { video: CreatorContentItem; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, []);

  async function remove() {
    if (!window.confirm(`Delete "${video.title}" permanently? This removes its media and cannot be undone.`)) return;
    setBusy(true);
    try { await deleteCreatorVideo(video.id); onChanged(); }
    finally { setBusy(false); setOpen(false); }
  }

  async function retry() {
    setBusy(true);
    try { await retryCreatorVideoProcessing(video.id); onChanged(); }
    finally { setBusy(false); setOpen(false); }
  }

  const failed = video.status === "FAILED";
  const ready = video.status === "READY";
  return <div className="content-row-actions" ref={menuRef}>
    <button type="button" className="content-more-button" aria-label={`More actions for ${video.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy}>More</button>
    {open ? <div className="content-actions-menu" role="menu">
      <Link href={`/creator/content/${video.id}/edit`} role="menuitem" onClick={() => setOpen(false)}>Edit</Link>
      {ready ? <Link href={`/watch/${video.id}`} role="menuitem" onClick={() => setOpen(false)}>View on GVP</Link> : <span className="content-action-disabled">View on GVP</span>}
      {failed ? <button type="button" role="menuitem" onClick={() => void retry()}>Retry processing</button> : null}
      <button type="button" className="content-action-danger" role="menuitem" onClick={() => void remove()}>Delete permanently</button>
    </div> : null}
  </div>;
}