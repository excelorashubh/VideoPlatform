"use client";

import { usePathname } from "next/navigation";
import { CreatorStudio } from "./CreatorStudio";

const studioPaths = new Set([
  "/creator",
  "/creator/content",
  "/creator/live",
  "/creator/playlists",
  "/creator/analytics",
  "/creator/comments",
  "/creator/community",
  "/creator/customization",
  "/creator/audio-library",
  "/creator/monetization",
  "/creator/settings"
]);

export function CreatorLayoutFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const playlistDetail = pathname.startsWith("/creator/playlists/");
  const inStudio = studioPaths.has(pathname) || playlistDetail;

  return !inStudio ? children : <CreatorStudio section={playlistDetail ? "Playlists" : undefined} content={pathname !== "/creator" ? children : undefined} fallback={pathname === "/creator" ? children : undefined} />;
}
