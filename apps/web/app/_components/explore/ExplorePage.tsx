import { AppShell } from "../AppShell";

type ExploreVideo = {
  id: string;
  title: string;
  channelName: string;
  views?: string;
  publishedAt?: string;
  duration?: string;
  category?: string;
  isLive?: boolean;
  liveViewers?: string;
};

type ExploreCategory = {
  name: string;
  detail: string;
  tone: number;
};

type ExploreSection = {
  title: string;
  videos: ExploreVideo[];
};

type ExplorePageProps = {
  title: string;
  eyebrow: string;
  description: string;
  active: string;
  filters: string[];
  categories?: ExploreCategory[];
  sections: ExploreSection[];
  emptyMessage: string;
};

const toneNames = ["tone-1", "tone-2", "tone-3"];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase() || "GV";
}

function VideoCard({ video, index }: { video: ExploreVideo; index: number }) {
  return (
    <article className="video-card">
      <div className={`thumbnail ${toneNames[index % toneNames.length]}`}>
        <span>{video.isLive ? "LIVE" : video.duration ?? "12:40"}</span>
      </div>
      <div className="card-body">
        <div className="post-header">
          <span className="channel-avatar">{initials(video.channelName)}</span>
          <div>
            <p className="card-label">{video.category ?? "GVP picks"}</p>
            <h3>{video.title}</h3>
          </div>
        </div>
        <p className="muted">{video.channelName}</p>
        <p className="muted">
          {video.isLive ? `${video.liveViewers ?? "0"} watching` : `${video.views ?? "0 views"} · ${video.publishedAt ?? "Recently"}`}
        </p>
      </div>
    </article>
  );
}

function CategoryCard({ category }: { category: ExploreCategory }) {
  return (
    <article className="playlist-card">
      <div className={`playlist-art ${toneNames[category.tone % toneNames.length]}`}>
        <strong>{category.name.slice(0, 1)}</strong>
        <span>{category.detail}</span>
      </div>
      <h3>{category.name}</h3>
      <p className="muted">Explore the latest {category.name.toLowerCase()} videos.</p>
    </article>
  );
}

export function ExplorePage({ title, eyebrow, description, active, filters, categories, sections, emptyMessage }: ExplorePageProps) {
  return (
    <AppShell active={active} title={title}>
      <section className="shorts-intro">
        <div>
          <p className="kicker">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </section>

      <div className="search-bar" aria-label={`${title} filters`}>
        {filters.map((filter, index) => <button key={filter} type="button" className={index === 0 ? "primary-button" : "secondary-button"}>{filter}</button>)}
      </div>

      {categories?.length ? (
        <>
          <section className="section-heading page-heading"><div><p className="kicker">Browse by topic</p><h2>Popular categories</h2></div></section>
          <div className="playlist-grid">{categories.map((category) => <CategoryCard key={category.name} category={category} />)}</div>
        </>
      ) : null}

      {sections.map((section) => (
        <section key={section.title}>
          <section className="section-heading page-heading"><div><p className="kicker">{eyebrow}</p><h2>{section.title}</h2></div></section>
          {section.videos.length ? <div className="video-grid">{section.videos.map((video, index) => <VideoCard key={video.id} video={video} index={index} />)}</div> : <div className="panel"><strong>{emptyMessage}</strong><p className="muted">Check back later for new content.</p></div>}
        </section>
      ))}
    </AppShell>
  );
}

export const trendingSections: ExploreSection[] = [
  { title: "Trending Videos", videos: [
    { id: "trend-1", title: "BGMI Tournament Highlights", channelName: "Ragx Shubh Gaming", views: "245K views", publishedAt: "5 hours ago", category: "Gaming" },
    { id: "trend-2", title: "New Gaming Update Explained", channelName: "GVP Gaming", views: "180K views", publishedAt: "8 hours ago", category: "Gaming" },
    { id: "trend-3", title: "A Field Guide to Better Questions", channelName: "GVP Editorial", views: "132K views", publishedAt: "1 day ago", category: "News" }
  ] },
  { title: "Trending Shorts", videos: [
    { id: "trend-4", title: "The perfect last-second save", channelName: "Playbook Daily", views: "98K views", publishedAt: "3 hours ago", duration: "0:48", category: "Shorts" },
    { id: "trend-5", title: "One minute of street food", channelName: "The Local Cut", views: "76K views", publishedAt: "6 hours ago", duration: "0:59", category: "Culture" }
  ] },
  { title: "Music", videos: [
    { id: "trend-6", title: "Sunrise Sessions: Live Room", channelName: "GVP Music", views: "64K views", publishedAt: "10 hours ago", category: "Music" },
    { id: "trend-7", title: "Behind the beat", channelName: "Signal Studio", views: "52K views", publishedAt: "1 day ago", category: "Music" }
  ] }
];

export const musicSections: ExploreSection[] = [
  { title: "Music Trending Now", videos: [
    { id: "music-1", title: "Neon Morning", channelName: "Mira Vale", views: "12M views", publishedAt: "2 days ago", duration: "3:42", category: "Song" },
    { id: "music-2", title: "Paper Planes", channelName: "Northline", views: "8.4M views", publishedAt: "4 days ago", duration: "4:08", category: "Song" },
    { id: "music-3", title: "After the Rain", channelName: "GVP Sessions", views: "5.1M views", publishedAt: "1 week ago", duration: "3:26", category: "Live session" }
  ] },
  { title: "Latest Releases", videos: [
    { id: "music-4", title: "Glasshouse", channelName: "Low Tide", views: "420K views", publishedAt: "3 hours ago", duration: "3:51", category: "Release" },
    { id: "music-5", title: "Orbiting Home", channelName: "Aria Sen", views: "280K views", publishedAt: "1 day ago", duration: "4:12", category: "Release" }
  ] },
  { title: "Live Music", videos: [
    { id: "music-6", title: "Rooftop Radio: Friday Set", channelName: "GVP Music", views: "18K views", publishedAt: "Live now", category: "Live music", isLive: true, liveViewers: "1.8K" },
    { id: "music-7", title: "Acoustic Room Sessions", channelName: "The Listening Room", views: "9K views", publishedAt: "Live now", category: "Live music", isLive: true, liveViewers: "640" }
  ] }
];

export const gamingSections: ExploreSection[] = [
  { title: "Gaming Trending", videos: [
    { id: "gaming-1", title: "BGMI Ranked Push", channelName: "Ragx Shubh Gaming", views: "45K views", publishedAt: "2 hours ago", category: "BGMI" },
    { id: "gaming-2", title: "GTA City Stories: The Big Escape", channelName: "Pixel District", views: "38K views", publishedAt: "5 hours ago", category: "GTA" },
    { id: "gaming-3", title: "Minecraft Survival Build", channelName: "Crafted World", views: "31K views", publishedAt: "7 hours ago", category: "Minecraft" }
  ] },
  { title: "Live Gaming", videos: [
    { id: "gaming-4", title: "Valorant Competitive Queue", channelName: "Aim Theory", category: "Valorant", isLive: true, liveViewers: "2.4K" },
    { id: "gaming-5", title: "Free Fire Weekend Clash", channelName: "Fireline", category: "Free Fire", isLive: true, liveViewers: "1.1K" }
  ] },
  { title: "Gaming Shorts", videos: [
    { id: "gaming-6", title: "Cleanest clutch of the day", channelName: "GVP Gaming", views: "19K views", publishedAt: "4 hours ago", duration: "0:34", category: "Shorts" },
    { id: "gaming-7", title: "When the loot finally lands", channelName: "Squad Goals", views: "14K views", publishedAt: "9 hours ago", duration: "0:42", category: "Shorts" }
  ] }
];

export const liveSections: ExploreSection[] = [
  { title: "Live Now", videos: [
    { id: "live-1", title: "BGMI Ranked Push", channelName: "Ragx Shubh Gaming", category: "BGMI", isLive: true, liveViewers: "1.2K" },
    { id: "live-2", title: "Rooftop Radio: Friday Set", channelName: "GVP Music", category: "Music", isLive: true, liveViewers: "860" },
    { id: "live-3", title: "Championship Watch Party", channelName: "Sports Desk", category: "Sports", isLive: true, liveViewers: "4.7K" }
  ] },
  { title: "Gaming Live", videos: [
    { id: "live-4", title: "Valorant Competitive Queue", channelName: "Aim Theory", category: "Valorant", isLive: true, liveViewers: "2.4K" },
    { id: "live-5", title: "Minecraft Community Build", channelName: "Crafted World", category: "Minecraft", isLive: true, liveViewers: "730" }
  ] },
  { title: "Music Live", videos: [
    { id: "live-6", title: "Acoustic Room Sessions", channelName: "The Listening Room", category: "Acoustic", isLive: true, liveViewers: "640" },
    { id: "live-7", title: "Late Night Piano", channelName: "Mira Vale", category: "Piano", isLive: true, liveViewers: "410" }
  ] }
];

export const sportsSections: ExploreSection[] = [
  { title: "Sports Trending", videos: [
    { id: "sports-1", title: "Tournament Highlights", channelName: "Sports Desk", views: "120K views", publishedAt: "3 hours ago", category: "Cricket" },
    { id: "sports-2", title: "The Final Four Plays", channelName: "Court Vision", views: "84K views", publishedAt: "6 hours ago", category: "Basketball" },
    { id: "sports-3", title: "Matchday Tactical Review", channelName: "The Football Room", views: "72K views", publishedAt: "1 day ago", category: "Football" }
  ] },
  { title: "Live Sports", videos: [
    { id: "sports-4", title: "National League Watchalong", channelName: "Sports Desk", category: "Football", isLive: true, liveViewers: "5.3K" },
    { id: "sports-5", title: "Esports Grand Final", channelName: "Arena Central", category: "Esports", isLive: true, liveViewers: "8.1K" }
  ] },
  { title: "Sports Highlights", videos: [
    { id: "sports-6", title: "Five rallies that changed the match", channelName: "Baseline", views: "54K views", publishedAt: "2 days ago", category: "Tennis" },
    { id: "sports-7", title: "Cricket skills clinic", channelName: "Crease School", views: "43K views", publishedAt: "3 days ago", category: "Cricket" }
  ] }
];

export const gamingCategories: ExploreCategory[] = [
  { name: "BGMI", detail: "Ranked play", tone: 0 },
  { name: "GTA", detail: "Open worlds", tone: 1 },
  { name: "Minecraft", detail: "Build together", tone: 2 },
  { name: "Valorant", detail: "Tactical play", tone: 1 },
  { name: "Free Fire", detail: "Fast matches", tone: 0 },
  { name: "More Games", detail: "Discover more", tone: 2 }
];

export const sportsCategories: ExploreCategory[] = [
  { name: "Cricket", detail: "Match moments", tone: 0 },
  { name: "Football", detail: "Matchday", tone: 1 },
  { name: "Esports", detail: "Live arenas", tone: 2 },
  { name: "Basketball", detail: "Top plays", tone: 1 },
  { name: "Tennis", detail: "Court side", tone: 0 }
];
