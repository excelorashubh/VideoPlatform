"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCreatorContent, type CreatorContentItem } from "../../../lib/api";
import { ContentRowActions } from "./ContentRowActions";

const filters = ["ALL", "PUBLIC", "UNLISTED", "PRIVATE", "DRAFTS"] as const;

export default function CreatorContentPage() {
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

	return <section className="creator-studio-panel creator-content-page">
		<div className="creator-studio-page-heading"><div><p className="creator-studio-eyebrow">Content</p><h1>Manage your channel content</h1><p>Manage all videos uploaded to your channel.</p></div><Link className="creator-studio-primary" href="/studio/upload">Upload video</Link></div>
		{error ? <section className="panel" role="alert"><strong>Couldn&apos;t load your videos</strong><p className="muted">Something went wrong while loading your content.</p><button className="secondary-button" type="button" onClick={() => void load()}>Try again</button></section> : null}
		{!error && loading ? <div className="admin-empty-state">Loading your videos...</div> : null}
		{!error && !loading && items.length === 0 ? <section className="panel"><strong>No videos yet</strong><p className="muted">Upload your first video to start building your channel.</p><Link className="primary-button" href="/studio/upload">Upload video</Link></section> : null}
		{!error && !loading && items.length > 0 ? <>
			<div className="filter-row">{filters.map((value) => <button type="button" key={value} className={filter === value ? "primary-button" : "secondary-button"} onClick={() => setFilter(value)}>{value === "DRAFTS" ? "Drafts" : value[0] + value.slice(1).toLowerCase()}</button>)}<input aria-label="Search videos" placeholder="Search videos" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
					<div className="table-panel"><div className="table-row studio-content-row table-head"><span>Video</span><span>Visibility</span><span>Status</span><span>Date</span><span>Views</span><span>Actions</span></div>
						{visibleItems.map((video) => <div className="table-row studio-content-row" key={video.id}><Link className="title-cell" href={video.status === "READY" ? `/watch/${video.id}` : `/creator/content/${video.id}/edit`}>{video.thumbnailUrl ? <img className="mini-thumb" src={video.thumbnailUrl} alt="" /> : <div className="mini-thumb tone-1" />}<span><strong>{video.title}</strong><small className="content-row-kind">Video</small></span></Link><span className={`content-badge content-visibility-${video.visibility.toLowerCase()}`}>{video.visibility[0] + video.visibility.slice(1).toLowerCase()}</span><span className={`content-badge content-status-${video.status.toLowerCase()}`}>{video.status === "FAILED" ? "Processing failed" : video.status[0] + video.status.slice(1).toLowerCase()}</span><time dateTime={video.createdAt}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(video.createdAt))}</time><span>{video.views}</span><ContentRowActions video={video} onChanged={() => void load()} /></div>)}
				{!visibleItems.length ? <div className="admin-empty-state">No videos match this filter.</div> : null}
			</div>
		</> : null}
	</section>;
}
