"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeading } from "../AppShell";
import { getPublicVideos, type PublicVideo } from "../../../lib/api";
import { HomeCategoryList, homeCategories } from "./HomeCategoryList";

export function HomePageContent({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try { setVideos((await getPublicVideos()).items); } catch { setError(true); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <>
      <HomeCategoryList categories={homeCategories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      {children}
      <PageHeading eyebrow="Recommended" title="Latest videos" />
      {loading ? <div className="admin-empty-state">Loading videos...</div> : null}
      {!loading && error ? <section className="panel" role="alert"><strong>Couldn&apos;t load videos.</strong><button className="secondary-button" type="button" onClick={() => void load()}>Try again</button></section> : null}
      {!loading && !error && !videos.length ? <section className="panel"><strong>No videos available yet.</strong></section> : null}
      {!loading && !error && videos.length ? <div className="video-grid">{videos.map((video) => <Link className="video-card" href={`/watch/${video.id}`} key={video.id}><div className="thumbnail">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : null}</div><div className="card-body"><h3>{video.title}</h3><p className="muted">{video.creator.name}</p><p className="muted">{video.views} views · {new Date(video.publishedAt).toLocaleDateString()}</p></div></Link>)}</div> : null}
    </>
  );
}
