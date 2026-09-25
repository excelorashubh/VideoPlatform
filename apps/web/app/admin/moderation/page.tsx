"use client";

import { useEffect, useState } from "react";
import { getAdminModeration, type AdminModerationItem } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminModerationPage() {
  const [items, setItems] = useState<AdminModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModeration = async () => {
    setLoading(true);
    try {
      const data = await getAdminModeration();
      setItems(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModeration();
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Moderation queue</p>
          <h2>Moderation</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadModeration()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading moderation queue…</div>
        ) : items.length === 0 ? (
          <div className="admin-empty-state">No moderation items are currently queued.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Reason</th>
                <th>Reports</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.kind}</td>
                  <td>{item.reason}</td>
                  <td>{item.count}</td>
                  <td><span className={`admin-status ${item.status === "OPEN" ? "degraded" : "operational"}`}>{item.status}</span></td>
                  <td>{item.assignedModerator}</td>
                  <td><button type="button" className="admin-button admin-button--ghost">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
