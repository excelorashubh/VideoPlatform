import { AppShell, PageHeading } from "../../_components/AppShell";

export default function RevenuePage() {
  return <AppShell active="/studio/revenue" eyebrow="Creator Studio" title="Revenue"><PageHeading eyebrow="Monetization" title="Your earnings" action="Download report" /><div className="revenue-total"><span>Estimated balance</span><strong>$8,420.18</strong><small>Next payout on Sep 28</small></div><div className="revenue-grid">{[["Ads", "$4,820.40"], ["Memberships", "$2,184.00"], ["Tips", "$1,415.78"]].map(([name, value]) => <article className="metric" key={name}><span>{name}</span><strong>{value}</strong><small>September to date</small></article>)}</div></AppShell>;
}
