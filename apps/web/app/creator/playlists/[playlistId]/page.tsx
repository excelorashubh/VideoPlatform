import { CreatorPlaylistDetail } from "../CreatorPlaylistDetail";

export default async function CreatorPlaylistPage({ params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await params;
  return <CreatorPlaylistDetail playlistId={playlistId} />;
}