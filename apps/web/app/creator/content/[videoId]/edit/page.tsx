"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../../../_components/AppShell";
import { completeThumbnailUpload, createThumbnailUpload, getCreatorContent, updateCreatorVideo, type CreatorContentItem } from "../../../../../lib/api";

export default function CreatorVideoEditPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  const router = useRouter();
  const [video, setVideo] = useState<CreatorContentItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PRIVATE");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getCreatorContent().then(({ items }) => {
      const current = items.find((item) => item.id === videoId);
      if (!current) throw new Error("Video not found");
      setVideo(current);
      setTitle(current.title);
      setDescription(current.description ?? "");
      setVisibility(current.visibility);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load this video.")).finally(() => setLoading(false));
  }, [videoId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("A video title is required."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await updateCreatorVideo(videoId, { title, description, visibility });
      if (thumbnail) {
        const contentType = thumbnail.type;
        if (!["image/jpeg", "image/png", "image/webp"].includes(contentType) || thumbnail.size > 10 * 1024 * 1024) {
          throw new Error("Use a JPEG, PNG, or WebP thumbnail up to 10 MB.");
        }
        const upload = await createThumbnailUpload(videoId, { contentType, fileSize: thumbnail.size });
        const uploadResponse = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: thumbnail });
        if (!uploadResponse.ok) throw new Error("Thumbnail upload failed.");
        await completeThumbnailUpload(videoId, upload.key);
      }
      setVideo((current) => current ? { ...current, ...updated } : current);
      setNotice("Changes saved");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Couldn't save changes. Please try again.");
    } finally { setSaving(false); }
  }

  return <AppShell eyebrow="Creator Studio" title="Edit video"><section className="creator-edit-page"><div className="creator-edit-heading"><div><p className="kicker">Content / Edit</p><h1>Edit video</h1><p className="muted">Update metadata without re-uploading the video.</p></div><Link className="secondary-button" href="/creator/content">Back to content</Link></div>{loading ? <div className="admin-empty-state">Loading video...</div> : error && !video ? <section className="panel" role="alert"><strong>Unable to load this video</strong><p className="muted">{error}</p></section> : video ? <form className="creator-edit-form" onSubmit={save}><label>Title<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /><small>{title.length} / 100</small></label><label>Description<textarea maxLength={5000} rows={8} value={description} onChange={(event) => setDescription(event.target.value)} /><small>{description.length} / 5000</small></label><label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option><option value="PRIVATE">Private</option></select></label><label>Thumbnail<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)} /><small>{thumbnail ? thumbnail.name : "Optional custom thumbnail, up to 10 MB"}</small></label>{error ? <p className="auth-error" role="alert">{error}</p> : null}{notice ? <p className="form-status form-status-success" role="status">{notice}</p> : null}<div className="creator-edit-actions"><Link className="secondary-button" href={`/watch/${video.id}`}>Open video</Link><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div></form> : null}</section></AppShell>;
}
