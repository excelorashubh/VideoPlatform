"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LockKeyhole, Settings2, UserRound } from "lucide-react";
import { getCreatorDashboard, getCurrentUser, getStoredSessionToken, getVerificationStatus, type ApiUser, type CreatorDashboard } from "../../../lib/api";

type Verification = { email: string; emailVerified: boolean; phoneNumber: string | null; phoneVerified: boolean };

export function CreatorSettingsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [dashboard, setDashboard] = useState<CreatorDashboard | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredSessionToken()) {
      router.replace("/auth?next=/creator/settings");
      return;
    }
    let cancelled = false;
    void Promise.all([getCurrentUser(), getCreatorDashboard(), getVerificationStatus()]).then(([account, creator, verified]) => {
      if (!cancelled) { setUser(account); setDashboard(creator); setVerification(verified); }
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load account settings.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <div className="creator-page-loading" aria-busy="true">Loading settings...</div>;
  if (error) return <section className="creator-feature-empty" role="alert"><h1>Unable to load settings</h1><p>{error}</p><button className="creator-secondary-button" type="button" onClick={() => window.location.reload()}>Retry</button></section>;

  return <main className="creator-settings-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">Preferences</p><h1>Settings</h1><p>Account identity and supported channel settings.</p></div></header>
    <section className="creator-settings-panel"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Account</p><h2>Signed-in account</h2></div><UserRound size={18} aria-hidden="true" /></div><dl className="creator-settings-details"><div><dt>Name</dt><dd>{user?.displayName ?? "Unavailable"}</dd></div><div><dt>Email</dt><dd>{user?.email ?? "Unavailable"}</dd></div><div><dt>Role</dt><dd>{user?.role ?? "Unavailable"}</dd></div><div><dt>Channel</dt><dd>{dashboard?.creator.handle ? `@${dashboard.creator.handle}` : "No channel handle"}</dd></div></dl></section>
    <section className="creator-settings-panel"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Security</p><h2>Verification</h2></div><LockKeyhole size={18} aria-hidden="true" /></div><dl className="creator-settings-details"><div><dt>Email verification</dt><dd>{verification?.emailVerified ? "Verified" : "Not verified"}</dd></div><div><dt>Phone verification</dt><dd>{verification?.phoneVerified ? "Verified" : verification?.phoneNumber ? "Not verified" : "No phone on file"}</dd></div></dl><Link href="/account/settings" className="creator-secondary-button">Manage account security</Link></section>
    <section className="creator-settings-panel"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Channel</p><h2>Channel profile</h2><p>{dashboard?.channel?.displayName ?? dashboard?.creator.name} · @{dashboard?.channel?.handle ?? dashboard?.creator.handle ?? "unavailable"}</p></div><Settings2 size={18} aria-hidden="true" /></div><Link href="/creator/customization" className="creator-secondary-button">Open channel customization</Link></section>
    <section className="creator-settings-panel creator-settings-note"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Preferences</p><h2>Upload, comment, and notification defaults</h2></div><Bell size={18} aria-hidden="true" /></div><p>Persistent creator defaults and notification preferences are not stored by the current GVP settings model, so there are no non-persistent toggles here.</p></section>
  </main>;
}