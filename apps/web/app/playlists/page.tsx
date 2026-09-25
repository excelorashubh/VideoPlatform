import { AppShell, PageHeading } from "../_components/AppShell";

export default function PlaylistsPage() {
  return <AppShell active="/playlists" title="Your playlists"><PageHeading eyebrow="Organize your watching" title="Saved collections" action="New playlist" /><div className="playlist-grid">{["Watch later", "Research desk", "Weekend long-form"].map((name, index) => <article className="playlist-card" key={name}><div className={`playlist-art tone-${index + 1}`}><strong>{index === 0 ? "12" : index === 1 ? "08" : "24"}</strong><span>videos</span></div><h3>{name}</h3><p className="muted">Private collection · Updated today</p></article>)}</div></AppShell>;
}