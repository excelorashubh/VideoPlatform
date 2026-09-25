"use client";

import { useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings, type AdminSettings } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      setSettings(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await updateAdminSettings(settings as Record<string, unknown>);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Platform configuration</p>
          <h2>Settings</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      {loading || !settings ? (
        <div className="admin-empty-state">Loading settings…</div>
      ) : (
        <div className="admin-settings-grid">
          <div className="admin-settings-card">
            <h3>Platform</h3>
            <label>Platform name <input value={settings.platform.name} readOnly /></label>
            <label>Description <input value={settings.platform.description} readOnly /></label>
          </div>
          <div className="admin-settings-card">
            <h3>Registration</h3>
            <label>Allow registration <input value={String(settings.registration.allowRegistration)} readOnly /></label>
            <label>Email verification <input value={String(settings.registration.emailVerificationRequired)} readOnly /></label>
          </div>
          <div className="admin-settings-card">
            <h3>Creator</h3>
            <label>Onboarding enabled <input value={String(settings.creator.onboardingEnabled)} readOnly /></label>
            <label>Monetization threshold <input value={`${settings.creator.monetizationThresholdSubscribers} subscribers / ${settings.creator.monetizationThresholdWatchHours} watch hours`} readOnly /></label>
          </div>
          <div className="admin-settings-card">
            <h3>Storage</h3>
            <label>Provider status <input value={settings.storage.providerStatus} readOnly /></label>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
