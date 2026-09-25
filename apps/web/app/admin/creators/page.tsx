"use client";

import { useEffect, useState } from "react";
import { approveAdminCreator, getAdminCreators, rejectAdminCreator, type AdminCreator } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const loadCreators = async () => {
    setLoading(true);
    try {
      const data = await getAdminCreators(search, statusFilter);
      setCreators(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load creators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCreators();
  }, [search, statusFilter]);

  async function approve(creator: AdminCreator) {
    setApproving(creator.id);
    try {
      await approveAdminCreator(creator.id);
      await loadCreators();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve creator.");
    } finally {
      setApproving(null);
    }
  }

  async function reject(creator: AdminCreator) {
    setApproving(creator.id);
    try {
      await rejectAdminCreator(creator.id);
      await loadCreators();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject creator.");
    } finally {
      setApproving(null);
    }
  }

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">Creator operations</p>
          <h2>Creators</h2>
        </div>
        <button type="button" className="admin-button admin-button--secondary" onClick={() => void loadCreators()}>Refresh</button>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search creators" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All creators</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading creators…</div>
        ) : creators.length === 0 ? (
          <div className="admin-empty-state">No creator records found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Handle</th>
                <th>Category</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((creator) => (
                <tr key={creator.id}>
                  <td>{creator.name}</td>
                  <td>{creator.handle}</td>
                  <td>{creator.category}</td>
                  <td><span className={`admin-status ${creator.status === "SUSPENDED" ? "unavailable" : "operational"}`}>{creator.status}</span></td>
                  <td>{creator.verificationStatus}</td>
                  <td>{creator.status === "PENDING" ? <><button type="button" className="admin-button admin-button--ghost" disabled={approving === creator.id} onClick={() => void approve(creator)}>{approving === creator.id ? "Working..." : "Approve"}</button> <button type="button" className="admin-button admin-button--danger" disabled={approving === creator.id} onClick={() => void reject(creator)}>Reject</button></> : <span className="muted">No action</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
