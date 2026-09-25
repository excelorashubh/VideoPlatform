import { AppShell, PageHeading, VideoCards } from "../../_components/AppShell";

export default async function ChannelPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <AppShell title={`@${handle}`}><div className="channel-banner"><div className="channel-avatar">G</div><div><p className="kicker">Creator channel</p><h2>GVP Editorial</h2><p className="muted">A considered collection of long-form ideas and live sessions.</p></div><button className="primary-button">Subscribe</button></div><PageHeading eyebrow="Published work" title="Videos" /><VideoCards titles={["The quiet architecture of good systems", "Field notes from a moving planet", "How sound becomes a place"]} /></AppShell>;
}