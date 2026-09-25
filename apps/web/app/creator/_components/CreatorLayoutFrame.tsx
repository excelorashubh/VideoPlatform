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

  return !studioPaths.has(pathname) ? children : <CreatorStudio fallback={pathname === "/creator" ? children : undefined} />;
}
