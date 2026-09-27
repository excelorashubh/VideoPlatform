"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleDollarSign, Eye, Users } from "lucide-react";
import { getCreatorAnalytics, getCreatorDashboard, getStoredSessionToken, type CreatorAnalyticsResponse, type CreatorDashboard } from "../../../lib/api";

export function CreatorMonetizationDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<CreatorDashboard | null>(null);
  const [analytics, setAnalytics] = useState<CreatorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredSessionToken()) {
      router.replace("/auth?next=/creator/monetization");
      return;
    }
    let cancelled = false;
    void Promise.all([getCreatorDashboard(), getCreatorAnalytics("lifetime", "views")]).then(([creator, lifetime]) => {
      if (!cancelled) { setDashboard(creator); setAnalytics(lifetime); }
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load monetization status.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <div className="creator-page-loading" aria-busy="true">Loading monetization status...</div>;
  if (error) return <section className="creator-feature-empty" role="alert"><h1>Unable to load monetization</h1><p>{error}</p><button className="creator-secondary-button" type="button" onClick={() => window.location.reload()}>Retry</button></section>;
  if (!dashboard || !analytics) return null;

  return <main className="creator-monetization-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">Earnings</p><h1>Monetization</h1><p>Review your channel activity and monetization availability.</p></div></header>
    <section className="creator-monetization-grid" aria-label="Available channel metrics">
      <article className="creator-settings-panel"><div className="creator-metric-heading"><Users size={18} aria-hidden="true" /><span>Current subscribers</span></div><strong>{new Intl.NumberFormat("en").format(dashboard.stats.subscribers)}</strong><small>Live count from channel subscriptions</small></article>
      <article className="creator-settings-panel"><div className="creator-metric-heading"><Eye size={18} aria-hidden="true" /><span>Lifetime views</span></div><strong>{new Intl.NumberFormat("en").format(analytics.overview.views)}</strong><small>Watch-history records for eligible channel videos</small></article>
      <article className="creator-settings-panel creator-monetization-unavailable"><div className="creator-metric-heading"><CircleDollarSign size={18} aria-hidden="true" /><span>Revenue</span></div><strong>Unavailable</strong><small>GVP does not currently record creator revenue or payouts.</small></article>
    </section>
    <section className="creator-settings-panel creator-monetization-status"><p className="creator-studio-eyebrow">Program status</p><h2>Monetization status is not configured</h2><p>The platform has no creator monetization application, approval, or eligibility tracking model yet. Watch hours are not collected, so eligibility progress cannot be calculated reliably.</p><Link href="/creator/analytics" className="creator-secondary-button">View channel analytics</Link></section>
  </main>;
}