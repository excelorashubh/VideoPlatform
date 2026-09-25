"use client";

type HomeCategory = {
  id: string;
  label: string;
  slug: string;
};

export const homeCategories: HomeCategory[] = [
  { id: "all", label: "All", slug: "all" },
  { id: "gaming", label: "Gaming", slug: "gaming" },
  { id: "music", label: "Music", slug: "music" },
  { id: "live", label: "Live", slug: "live" },
  { id: "sports", label: "Sports", slug: "sports" },
  { id: "news", label: "News", slug: "news" },
  { id: "movies", label: "Movies", slug: "movies" },
  { id: "comedy", label: "Comedy", slug: "comedy" },
  { id: "podcasts", label: "Podcasts", slug: "podcasts" },
  { id: "technology", label: "Technology", slug: "technology" },
  { id: "programming", label: "Programming", slug: "programming" },
  { id: "education", label: "Education", slug: "education" },
  { id: "bgmi", label: "BGMI", slug: "bgmi" },
  { id: "minecraft", label: "Minecraft", slug: "minecraft" },
  { id: "gta", label: "GTA", slug: "gta" },
  { id: "valorant", label: "Valorant", slug: "valorant" },
  { id: "esports", label: "Esports", slug: "esports" },
  { id: "recently-uploaded", label: "Recently uploaded", slug: "recently-uploaded" },
  { id: "watched", label: "Watched", slug: "watched" }
];

type HomeCategoryListProps = {
  categories: HomeCategory[];
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
};

export function HomeCategoryList({ categories, activeCategory, onCategoryChange }: HomeCategoryListProps) {
  return (
    <nav aria-label="Home video categories" style={{ overflowX: "auto", maxWidth: "100%", paddingBottom: 4, scrollbarWidth: "none" }}>
      <div style={{ display: "flex", gap: 8, minWidth: "max-content", whiteSpace: "nowrap" }}>
        {categories.map((category) => {
          const isActive = category.slug === activeCategory;
          return (
            <button
              key={category.id}
              type="button"
              className={isActive ? "primary-button" : "secondary-button"}
              aria-pressed={isActive}
              onClick={() => onCategoryChange(category.slug)}
              style={{ minHeight: 38, borderRadius: 999, padding: "0 16px", whiteSpace: "nowrap" }}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
