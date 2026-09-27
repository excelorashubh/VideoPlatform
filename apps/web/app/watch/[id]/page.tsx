import { AppShell } from "../../_components/AppShell";
import { getPublicVideo, getPublicVideos } from "../../../lib/api";
import { VideoPlayer } from "./VideoPlayer";
import { WatchEngagement } from "./WatchEngagement";
import { CommentsSection } from "./CommentsSection";

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getPublicVideo(id).catch(() => null);
  if (!video) return <AppShell title="Video unavailable"><section className="watch-unavailable"><p className="kicker">GVP video</p><h1>Video unavailable</h1><p>This video may have been removed or is no longer available.</p><a className="primary-button" href="/">Go to Home</a></section></AppShell>;

  const related = await getPublicVideos().catch(() => ({ items: [], total: 0 }));
  const recommendations = related.items.filter((item) => item.id !== video.id).slice(0, 6);
  const publishedDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(video.publishedAt));

  return <AppShell title={video.title}><main className="watch-page"><div className="watch-layout"><section className="watch-main"><VideoPlayer poster={video.thumbnailUrl} videoId={video.id} /><h1 className="watch-title">{video.title}</h1><div className="watch-channel-row"><a className="watch-avatar" href={`/channel/${video.creator.handle}`}>{video.creator.avatarUrl ? <img src={video.creator.avatarUrl} alt="" /> : video.creator.name.slice(0, 1).toUpperCase()}</a><div className="watch-channel-copy"><strong>{video.creator.name}</strong><span>@{video.creator.handle}</span></div></div><div className="watch-meta"><span>{video.views} views</span><span>{publishedDate}</span><WatchEngagement videoId={video.id} channelId={video.creator.channelId} /></div><details className="watch-description" open><summary>Description</summary><p>{video.description || "No description provided."}</p></details><CommentsSection videoId={video.id} /></section><aside className="up-next"><div className="watch-section-heading"><h2>Recommended</h2></div>{recommendations.length ? recommendations.map((item) => <a className="watch-recommendation" href={`/watch/${item.id}`} key={item.id}><span className="watch-recommendation-media">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : <span className="watch-recommendation-placeholder" />}</span><span><strong>{item.title}</strong><small>{item.creator.name}</small><small>{item.views} views · {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.publishedAt))}</small></span></a>) : <p className="muted">No more public videos yet.</p>}</aside></div></main></AppShell>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getPublicVideo(id).catch(() => null);
  return { title: video ? `${video.title} | GVP` : "Video unavailable | GVP", description: video?.description ?? "Watch videos on GVP." };
}