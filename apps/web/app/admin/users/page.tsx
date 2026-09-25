"use client";

import { useEffect, useState } from "react";
import { createAdminUser, deleteAdminUser, getAdminUsers, restoreAdminUser, suspendAdminUser, unsuspendAdminUser, updateAdminUser, updateAdminUserRole, type AdminUser, type AdminUserInput } from "../../../lib/api";
import { AdminShell } from "../_components/AdminShell";

const roles: AdminUser["role"][] = ["VIEWER", "CREATOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

function ActionIcon({ name }: { name: "edit" | "pause" | "plus" | "refresh" | "restore" | "save" | "close" | "trash" }) {
  const paths = {
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11" /><path d="M3 5v6h6" /><path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13" /><path d="M21 19v-6h-6" /></>,
    restore: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" /><path d="M12 7v5l3 2" /></>,
    save: <><path d="M5 4h12l2 2v14H5Z" /><path d="M8 4v6h8V4" /><path d="M8 20v-6h8v6" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    trash: <><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="m6 7 1 13h10l1-13" /><path d="M9 7V4h6v3" /></>
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AdminUserInput>({ email: "", displayName: "", password: "", role: "VIEWER" });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers(search, roleFilter, statusFilter);
      setUsers(data);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [search, roleFilter, statusFilter]);

  async function changeRole(userId: string, role: AdminUser["role"]) {
    setUpdatingId(userId);
    try {
      await updateAdminUserRole(userId, role);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  function beginCreate() {
    setEditingUser(null);
    setForm({ email: "", displayName: "", password: "", role: "VIEWER" });
    setShowForm(true);
  }

  function beginEdit(user: AdminUser) {
    setEditingUser(user);
    setForm({ email: user.email, displayName: user.displayName, password: "", role: user.role });
    setShowForm(true);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingId(editingUser?.id ?? "new");
    try {
      const input = form.password ? form : { email: form.email, displayName: form.displayName, role: form.role };
      const saved = editingUser ? await updateAdminUser(editingUser.id, input) : await createAdminUser(form);
      setUsers((current) => editingUser ? current.map((user) => user.id === saved.id ? { ...user, ...saved } : user) : [saved, ...current]);
      setShowForm(false);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save user.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Permanently delete the account for ${user.displayName}? This removes the user and owned platform records from the database.`)) return;
    setUpdatingId(user.id);
    try {
      await deleteAdminUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete account.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function suspendUser(user: AdminUser) {
    if (!window.confirm(`Suspend ${user.displayName}? They will be signed out and unable to access the platform.`)) return;
    setUpdatingId(user.id);
    try {
      const result = await suspendAdminUser(user.id);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, suspendedAt: result.suspendedAt } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to suspend user.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function unsuspendUser(user: AdminUser) {
    setUpdatingId(user.id);
    try {
      await unsuspendAdminUser(user.id);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, suspendedAt: null } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to restore access.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function restoreUser(user: AdminUser) {
    setUpdatingId(user.id);
    try {
      await restoreAdminUser(user.id);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, deletedAt: null } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to restore user.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminShell>
      <section className="admin-page-header">
        <div>
          <p className="admin-kicker">User administration</p>
          <h2>Users</h2>
        </div>
        <div className="admin-toolbar admin-toolbar--compact">
          <button type="button" className="admin-button admin-button--secondary admin-icon-button" aria-label="Refresh users" title="Refresh users" onClick={() => void loadUsers()}><ActionIcon name="refresh" /></button>
          <button type="button" className="admin-button admin-icon-button" aria-label="Create user" title="Create user" onClick={beginCreate}><ActionIcon name="plus" /></button>
        </div>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="admin-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="ALL">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      {showForm ? (
        <form className="admin-settings-card admin-user-form" onSubmit={(event) => void saveUser(event)}>
          <h3>{editingUser ? "Edit user" : "Create user"}</h3>
          <div className="admin-toolbar admin-toolbar--compact">
            <input required type="text" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Display name" />
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
            <input required={!editingUser} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editingUser ? "New password (optional)" : "Password"} />
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminUser["role"] })}>
              {roles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
            </select>
            <button type="submit" className="admin-button admin-icon-button" aria-label="Save user" title="Save user" disabled={Boolean(updatingId)}><ActionIcon name="save" /></button>
            <button type="button" className="admin-button admin-button--ghost admin-icon-button" aria-label="Cancel" title="Cancel" onClick={() => setShowForm(false)}><ActionIcon name="close" /></button>
          </div>
        </form>
      ) : null}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty-state">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">No users match the current filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-name">
                      <span className="admin-user-avatar">{user.displayName?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"}</span>
                      <div>
                        <strong>{user.displayName}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select className="admin-role-select" value={user.role} disabled={updatingId === user.id} onChange={(event) => void changeRole(user.id, event.target.value as AdminUser["role"])}>
                      {roles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td><span className={`admin-status ${user.deletedAt || user.suspendedAt ? "unavailable" : "operational"}`}>{user.deletedAt ? "Deleted" : user.suspendedAt ? "Suspended" : "Active"}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="admin-user-actions">
                    <button type="button" className="admin-button admin-button--ghost admin-icon-button" aria-label={`Edit ${user.displayName}`} title="Edit user" onClick={() => beginEdit(user)}><ActionIcon name="edit" /></button>
                    {user.deletedAt ? <button type="button" className="admin-button admin-button--ghost admin-icon-button" aria-label={`Restore ${user.displayName}`} title="Restore user" disabled={updatingId === user.id} onClick={() => void restoreUser(user)}><ActionIcon name="restore" /></button> : <button type="button" className="admin-button admin-button--ghost admin-icon-button" aria-label={user.suspendedAt ? `Restore access for ${user.displayName}` : `Suspend ${user.displayName}`} title={user.suspendedAt ? "Restore access" : "Suspend user"} disabled={updatingId === user.id || user.role === "SUPER_ADMIN"} onClick={() => void (user.suspendedAt ? unsuspendUser(user) : suspendUser(user))}><ActionIcon name={user.suspendedAt ? "restore" : "pause"} /></button>}
                    <button type="button" className="admin-button admin-button--danger admin-icon-button" aria-label={`Delete account for ${user.displayName}`} title="Permanently delete account" disabled={updatingId === user.id || user.role === "SUPER_ADMIN"} onClick={() => void deleteUser(user)}><ActionIcon name="trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
