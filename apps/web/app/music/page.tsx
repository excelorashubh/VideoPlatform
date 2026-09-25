import type { Metadata } from "next";
import { ExplorePage, musicSections } from "../_components/explore/ExplorePage";

export const metadata: Metadata = { title: "Music | GVP", description: "Find new music, releases, and live sessions on GVP." };

export default function MusicPage() {
  return <ExplorePage title="Music" eyebrow="Listen closer" description="Find fresh releases, popular songs, and intimate live sessions from the GVP music community." active="/music" filters={["All", "Trending", "New releases", "Live"]} sections={musicSections} emptyMessage="No music videos available yet." />;
}
