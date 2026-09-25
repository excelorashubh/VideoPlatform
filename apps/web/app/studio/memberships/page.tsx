import { AppShell, PageHeading } from "../../_components/AppShell";

export default function MembershipsPage() {
  return <AppShell active="/studio/memberships" eyebrow="Creator Studio" title="Memberships"><PageHeading eyebrow="Support from your audience" title="Member health" action="Manage perks" /><div className="metric-grid"><article className="metric"><span>Active members</span><strong>428</strong><small>↑ 24 this month</small></article><article className="metric"><span>Monthly revenue</span><strong>$2,184</strong><small>↑ 11% from last month</small></article><article className="metric"><span>Churn</span><strong>2.8%</strong><small>↓ 0.6 points</small></article></div><div className="panel membership-panel"><p className="kicker">Your tiers</p><h3>Keep the promise clear.</h3><p>Give members a reason to stay close with early access, private posts, and thoughtful extras.</p><button className="primary-button">Create a tier</button></div></AppShell>;
}
