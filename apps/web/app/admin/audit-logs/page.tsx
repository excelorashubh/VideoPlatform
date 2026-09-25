"use client";

import { useEffect, useState } from "react";
import { getAdminAuditLogs, type AdminAuditLog } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAdminAuditLogs(search);
      setLogs(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [search]);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Security audit</p>
          <h2>Audit Logs</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadLogs()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit logs" />
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div className="admin-empty-state">No audit events are available.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.action}</td>
                  <td>{log.actor?.displayName ?? "System"}</td>
                  <td>{log.entityType}</td>
                  <td><span className="admin-status operational">OK</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
