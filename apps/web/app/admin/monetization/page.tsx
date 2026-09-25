"use client";

import { useEffect, useState } from "react";
import { getAdminMonetization } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminMonetizationPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonetization = async () => {
    setLoading(true);
    try {
      const result = await getAdminMonetization();
      setData(result);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load monetization.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMonetization();
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Creator monetization</p>
          <h2>Monetization</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadMonetization()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      {loading ? (
        <div className="admin-empty-state">Loading monetization overview…</div>
      ) : (
        <div className="admin-metrics-grid">
          <div className="admin-metric-card">
            <label>Eligible creators</label>
            <strong>{String((data as any).totalEligible ?? "Data unavailable")}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Subscriber threshold</label>
            <strong>{String(((data as any).threshold?.subscribers) ?? "1,000")}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Watch hour threshold</label>
            <strong>{String(((data as any).threshold?.watchHours) ?? "2,000")}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Payment setup</label>
            <strong>{String((data as any).paymentStatus ?? "Not Connected")}</strong>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
