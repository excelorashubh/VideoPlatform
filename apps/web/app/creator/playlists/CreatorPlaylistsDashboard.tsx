"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListVideo, Pencil, Plus, Trash2, X } from "lucide-react";
import { createCreatorPlaylist, deleteCreatorPlaylist, getCreatorPlaylists, type CreatorPlaylist, updateCreatorPlaylist } from "../../../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function CreatorPlaylistsDashboard() {
  const [playlists, setPlaylists] = useState<CreatorPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try { setPlaylists(await getCreatorPlaylists()); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load playlists."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    if (new URLSearchParams(window.location.search).get("new") === "1") setFormOpen(true);
  }, []);

  function startCreate() {
    setEditingId(null);
    setTitle("");
    setIsPublic(false);
    setError(null);
    setFormOpen(true);
  }

  function startEdit(playlist: CreatorPlaylist) {
    setEditingId(playlist.id);
    setTitle(playlist.title);
    setIsPublic(playlist.isPublic);
    setError(null);
    setFormOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) await updateCreatorPlaylist(editingId, { title, isPublic });
      else await createCreatorPlaylist({ title, isPublic });
      setFormOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save playlist.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(playlist: CreatorPlaylist) {
    if (!window.confirm(`Delete “${playlist.title}”? Its videos will not be deleted.`)) return;
    setError(null);
    try {
      await deleteCreatorPlaylist(playlist.id);
      setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete playlist.");
    }
  }

  return <main className="creator-playlists-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">Library</p><h1>Playlists</h1><p>Organize your videos into collections.</p></div><button type="button" className="creator-studio-primary creator-action-button" onClick={startCreate}><Plus size={16} aria-hidden="true" /> New playlist</button></header>
    {error ? <p className="creator-page-error" role="alert">{error}</p> : null}
    {formOpen ? <form className="creator-playlist-form" onSubmit={(event) => void save(event)}>
      <div className="creator-form-heading"><div><p className="creator-studio-eyebrow">{editingId ? "Edit playlist" : "New playlist"}</p><h2>{editingId ? "Playlist details" : "Create a playlist"}</h2></div><button type="button" className="creator-icon-button" title="Close form" aria-label="Close playlist form" onClick={() => setFormOpen(false)}><X size={18} /></button></div>
      <label>Title<input required minLength={1} maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
      <label className="creator-checkbox-label"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> Public playlist</label>
      <div className="creator-form-actions"><button type="button" className="creator-secondary-button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="creator-studio-primary" disabled={saving || !title.trim()}>{saving ? "Saving..." : editingId ? "Save changes" : "Create playlist"}</button></div>
    </form> : null}
    {loading ? <div className="creator-playlist-grid" aria-label="Loading playlists" aria-busy="true">{[0, 1, 2].map((item) => <div className="creator-playlist-skeleton" key={item} />)}</div> : playlists.length ? <div className="creator-playlist-grid">{playlists.map((playlist) => <article className="creator-playlist-card" key={playlist.id}>
      <Link href={`/creator/playlists/${playlist.id}`} className="creator-playlist-cover">{playlist.thumbnailUrl ? <img src={playlist.thumbnailUrl} alt="" /> : <span><ListVideo size={28} aria-hidden="true" /></span>}<small>{playlist.videoCount} videos</small></Link>
      <div className="creator-playlist-card-copy"><div><Link href={`/creator/playlists/${playlist.id}`} className="creator-playlist-title">{playlist.title}</Link><span>{playlist.isPublic ? "Public" : "Private"} · Updated {formatDate(playlist.updatedAt)}</span></div><div className="creator-playlist-actions"><Link href={`/creator/playlists/${playlist.id}`} className="creator-secondary-button">Manage videos</Link><button type="button" className="creator-icon-button" title="Edit playlist" aria-label={`Edit ${playlist.title}`} onClick={() => startEdit(playlist)}><Pencil size={16} /></button><button type="button" className="creator-icon-button is-danger" title="Delete playlist" aria-label={`Delete ${playlist.title}`} onClick={() => void remove(playlist)}><Trash2 size={16} /></button></div></div>
    </article>)}</div> : <section className="creator-feature-empty"><span className="creator-feature-empty-icon"><ListVideo size={22} aria-hidden="true" /></span><h2>Create your first playlist</h2><p>Group your uploaded videos into a collection viewers can find on your channel.</p><button type="button" className="creator-studio-primary" onClick={startCreate}>New playlist</button></section>}
  </main>;
}