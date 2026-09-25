"use client";

import { useEffect, useState } from "react";
import { getAdminProcessing, type AdminProcessing } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminProcessingPage() {
  const [jobs, setJobs] = useState<AdminProcessing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getAdminProcessing();
      setJobs(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load processing jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Media processing</p>
          <h2>Processing</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadJobs()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading processing jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="admin-empty-state">No processing jobs are currently running.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Content</th>
                <th>Type</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.id.slice(0, 8)}</td>
                  <td>{job.video?.title ?? "-"}</td>
                  <td>{job.type}</td>
                  <td><span className={`admin-status ${job.status === "FAILED" ? "unavailable" : job.status === "PROCESSING" ? "degraded" : "operational"}`}>{job.status}</span></td>
                  <td>{job.attempts}</td>
                  <td>{new Date(job.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
