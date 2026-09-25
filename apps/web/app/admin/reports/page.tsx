"use client";

import { useEffect, useState } from "react";
import { getAdminReports, type AdminReport } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getAdminReports(search, statusFilter);
      setReports(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, [search, statusFilter]);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Report handling</p>
          <h2>Reports</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadReports()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All status</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="admin-empty-state">No reports reported.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Target</th>
                <th>Category</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reporter.displayName}</td>
                  <td>{report.targetType}</td>
                  <td>{report.reason}</td>
                  <td><span className="admin-status degraded">OPEN</span></td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
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
