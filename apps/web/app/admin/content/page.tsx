"use client";

import { useEffect, useState } from "react";
import { getAdminContent, type AdminContentItem } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminContentPage() {
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    setLoading(true);
    try {
      const data = await getAdminContent(search, statusFilter, visibilityFilter);
      setItems(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContent();
  }, [search, statusFilter, visibilityFilter]);

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Content administration</p>
          <h2>Content</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadContent()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All status</option>
          <option value="READY">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="PROCESSING">Processing</option>
        </select>
        <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)}>
          <option value="ALL">All visibility</option>
          <option value="READY">Public</option>
          <option value="DRAFT">Private</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading content…</div>
        ) : items.length === 0 ? (
          <div className="admin-empty-state">No content matches the current filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Creator</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.creator.displayName}</td>
                  <td><span className={`admin-status ${item.status === "READY" ? "operational" : item.status === "PROCESSING" ? "degraded" : "unavailable"}`}>{item.status}</span></td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td><button type="button" className="admin-button admin-button--ghost">Inspect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
