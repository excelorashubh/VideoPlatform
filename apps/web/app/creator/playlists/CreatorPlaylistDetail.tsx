"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ListVideo, Trash2 } from "lucide-react";
import { addCreatorPlaylistVideo, deleteCreatorPlaylist, getCreatorPlaylist, getCreatorPlaylistVideos, reorderCreatorPlaylistVideos, removeCreatorPlaylistVideo, type CreatorPlaylist, type CreatorPlaylistVideo } from "../../../lib/api";

export function CreatorPlaylistDetail({ playlistId }: { playlistId: string }) {
  const [playlist, setPlaylist] = useState<(CreatorPlaylist & { videos: CreatorPlaylistVideo[] }) | null>(null);
  const [availableVideos, setAvailableVideos] = useState<Array<Omit<CreatorPlaylistVideo, "position">>>([]);
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [result, videos] = await Promise.all([getCreatorPlaylist(playlistId), getCreatorPlaylistVideos()]);
      setPlaylist(result);
      setAvailableVideos(videos);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this playlist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [playlistId]);

  async function addVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!videoId || saving) return;
    setSaving(true);
    setError(null);
    try { setPlaylist(await addCreatorPlaylistVideo(playlistId, videoId)); setVideoId(""); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to add video."); }
    finally { setSaving(false); }
  }

  async function removeVideo(item: CreatorPlaylistVideo) {
    if (!window.confirm(`Remove “${item.title}” from this playlist?`)) return;
    setSaving(true);
    setError(null);
    try { setPlaylist(await removeCreatorPlaylistVideo(playlistId, item.id)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to remove video."); }
    finally { setSaving(false); }
  }

  async function move(index: number, offset: -1 | 1) {
    if (!playlist || saving) return;
    const next = index + offset;
    if (next < 0 || next >= playlist.videos.length) return;
    const videoIds = playlist.videos.map((video) => video.id);
    [videoIds[index], videoIds[next]] = [videoIds[next], videoIds[index]];
    setSaving(true);
    setError(null);
    try { setPlaylist(await reorderCreatorPlaylistVideos(playlistId, videoIds)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to reorder videos."); }
    finally { setSaving(false); }
  }

  async function removePlaylist() {
    if (!playlist || !window.confirm(`Delete “${playlist.title}”? Its videos will not be deleted.`)) return;
    try {
      await deleteCreatorPlaylist(playlist.id);
      window.location.assign("/creator/playlists");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete playlist.");
    }
  }

  if (loading) return <div className="creator-page-loading" aria-busy="true">Loading playlist...</div>;
  if (error && !playlist) return <section className="creator-feature-empty" role="alert"><h1>Unable to load playlist</h1><p>{error}</p><button type="button" className="creator-secondary-button" onClick={() => void load()}>Retry</button><Link href="/creator/playlists">Back to playlists</Link></section>;
  if (!playlist) return null;
  const existingIds = new Set(playlist.videos.map((video) => video.id));
  const addableVideos = availableVideos.filter((video) => !existingIds.has(video.id));

  return <main className="creator-playlist-detail">
    <Link href="/creator/playlists" className="creator-back-link"><ArrowLeft size={16} aria-hidden="true" /> Playlists</Link>
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">{playlist.isPublic ? "Public playlist" : "Private playlist"}</p><h1>{playlist.title}</h1><p>{playlist.videoCount} videos · Ordered by the creator</p></div><button type="button" className="creator-icon-button is-danger" title="Delete playlist" aria-label="Delete playlist" onClick={() => void removePlaylist()}><Trash2 size={17} /></button></header>
    {error ? <p className="creator-page-error" role="alert">{error}</p> : null}
    <form className="creator-playlist-add-form" onSubmit={(event) => void addVideo(event)}><label htmlFor="creator-playlist-video">Add a video</label><select id="creator-playlist-video" value={videoId} onChange={(event) => setVideoId(event.target.value)}><option value="">Choose one of your videos</option>{addableVideos.map((video) => <option value={video.id} key={video.id}>{video.title} · {video.status} · {video.visibility}</option>)}</select><button type="submit" className="creator-studio-primary" disabled={!videoId || saving}>{saving ? "Saving..." : "Add video"}</button></form>
    {playlist.videos.length ? <ol className="creator-playlist-video-list">{playlist.videos.map((video, index) => <li className="creator-playlist-video-row" key={video.id}><span className="creator-playlist-position">{index + 1}</span>{video.status === "READY" && video.visibility !== "PRIVATE" ? <Link href={`/watch/${video.id}`} className="creator-playlist-detail-thumb">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <span>{video.title.slice(0, 1).toUpperCase()}</span>}</Link> : <div className="creator-playlist-detail-thumb" aria-hidden="true">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <span>{video.title.slice(0, 1).toUpperCase()}</span>}</div>}<div className="creator-playlist-video-copy"><strong>{video.title}</strong><span>{video.status} · {video.visibility}</span></div><div className="creator-playlist-order-actions"><button type="button" className="creator-icon-button" title="Move up" aria-label={`Move ${video.title} up`} disabled={saving || index === 0} onClick={() => void move(index, -1)}><ArrowUp size={16} /></button><button type="button" className="creator-icon-button" title="Move down" aria-label={`Move ${video.title} down`} disabled={saving || index === playlist.videos.length - 1} onClick={() => void move(index, 1)}><ArrowDown size={16} /></button><button type="button" className="creator-icon-button is-danger" title="Remove video" aria-label={`Remove ${video.title}`} disabled={saving} onClick={() => void removeVideo(video)}><Trash2 size={16} /></button></div></li>)}</ol> : <section className="creator-feature-empty"><span className="creator-feature-empty-icon"><ListVideo size={22} aria-hidden="true" /></span><h2>No videos in this playlist</h2><p>Add videos from your creator library to build this collection.</p></section>}
  </main>;
}