"use client";

import { useState } from "react";
import { PageHeading, VideoCards } from "../AppShell";
import { HomeCategoryList, homeCategories } from "./HomeCategoryList";

type HomeVideo = {
  title: string;
  categories: string[];
};

const homeVideos: HomeVideo[] = [
  { title: "The quiet architecture of good systems", categories: ["technology", "programming", "education"] },
  { title: "Field notes from a moving planet", categories: ["news", "education", "recently-uploaded"] },
  { title: "How sound becomes a place", categories: ["music", "podcasts"] },
  { title: "BGMI ranked push: the final circle", categories: ["gaming", "bgmi", "esports"] },
  { title: "Minecraft builds that tell a story", categories: ["gaming", "minecraft", "recently-uploaded"] },
  { title: "A comedy set from the green room", categories: ["comedy", "movies"] },
  { title: "GTA city stories: after midnight", categories: ["gaming", "gta"] },
  { title: "Valorant tactics for patient teams", categories: ["gaming", "valorant", "esports"] },
  { title: "Sunday football: the best moments", categories: ["sports", "live", "recently-uploaded"] },
  { title: "Live from the GVP music room", categories: ["live", "music", "watched"] },
  { title: "A beginner's guide to visual essays", categories: ["education", "programming", "watched"] },
  { title: "The week in three minutes", categories: ["news", "recently-uploaded"] }
];

export function HomePageContent({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const selectedCategory = homeCategories.find((category) => category.slug === activeCategory);
  const visibleVideos = activeCategory === "all"
    ? homeVideos
    : homeVideos.filter((video) => video.categories.includes(activeCategory));

  return (
    <>
      <HomeCategoryList categories={homeCategories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      {children}
      <PageHeading eyebrow={selectedCategory?.label ?? "Recommended"} title={activeCategory === "all" ? "Continue watching" : `${selectedCategory?.label ?? "Category"} for you`} action="View all" />
      {visibleVideos.length ? (
        <VideoCards titles={visibleVideos.map((video) => video.title)} />
      ) : (
        <section className="panel" role="status">
          <strong>No videos in this category yet.</strong>
          <p className="muted">Check back later for new content.</p>
        </section>
      )}
    </>
  );
}
