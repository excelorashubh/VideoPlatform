import { AppShell, PageHeading, VideoCards } from "../_components/AppShell";

export default function HistoryPage() {
  return <AppShell active="/history" title="Watch history"><PageHeading eyebrow="Your trail" title="Recently watched" action="Clear history" /><VideoCards titles={["The quiet architecture of good systems", "How sound becomes a place", "Field notes from a moving planet"]} /></AppShell>;
}