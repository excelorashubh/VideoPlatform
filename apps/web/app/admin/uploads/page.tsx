"use client";

import { useEffect, useState } from "react";
import { getAdminUploads } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminUploadsPage() {
  const [uploads, setUploads] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const data = await getAdminUploads();
      setUploads(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load uploads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUploads();
  }, []);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Upload monitoring</p>
          <h2>Uploads</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadUploads()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading uploads…</div>
        ) : uploads.length === 0 ? (
          <div className="admin-empty-state">No uploads are currently tracked.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Type</th>
                <th>Size</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload, index) => (
                <tr key={`${String((upload as any).id ?? index)}`}>
                  <td>{String((upload as any).id ?? "-")}</td>
                  <td><span className="admin-status operational">{String((upload as any).status ?? "READY")}</span></td>
                  <td>{String((upload as any).contentType ?? "video")}</td>
                  <td>{((upload as any).fileSize ? Number((upload as any).fileSize) : 0).toString()}</td>
                  <td>{new Date(String((upload as any).createdAt ?? new Date())).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
