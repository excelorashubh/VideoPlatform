import { AppShell, PageHeading, VideoCards } from "../../_components/AppShell";

export default function WatchLaterPage() {
  return <AppShell active="/playlists/watch-later" title="Watch later"><PageHeading eyebrow="Saved for another moment" title="Your queue" action="Clear queue" /><VideoCards titles={["The future of public space", "Notes on making a living archive", "Three ways to see a familiar place"]} /></AppShell>;
}