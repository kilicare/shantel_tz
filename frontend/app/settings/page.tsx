"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type UserRecord = { id: string; name?: string; email: string; status: string; userRoles?: Array<{ role?: { name?: string } }> };
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", username: "", password: "", name: "", phone: "", roleId: "" });
  const isNavigating = useNavigationLoading();

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
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "User could not be created.");
    } finally {
      setSaving(false);
    }
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
          {showForm && <form onSubmit={createUser} className="mt-8 rounded-lg bg-brand-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-start justify-between"><div><p className="text-label font-semibold uppercase tracking-wide text-brand-amber">User access</p><h2 className="mt-2 text-h2 font-semibold">Create workspace user</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close user form" className="text-primary-foreground/60 hover:text-primary-foreground"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber" placeholder="gervas.materu@company.com" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Username</span><input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber" placeholder="gervas.materu" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Full name</span><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber" placeholder="Gervas Materu" /></label><label className="block"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Phone</span><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber" placeholder="+255 123 456 789" /></label><label className="block sm:col-span-2"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Role</span><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className="block sm:col-span-2"><span className="mb-2 block text-label font-semibold uppercase tracking-wide text-primary-foreground/80">Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 w-full rounded-md border border-transparent bg-primary-foreground/10 px-3 text-body text-primary-foreground outline-none focus:border-brand-amber" placeholder="Secure password" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="border border-border-subtle px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-primary-foreground/10">Cancel</button><button type="submit" disabled={saving} className="bg-brand-amber px-4 py-2.5 text-label font-semibold uppercase tracking-wide text-brand-primary hover:bg-brand-amber/90 disabled:opacity-60">{saving ? "Creating..." : "Create user"}</button></div></form>}
          <div className="mt-8 flex items-center gap-3 rounded-md border border-border-subtle bg-surface px-4 py-3"><Search size={18} className="text-blue-primary" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name, email, or status..." className="flex-1 bg-transparent text-body outline-none placeholder:text-text-muted" /></div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table className="w-full min-w-[720px] text-body">
              <thead className="border-b border-border-subtle bg-surface-muted">
                <tr>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">User</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Email</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Role</th>
                  <th className="px-5 py-3 text-left text-label font-semibold uppercase tracking-wide text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? <tr><td colSpan={4} className="px-5 py-8 text-center text-text-muted">Loading users...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-text-muted">No users found.</td></tr> : filteredUsers.map((user) => <tr key={user.id} className="hover:bg-surface-hover"><td className="px-5 py-3 font-medium">{user.name ?? "-"}</td><td className="px-5 py-3">{user.email}</td><td className="px-5 py-3">{user.userRoles?.[0]?.role?.name ?? "-"}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-3 py-1.5 text-label font-semibold ${user.status === "ACTIVE" ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text"}`}>{user.status}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
