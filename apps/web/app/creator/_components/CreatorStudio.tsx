"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCreatorDashboard, type CreatorDashboard, getStoredSessionToken } from "../../../lib/api";

const navigation = [
  { label: "Dashboard", href: "/creator" },
  { label: "Content", href: "/creator/content" },
  { label: "Live", href: "/creator/live" },
  { label: "Playlists", href: "/creator/playlists" },
  { label: "Analytics", href: "/creator/analytics" },
  { label: "Comments", href: "/creator/comments" },
  { label: "Community", href: "/creator/community" },
  { label: "Customization", href: "/creator/customization" },
  { label: "Audio Library", href: "/creator/audio-library" },
  { label: "Monetization", href: "/creator/monetization" },
  { label: "Settings", href: "/creator/settings" }
];

function CreatorNavIcon({ label }: { label: string }) {
  const paths: Record<string, string> = {
    Dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    Content: "M4 6h16v12H4zM8 10l4 2-4 2v-4Z",
    Live: "M4 8a8 8 0 0 1 16 0M7 8a5 5 0 0 1 10 0M10 8a2 2 0 0 1 4 0",
    Playlists: "M4 7h10M4 12h10M4 17h7M17 9v7M13.5 13h7",
    Analytics: "M5 19V9m7 10V5m7 14v-7M4 20h16",
    Comments: "M4 5h16v11H8l-4 4V5ZM8 9h8M8 13h5",
    Community: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-3A3.5 3.5 0 0 0 6 18.5V20M11 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5-5a2.5 2.5 0 0 1 0 5",
    Customization: "M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z",
    "Audio Library": "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z",
    Monetization: "M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5",
    Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2"
  };
  return <svg className="creator-studio-nav-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[label] ?? paths.Dashboard} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }

export function CreatorStudio({ section = "Dashboard", fallback }: { section?: string; fallback?: React.ReactNode }) {
  const pathname = usePathname();
  const [dashboard, setDashboard] = useState<CreatorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try { setDashboard(await getCreatorDashboard()); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load Creator Studio"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (getStoredSessionToken()) void load(); }, []);

  const creatorName = dashboard?.creator.name ?? "Creator";
  const active = navigation.find((item) => item.href === pathname) ?? navigation.find((item) => item.label === section) ?? navigation[0];
  const activeSection = active.label;

  if (pathname === "/creator" && fallback && (loading || error)) {
    return <>{fallback}</>;
  }

  return <div className={`creator-studio-shell ${collapsed ? "creator-studio-shell--collapsed" : ""}`}>
    <aside className={`creator-studio-sidebar ${open ? "is-open" : ""}`}>
      <div className="creator-studio-brand"><strong>GVP</strong><span>CREATOR STUDIO</span></div>
      {dashboard ? <div className="creator-studio-channel"><span className="creator-studio-avatar">{initials(creatorName)}</span><div><strong>{creatorName}</strong><small>{dashboard.creator.handle ? `@${dashboard.creator.handle.replace(/^@/, "")}` : "Active creator"}</small></div></div> : null}
      <nav aria-label="Creator Studio navigation">
        <p className="creator-studio-nav-label">Studio</p>
        {navigation.map((item) => <Link key={item.href} href={item.href} className={item.label === active.label ? "is-active" : ""} onClick={() => setOpen(false)}><CreatorNavIcon label={item.label} /><span className="creator-studio-nav-text">{item.label}</span></Link>)}
      </nav>
      <div className="creator-studio-sidebar-footer"><Link href="/">View GVP</Link><span>Creator tools are backend-authorized.</span></div>
    </aside>
    {open ? <button className="creator-studio-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
    <main className="creator-studio-main">
      <header className="creator-studio-header"><button className="creator-studio-menu" aria-label="Toggle creator navigation" aria-expanded={open || !collapsed} onClick={() => { if (window.matchMedia("(max-width: 800px)").matches) setOpen((value) => !value); else setCollapsed((value) => !value); }}>☰</button><div className="creator-studio-header-title"><span>GVP</span><strong>Creator Studio</strong></div><input className="creator-studio-search" aria-label="Search studio" placeholder="Search your studio" /><div className="creator-studio-header-actions"><Link href="/creator/upload" className="creator-studio-create">+ Create</Link><span className="creator-studio-header-avatar">{initials(creatorName)}</span></div></header>
      <div className="creator-studio-content">
        {loading ? <div className="creator-studio-loading"><span /><span /><span /></div> : error ? <section className="creator-studio-error"><h2>Unable to load this section</h2><p>{error}</p><button onClick={() => void load()}>Retry</button></section> : dashboard ? <>
          <div className="creator-studio-page-heading"><div><p className="creator-studio-eyebrow">{active.label}</p><h1>{activeSection === "Dashboard" ? "Channel dashboard" : active.label}</h1><p>Here&apos;s what&apos;s happening with your channel.</p></div><Link href="/creator/upload" className="creator-studio-primary">Upload video</Link></div>
          {activeSection !== "Dashboard" ? <section className="creator-studio-future"><span className="creator-studio-future-mark">{active.label.slice(0, 1)}</span><h2>{active.label}</h2><p>{activeSection === "Content" ? "Your content workspace is ready for the existing GVP upload and processing flow." : `${active.label} tools are coming soon. Your creator data remains protected while this workspace is being expanded.`}</p>{activeSection === "Content" ? <Link href="/creator/upload" className="creator-studio-primary">Upload your first video</Link> : null}</section> : <DashboardOverview dashboard={dashboard} />}
        </> : null}
      </div>
    </main>
  </div>;
}

function DashboardOverview({ dashboard }: { dashboard: CreatorDashboard }) {
  return <>
    <section className="creator-studio-welcome"><div><p className="creator-studio-eyebrow">Welcome back</p><h2>{dashboard.creator.name}</h2><p>{dashboard.creator.bio ?? "Your channel is ready to grow."}</p></div><div className="creator-studio-welcome-actions"><Link href="/creator/upload">Upload video</Link><Link href="/creator/customization">Customize channel</Link></div></section>
    <section className="creator-studio-stat-grid">{[["Subscribers", dashboard.stats.subscribers], ["Videos", dashboard.stats.videos], ["Views", dashboard.stats.views], ["Comments", dashboard.stats.comments]].map(([label, value]) => <article className="creator-studio-stat" key={label as string}><span>{label}</span><strong>{value}</strong><small>All time</small></article>)}</section>
    <div className="creator-studio-grid"><section className="creator-studio-panel"><div className="creator-studio-panel-heading"><div><p className="creator-studio-eyebrow">Channel performance</p><h2>Performance snapshot</h2></div><span className="creator-studio-muted">Last 28 days</span></div><div className="creator-studio-empty"><strong>{dashboard.stats.views ? `${dashboard.stats.views} views recorded` : "No analytics data yet"}</strong><span>{dashboard.stats.views ? "Keep publishing to build a clearer performance trend." : "Analytics will appear once your channel has content."}</span></div></section><section className="creator-studio-panel"><div className="creator-studio-panel-heading"><div><p className="creator-studio-eyebrow">Shortcuts</p><h2>Quick actions</h2></div></div><div className="creator-studio-action-list"><Link href="/creator/upload">Upload video <span>→</span></Link><Link href="/creator/content">Manage content <span>→</span></Link><Link href="/creator/analytics">View analytics <span>→</span></Link><Link href="/creator/customization">Customize channel <span>→</span></Link></div></section></div>
    <section className="creator-studio-panel creator-studio-latest"><div className="creator-studio-panel-heading"><div><p className="creator-studio-eyebrow">Library</p><h2>Latest content</h2></div><Link href="/creator/content">View all</Link></div>{dashboard.videos.length ? <div className="creator-studio-video-list">{dashboard.videos.map((video) => <article key={video.id}><div className="creator-studio-thumb">{video.title.slice(0, 1).toUpperCase()}</div><div className="creator-studio-video-copy"><strong>{video.title}</strong><span>{video.status} · {formatDate(video.createdAt)}</span></div><div className="creator-studio-video-metrics"><span>{video._count.history} views</span><span>{video._count.comments} comments</span><span>{video._count.likes} likes</span></div></article>)}</div> : <div className="creator-studio-empty creator-studio-empty-large"><strong>No videos yet</strong><span>Upload your first video to start building your channel.</span><Link href="/creator/upload" className="creator-studio-primary">Upload video</Link></div>}</section>
  </>;
}
