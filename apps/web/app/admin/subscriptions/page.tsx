"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../_components/AdminShell";

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Subscriptions</p>
          <h2>Subscriptions</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary">Refresh</button>
      </section>

      {loading ? (
        <div className="admin-empty-state">Loading subscriptions…</div>
      ) : (
        <div className="admin-empty-state">No live payment/subscription integration is connected yet. The admin UI is ready for when the billing service is enabled.</div>
      )}
    </AdminShell>
  );
}
