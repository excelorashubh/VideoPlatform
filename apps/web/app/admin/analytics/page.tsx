"use client";

import { useEffect, useState } from "react";
import { getAdminAnalytics } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await getAdminAnalytics(range);
      setData(result.metrics ?? {});
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [range]);

  const metrics = [
    { label: "Users", value: data.users ?? "Data unavailable" },
    { label: "Creators", value: data.creators ?? "Data unavailable" },
    { label: "Videos", value: data.videos ?? "Data unavailable" },
    { label: "Views", value: data.views ?? "Data unavailable" },
    { label: "Watch time", value: data.watchTime ?? "Data unavailable" },
    { label: "Active users", value: data.activeUsers ?? "Data unavailable" }
  ];

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Platform analytics</p>
          <h2>Analytics</h2>
        </div>
        <div className="admin-toolbar admin-toolbar--compact">
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="1y">1 year</option>
          </select>
          <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadAnalytics()}>Refresh</button>
        </div>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      {loading ? (
        <div className="admin-empty-state">Loading analytics…</div>
      ) : (
        <div className="admin-metrics-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="admin-metric-card">
              <label>{metric.label}</label>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
