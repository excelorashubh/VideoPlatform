import type { Metadata } from "next";
import { ExplorePage, trendingSections } from "../_components/explore/ExplorePage";

export const metadata: Metadata = { title: "Trending | GVP", description: "Discover what is trending across GVP." };

export default function TrendingPage() {
  return <ExplorePage title="Trending" eyebrow="What is moving" description="Catch the videos, conversations, and moments gaining attention across GVP." active="/trending" filters={["All", "Music", "Gaming", "News", "Sports"]} sections={trendingSections} emptyMessage="No trending videos available yet." />;
}
