"use client";

import { useEffect, useState } from "react";
import { getAdminStorage, type AdminStorageStatus } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminStoragePage() {
  const [storage, setStorage] = useState<AdminStorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const data = await getAdminStorage();
      setStorage(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load storage status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStorage();
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Object storage</p>
          <h2>Storage</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadStorage()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      {loading || !storage ? (
        <div className="admin-empty-state">Loading storage status…</div>
      ) : (
        <div className="admin-metrics-grid">
          <div className="admin-metric-card">
            <label>Connection status</label>
            <strong>{storage.connectionStatus}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Bucket</label>
            <strong>{storage.bucket}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Total objects</label>
            <strong>{storage.totalObjects}</strong>
          </div>
          <div className="admin-metric-card">
            <label>Storage size</label>
            <strong>{storage.totalStorageSize}</strong>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
