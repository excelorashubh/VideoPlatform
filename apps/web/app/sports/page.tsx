import type { Metadata } from "next";
import { ExplorePage, sportsCategories, sportsSections } from "../_components/explore/ExplorePage";

export const metadata: Metadata = { title: "Sports | GVP", description: "Watch sports highlights, analysis, and live coverage on GVP." };

export default function SportsPage() {
  return <ExplorePage title="Sports" eyebrow="Play by play" description="Follow the highlights, analysis, and live moments that keep every fan close to the action." active="/sports" filters={["All", "Cricket", "Football", "Esports", "Basketball", "Tennis"]} categories={sportsCategories} sections={sportsSections} emptyMessage="No sports videos available yet." />;
}
