import { AppShell } from "../../_components/AppShell";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell title="Now watching"><div className="watch-layout"><div><div className="player"><span>PLAYBACK PREVIEW</span><button aria-label="Play video">Play</button></div><p className="kicker">GVP editorial channel · video {id}</p><h2>The quiet architecture of good systems</h2><div className="watch-meta"><span>12.4k views</span><span>2 days ago</span><button>Like</button><button>Share</button></div></div><aside className="up-next"><p className="eyebrow">Up next</p>{["Field notes from a moving planet", "How sound becomes a place", "Designing calm interfaces"].map((title) => <div className="up-next-item" key={title}><div className="mini-thumb" /><div><strong>{title}</strong><span>GVP editorial channel</span></div></div>)}</aside></div></AppShell>;
}