"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeading } from "../../_components/AppShell";
import { getCreatorContent, type CreatorContentItem } from "../../../lib/api";

const filters = ["ALL", "PUBLIC", "UNLISTED", "PRIVATE", "DRAFTS"] as const;

export default function StudioContentPage() {
  const [items, setItems] = useState<CreatorContentItem[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setItems((await getCreatorContent()).items); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load your videos."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === "ALL" || (filter === "DRAFTS" ? item.status === "DRAFT" : item.visibility === filter);
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query));
  }), [filter, items, search]);

  return <AppShell active="/studio/content" eyebrow="Your videos" title="Your video library">
    <PageHeading eyebrow="You" title="Your videos" />
    <div className="section-heading"><p className="muted">Videos available in your personal library.</p><Link className="primary-button" href="/studio/upload">Upload video</Link></div>
    {error ? <section className="panel" role="alert"><strong>Couldn&apos;t load your videos</strong><p className="muted">Something went wrong while loading your library.</p><button className="secondary-button" type="button" onClick={() => void load()}>Try again</button></section> : null}
    {!error && loading ? <div className="admin-empty-state">Loading your videos...</div> : null}
    {!error && !loading && items.length === 0 ? <section className="panel"><strong>No videos yet</strong><p className="muted">Upload your first video to start building your library.</p><Link className="primary-button" href="/studio/upload">Upload video</Link></section> : null}
    {!error && !loading && items.length > 0 ? <>
      <div className="filter-row">{filters.map((value) => <button type="button" key={value} className={filter === value ? "primary-button" : "secondary-button"} onClick={() => setFilter(value)}>{value === "DRAFTS" ? "Drafts" : value[0] + value.slice(1).toLowerCase()}</button>)}<input aria-label="Search videos" placeholder="Search videos" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="table-panel"><div className="table-row studio-content-row table-head"><span>Video</span><span>Visibility</span><span>Status</span><span>Date</span><span>Views</span></div>
        {visibleItems.map((video) => <div className="table-row studio-content-row" key={video.id}><Link className="title-cell" href={`/watch/${video.id}`}>{video.thumbnailUrl ? <img className="mini-thumb" src={video.thumbnailUrl} alt="" /> : <div className="mini-thumb tone-1" />}<strong>{video.title}</strong></Link><span>{video.visibility.toLowerCase()}</span><span className={video.status === "READY" ? "status" : "status warm"}>{video.status.toLowerCase()}</span><time dateTime={video.createdAt}>{new Date(video.createdAt).toLocaleDateString()}</time><span>{video.views}</span></div>)}
        {!visibleItems.length ? <div className="admin-empty-state">No videos match this filter.</div> : null}
      </div>
    </> : null}
  </AppShell>;
}
