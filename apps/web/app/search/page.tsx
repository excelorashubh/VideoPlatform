import { AppShell, PageHeading, VideoCards } from "../_components/AppShell";

export default function SearchPage() {
  return <AppShell active="/search" title="Search the platform"><div className="search-bar"><input aria-label="Search videos" placeholder="Search videos, channels, and live sessions" /><button>Search</button></div><PageHeading eyebrow="Results for you" title="Recent signals" /><VideoCards titles={["Designing calm interfaces", "A field guide to better questions", "The long way around the city"]} /></AppShell>;
}