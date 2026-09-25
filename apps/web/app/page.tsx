import { AppShell } from "./_components/AppShell";
import { HomePageContent } from "./_components/home/HomePageContent";

export default function HomePage() {
  return (
    <AppShell active="/">
      <HomePageContent>
        <section className="hero"><div><p className="kicker">Your viewing desk</p><h2>Find the signal<br />worth watching.</h2><p className="hero-copy">A focused home for long-form video, live moments, and the people who make them.</p></div><div className="hero-stat"><span>Creator pulse</span><strong>12.4k</strong><small>weekly impressions</small></div></section>
      </HomePageContent>
    </AppShell>
  );
}
