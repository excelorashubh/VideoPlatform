import type { Metadata } from "next";
import { ExplorePage, gamingCategories, gamingSections } from "../_components/explore/ExplorePage";

export const metadata: Metadata = { title: "Gaming | GVP", description: "Explore gaming videos, streams, and creators on GVP." };

export default function GamingPage() {
  return <ExplorePage title="Gaming" eyebrow="Play together" description="Find the next clutch, build, stream, and creator to add to your squad." active="/gaming" filters={["All", "BGMI", "GTA", "Minecraft", "Valorant", "Free Fire"]} categories={gamingCategories} sections={gamingSections} emptyMessage="No gaming videos available yet." />;
}
