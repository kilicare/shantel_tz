"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search, X, Edit, UserX, Key, ShieldCheck } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type UserRecord = { id: string; name?: string; email: string; status: string; phone?: string; username?: string; userRoles?: Array<{ role?: { name?: string; id?: string } }> };
type RoleRecord = { id: string; name: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", username: "", password: "", name: "", phone: "", roleId: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", roleId: "" });
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: "" });
  const isNavigating = useNavigationLoading();

  // Get user permissions from sessionStorage
  const userPermissions = (() => {
    try {
      const user = JSON.parse(sessionStorage.getItem("shantel_user") ?? "null");
      return user?.permissions ?? [];
    } catch {
      return [];
    }
  })();

  const canEditUser = userPermissions.includes("users.edit");
  const canDeactivateUser = userPermissions.includes("users.deactivate");

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      const [usersResponse, rolesResponse] = await Promise.all([apiClient.get("/users?page=1&limit=100"), apiClient.get("/roles")]);
      setUsers(unwrap(usersResponse));
      setRoles(unwrap(rolesResponse));
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSettings(); }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.email || !form.username || !form.password || !form.name || !form.roleId) {
      setError("Email, username, name, password, and role are required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await apiClient.post("/users", form);
      setForm({ email: "", username: "", password: "", name: "", phone: "", roleId: "" });
      setShowForm(false);
      setMessage("User created successfully.");
      await loadSettings();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      const errorMessage = Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "User could not be created.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function editUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !editForm.name) {
      setError("Name is required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      
      // Only send phone if it has a value
      const updateData: any = {
        name: editForm.name,
      };
      if (editForm.phone) {
        updateData.phone = editForm.phone;
      }
      
      await apiClient.patch(`/users/${selectedUser.id}`, updateData);
      
      // Update role if changed
      if (editForm.roleId && editForm.roleId !== selectedUser.userRoles?.[0]?.role?.id) {
        await apiClient.post(`/users/${selectedUser.id}/roles/${editForm.roleId}`);
      }
      
      setEditForm({ name: "", phone: "", roleId: "" });
      setShowEditForm(false);
      setSelectedUser(null);
      setMessage("User updated successfully.");
      await loadSettings();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "User could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeactivateUser(user: UserRecord) {
    setSelectedUser(user);
    setShowDeactivateConfirm(true);
  }

  async function executeDeactivateUser() {
    if (!selectedUser) return;
    
    try {
      setSaving(true);
      setError("");
      await apiClient.post(`/users/${selectedUser.id}/deactivate`);
      setMessage("User deactivated successfully.");
      setShowDeactivateConfirm(false);
      setSelectedUser(null);
      await loadSettings();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "User could not be deactivated.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !resetPasswordForm.newPassword) {
      setError("New password is required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await apiClient.patch(`/users/${selectedUser.id}`, {
        password: resetPasswordForm.newPassword,
      });
      setResetPasswordForm({ newPassword: "" });
      setShowResetPasswordForm(false);
      setSelectedUser(null);
      setMessage("Password reset successfully.");
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Password could not be reset.");
    } finally {
      setSaving(false);
    }
  }

  function openEditForm(user: UserRecord) {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      roleId: user.userRoles?.[0]?.role?.id || "",
    });
    setShowEditForm(true);
  }

  function confirmEditUser(user: UserRecord) {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      roleId: user.userRoles?.[0]?.role?.id || "",
    });
    setShowEditForm(true);
  }

  function openResetPasswordForm(user: UserRecord) {
    setSelectedUser(user);
    setResetPasswordForm({ newPassword: "" });
    setShowResetPasswordForm(true);
  }

  function confirmResetPassword(user: UserRecord) {
    setSelectedUser(user);
    setResetPasswordForm({ newPassword: "" });
    setShowResetPasswordForm(true);
  }

  const filteredUsers = users.filter((user) => `${user.name ?? ""} ${user.email} ${user.status}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-border-subtle pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-label font-semibold uppercase tracking-wide text-blue-primary">Administration</p>
              <h1 className="mt-2 text-h1 font-semibold tracking-tight">Settings</h1>
              <p className="mt-2 text-body text-text-muted">Users, roles, permissions, and document configuration for the workspace.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadSettings()} className="flex items-center gap-2 border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide hover:bg-surface"><RefreshCw size={16} /> Refresh</button>
              <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-primary px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground"><Plus size={16} /> New user</button>
            </div>
          </header>
          {error && <div role="alert" className="mt-6 flex items-center gap-3 rounded-md border border-danger bg-danger-soft px-4 py-3 text-body text-danger"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 rounded-md border border-success bg-success-soft px-4 py-3 text-body text-success-text">{message}</div>}
          {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><form onSubmit={createUser} className="flex h-full w-full max-h-[90vh] max-w-md flex-col rounded-2xl border border-border-default bg-surface text-text-primary shadow-elevation-3 sm:h-auto sm:max-h-[85vh]" role="dialog" aria-modal="true"><div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-8"><div><p className="text-caption font-semibold uppercase tracking-wide text-blue-primary">User Management</p><h2 className="mt-2 text-h3 font-semibold">Create New User</h2></div><button type="button" onClick={() => { setShowForm(false); setError(""); }} aria-label="Close dialog" className="rounded-md p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-6 sm:p-8">{error && <div role="alert" className="mb-4 flex items-center gap-3 rounded-md border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"><AlertCircle size={16} /> {error}</div>}<div className="grid gap-4"><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="gervas.materu@company.com" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Username</span><input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="gervas.materu" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Full name</span><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="Gervas Materu" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Phone</span><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="+255 123 456 789" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Role</span><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="Secure password" /></label></div></div><div className="flex shrink-0 flex-col gap-3 border-t border-border-subtle p-6 sm:flex-row sm:justify-end sm:p-8"><button type="button" onClick={() => { setShowForm(false); setError(""); }} className="w-full border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-text-primary hover:bg-surface-hover sm:w-auto">Cancel</button><button type="submit" disabled={saving} className="w-full bg-brand-primary px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-brand-primary-hover disabled:opacity-60 sm:w-auto">{saving ? "Creating..." : "Create User"}</button></div></form></div>}
          
          {showEditForm && selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowEditForm(false); setSelectedUser(null); setEditForm({ name: "", phone: "", roleId: "" }); setError(""); }}}><form onSubmit={editUser} className="flex h-full w-full max-h-[90vh] max-w-md flex-col rounded-2xl border border-border-default bg-surface text-text-primary shadow-elevation-3 sm:h-auto sm:max-h-[85vh]" role="dialog" aria-modal="true"><div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-8"><div><p className="text-caption font-semibold uppercase tracking-wide text-blue-primary">User Management</p><h2 className="mt-2 text-h3 font-semibold">Edit User</h2><p className="mt-1 text-body text-text-muted">{selectedUser.email}</p></div><button type="button" onClick={() => { setShowEditForm(false); setSelectedUser(null); setEditForm({ name: "", phone: "", roleId: "" }); setError(""); }} aria-label="Close dialog" className="rounded-md p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-6 sm:p-8">{error && <div role="alert" className="mb-4 flex items-center gap-3 rounded-md border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"><AlertCircle size={16} /> {error}</div>}<div className="grid gap-4"><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Full name</span><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="Gervas Materu" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Phone</span><input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="+255 123 456 789" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">Role</span><select value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></div></div><div className="flex shrink-0 flex-col gap-3 border-t border-border-subtle p-6 sm:flex-row sm:justify-end sm:p-8"><button type="button" onClick={() => { setShowEditForm(false); setSelectedUser(null); setEditForm({ name: "", phone: "", roleId: "" }); setError(""); }} className="w-full border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-text-primary hover:bg-surface-hover sm:w-auto">Cancel</button><button type="submit" disabled={saving} className="w-full bg-brand-primary px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-brand-primary-hover disabled:opacity-60 sm:w-auto">{saving ? "Updating..." : "Update User"}</button></div></form></div>}
          
          {showResetPasswordForm && selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowResetPasswordForm(false); setSelectedUser(null); setResetPasswordForm({ newPassword: "" }); setError(""); }}}><form onSubmit={resetPassword} className="flex h-full w-full max-h-[90vh] max-w-md flex-col rounded-2xl border border-border-default bg-surface text-text-primary shadow-elevation-3 sm:h-auto sm:max-h-[85vh]" role="dialog" aria-modal="true"><div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-8"><div><p className="text-caption font-semibold uppercase tracking-wide text-blue-primary">User Management</p><h2 className="mt-2 text-h3 font-semibold">Reset Password</h2><p className="mt-1 text-body text-text-muted">{selectedUser.email}</p></div><button type="button" onClick={() => { setShowResetPasswordForm(false); setSelectedUser(null); setResetPasswordForm({ newPassword: "" }); setError(""); }} aria-label="Close dialog" className="rounded-md p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-6 sm:p-8">{error && <div role="alert" className="mb-4 flex items-center gap-3 rounded-md border border-danger bg-danger-soft px-4 py-3 text-sm text-danger"><AlertCircle size={16} /> {error}</div>}<div><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-text-secondary">New password</span><input type="password" value={resetPasswordForm.newPassword} onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })} className="h-11 w-full rounded-md border border-border-subtle bg-card px-3 text-body text-text-primary outline-none focus:border-blue-primary" placeholder="New secure password" /></label></div></div><div className="flex shrink-0 flex-col gap-3 border-t border-border-subtle p-6 sm:flex-row sm:justify-end sm:p-8"><button type="button" onClick={() => { setShowResetPasswordForm(false); setSelectedUser(null); setResetPasswordForm({ newPassword: "" }); setError(""); }} className="w-full border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-text-primary hover:bg-surface-hover sm:w-auto">Cancel</button><button type="submit" disabled={saving} className="w-full bg-brand-primary px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-brand-primary-hover disabled:opacity-60 sm:w-auto">{saving ? "Resetting..." : "Reset Password"}</button></div></form></div>}
          
          {showDeactivateConfirm && selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDeactivateConfirm(false); }}><div className="max-w-sm w-full rounded-2xl border border-border-default bg-surface p-6 text-text-primary shadow-elevation-3" role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-4"><div><p className="text-caption font-semibold uppercase tracking-wide text-blue-primary">User Management</p><h2 className="mt-2 text-h3 font-semibold">Deactivate User</h2></div><button type="button" onClick={() => { setShowDeactivateConfirm(false); setSelectedUser(null); }} aria-label="Close dialog" className="rounded-md p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={18} /></button></div><div className="mt-6"><p className="text-body text-text-muted">Are you sure you want to deactivate <strong>{selectedUser.name || selectedUser.email}</strong>? This action will prevent the user from accessing the system.</p></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setShowDeactivateConfirm(false); setSelectedUser(null); }} className="border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-text-primary hover:bg-surface-hover">Cancel</button><button type="button" onClick={() => executeDeactivateUser()} disabled={saving} className="bg-danger px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-danger/90 disabled:opacity-60">{saving ? "Deactivating..." : "Deactivate User"}</button></div></div></div>}
          <div className="mt-8 flex items-center gap-3 rounded-md border border-border-subtle bg-surface px-4 py-3"><Search size={18} className="text-blue-primary" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name, email, or status..." className="flex-1 bg-transparent text-body outline-none placeholder:text-text-muted" /></div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table className="w-full min-w-[720px] text-body">
              <thead className="border-b border-border-subtle bg-surface-muted">
                <tr>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">User</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Email</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Username</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Phone</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Role</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? <tr><td colSpan={7} className="px-5 py-8 text-center text-text-muted">Loading users...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan={7} className="px-5 py-8 text-center text-text-muted">No users found.</td></tr> : filteredUsers.map((user) => <tr key={user.id} className="hover:bg-surface-hover"><td className="px-5 py-3 font-medium">{user.name ?? "-"}</td><td className="px-5 py-3">{user.email}</td><td className="px-5 py-3">{user.username ?? "-"}</td><td className="px-5 py-3">{user.phone ?? "-"}</td><td className="px-5 py-3">{user.userRoles?.[0]?.role?.name ?? "-"}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-3 py-1.5 text-label font-semibold ${user.status === "ACTIVE" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"}`}>{user.status}</span></td><td className="px-5 py-3"><div className="flex items-center gap-2">{canEditUser && <button type="button" onClick={() => confirmEditUser(user)} className="p-2 rounded-md border border-border-subtle hover:bg-surface-hover" title="Edit user"><Edit size={16} /></button>}{canDeactivateUser && user.status === "ACTIVE" && <button type="button" onClick={() => confirmDeactivateUser(user)} className="p-2 rounded-md border border-danger bg-danger-soft hover:bg-danger-soft/70" title="Deactivate user"><UserX size={16} /></button>}{canEditUser && <button type="button" onClick={() => confirmResetPassword(user)} className="p-2 rounded-md border border-border-subtle hover:bg-surface-hover" title="Reset password"><Key size={16} /></button>}</div></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
