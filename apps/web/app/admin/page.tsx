"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminHealth, getAdminOverview, getAdminUsers, updateAdminUserRole, type AdminHealth, type AdminOverview, type AdminUser } from "../../lib/api";
import { AdminShell } from "./_components/AdminShell";

const roles: AdminUser["role"][] = ["VIEWER", "CREATOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

const quickActions = [
  "Review creator applications",
  "Review reports",
  "Manage users",
  "View processing queue",
  "View storage",
  "Open audit logs"
];

function formatRole(role: string) {
  return role.replace("_", " ");
}

function statusClass(status: "Operational" | "Degraded" | "Unavailable" | undefined) {
  const normalized = status ?? "Degraded";
  return `admin-status ${normalized.toLowerCase()}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleMenu, setRoleMenu] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("just now");

  const loadDashboard = async () => {
    try {
      const [platform, adminUsers, platformHealth] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminHealth()
      ]);

      setOverview(platform);
      setHealth(platformHealth);
      setUsers(adminUsers);
      setLastUpdated("just now");
      setError(null);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : "";

      if (message.includes("Missing bearer token") || message.includes("Unauthorized") || message.includes("Administrator")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("gvp_session_token");
          localStorage.removeItem("gvp_user");
        }
        router.replace("/auth");
        return;
      }

      setError(message || "Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [router]);

  async function searchUsers() {
    try {
      setUsers(await getAdminUsers(search));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to search users");
    }
  }

  async function changeRole(userId: string, role: AdminUser["role"]) {
    setUpdating(userId);
    try {
      await updateAdminUserRole(userId, role);
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
      setRoleMenu(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update user role");
    } finally {
      setUpdating(null);
    }
  }

  const metricCards = useMemo(() => {
    if (!overview) return [];

    return [
      { title: "Total users", value: overview.users, description: "Registered accounts", tone: "users" },
      { title: "Creators", value: overview.creators, description: "Active creators", tone: "creators" },
      { title: "Videos", value: overview.videos, description: "Catalog records", tone: "videos" },
      { title: "Open reports", value: overview.reports, description: overview.reports ? "Needs attention" : "No action required", tone: "reports" },
      { title: "Processing", value: overview.queuedJobs, description: "Jobs in queue", tone: "processing" },
      { title: "Storage", value: overview.storageUploads, description: "Tracked media objects", tone: "storage" }
    ];
  }, [overview]);

  return (
    <AdminShell>
          <section className="admin-hero">
            <div>
              <p className="admin-kicker">Platform Overview</p>
              <h2>Platform health and operations</h2>
              <p>Monitor users, creators, content, storage, processing, and overall platform activity.</p>
            </div>
            <div className="admin-hero__meta">
              <span>Last updated: {lastUpdated}</span>
              <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </section>

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          {loading ? <p className="admin-empty-state">Loading platform data...</p> : null}

          {overview ? (
            <section className="admin-metrics" aria-label="Platform metrics">
              {metricCards.map((card) => (
                <article key={card.title} className={`admin-metric admin-metric--${card.tone}`}>
                  <div className="admin-metric__head">
                    <span>{card.title}</span>
                    <span className="admin-metric__icon">•</span>
                  </div>
                  <strong>{card.value}</strong>
                  <small>{card.description}</small>
                </article>
              ))}
            </section>
          ) : null}

          <section className="admin-columns">
            <article className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <p className="admin-kicker">Status</p>
                  <h3>Platform Health</h3>
                </div>
              </div>

              <div className="admin-health-list">
                {health ? [
                  { key: "database", value: health.database },
                  { key: "redis", value: health.redis },
                  { key: "storage", value: health.storage },
                  { key: "processing", value: health.processing }
                ].map(({ key, value }) => (
                  <div key={key} className="admin-health-item">
                    <span className="admin-health-item__label">{value.label}</span>
                    <span className={statusClass(value.status)}>{value.status}</span>
                  </div>
                )) : <p className="admin-empty-state">Health checks unavailable.</p>}
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <p className="admin-kicker">Actions</p>
                  <h3>Quick Actions</h3>
                </div>
              </div>

              <div className="admin-actions-list">
                {quickActions.map((action) => (
                  <button key={action} type="button" className="admin-action-item">
                    {action}
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="admin-panel admin-panel--wide">
            <div className="admin-panel__header">
              <div>
                <p className="admin-kicker">User management</p>
                <h3>Platform accounts</h3>
              </div>
              <div className="admin-search-row">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" />
                <button type="button" className="admin-button admin-button--secondary" onClick={() => void searchUsers()}>Search</button>
              </div>
            </div>

            <div className="admin-user-table">
              <div className="admin-user-row admin-user-row--head">
                <span>User</span>
                <span>Email</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>

              {users.length ? users.map((user) => (
                <div key={user.id} className="admin-user-row">
                  <span className="admin-user-name">
                    <span className="admin-user-avatar">{user.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"}</span>
                    <strong>{user.displayName}</strong>
                  </span>
                  <span>{user.email}</span>
                  <span>
                    <span className={`admin-role-badge admin-role-badge--${user.role.toLowerCase()}`}>
                      {formatRole(user.role)}
                    </span>
                  </span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  <span className="admin-user-actions">
                    <button type="button" className="admin-button admin-button--ghost" onClick={() => setRoleMenu(roleMenu === user.id ? null : user.id)}>
                      {roleMenu === user.id ? "Close" : "Manage"}
                    </button>
                    {roleMenu === user.id ? (
                      <select
                        className="admin-role-select"
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={(event) => void changeRole(user.id, event.target.value as AdminUser["role"])}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>{formatRole(role)}</option>
                        ))}
                      </select>
                    ) : null}
                  </span>
                </div>
              )) : <div className="admin-empty-state">No matching users found.</div>}
            </div>
          </section>
    </AdminShell>
  );
}
