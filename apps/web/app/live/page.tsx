import type { Metadata } from "next";
import { ExplorePage, liveSections } from "../_components/explore/ExplorePage";

export const metadata: Metadata = { title: "Live | GVP", description: "Watch live broadcasts from GVP creators." };

export default function LivePage() {
  return <ExplorePage title="Live" eyebrow="Happening now" description="Join creators and communities as they share unfiltered moments in real time." active="/live" filters={["All", "Gaming", "Music", "Sports"]} sections={liveSections} emptyMessage="No live streams right now." />;
}
