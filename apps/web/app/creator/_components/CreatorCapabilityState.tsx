import type { LucideIcon } from "lucide-react";

export function CreatorCapabilityState({ icon: Icon, eyebrow, title, description }: { icon: LucideIcon; eyebrow: string; title: string; description: string }) {
  return <main className="creator-capability-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">{eyebrow}</p><h1>{title}</h1></div></header>
    <section className="creator-feature-empty"><span className="creator-feature-empty-icon"><Icon size={22} aria-hidden="true" /></span><h2>This capability is not connected</h2><p>{description}</p></section>
  </main>;
}