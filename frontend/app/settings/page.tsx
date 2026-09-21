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
          <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Administration</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Settings</h1>
              <p className="mt-2 text-sm text-foreground/55">Users, roles, permissions, and document configuration for the workspace.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void loadSettings()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-card"><RefreshCw size={15} /> Refresh</button>
              <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> New user</button>
            </div>
          </header>
          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-border-default bg-primary/8 px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-border-default bg-status-success-surface px-4 py-3 text-sm text-muted-foreground">{message}</div>}
          {showForm && <form onSubmit={createUser} className="mt-8 bg-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-amber">User access</p><h2 className="mt-2 text-2xl font-semibold">Create workspace user</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close user form" className="text-primary-foreground/60 hover:text-white"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber" placeholder="user@company.com" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Username</span><input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber" placeholder="jdoe" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Full name</span><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber" placeholder="John Doe" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Phone</span><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber" placeholder="+255 123 456 789" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber" placeholder="••••••••" /></label><label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">Role</span><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full rounded-lg border border-transparent bg-primary-foreground/10 px-3 py-2.5 text-sm text-primary-foreground outline-none focus:border-brand-amber"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70 hover:text-white">Cancel</button><button type="submit" disabled={saving} className="bg-brand-amber px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-forest disabled:cursor-wait disabled:opacity-60">{saving ? "Creating..." : "Create user"}</button></div></form>}
          <div className="mt-8 flex items-center gap-3 rounded-lg border border-border-default bg-card px-4 py-3"><Search size={18} className="text-primary" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name, email, or status..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
          <div className="mt-6 overflow-hidden rounded-lg border border-border-default bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border-default bg-primary/8">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-primary">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-primary">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-primary">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-primary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {loading ? <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Loading users...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No users found.</td></tr> : filteredUsers.map((user) => <tr key={user.id} className="hover:bg-primary/8"><td className="px-5 py-3 font-medium">{user.name ?? "-"}</td><td className="px-5 py-3">{user.email}</td><td className="px-5 py-3">{user.userRoles?.[0]?.role?.name ?? "-"}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-status-success-surface text-status-success-text" : "bg-status-danger-surface text-status-danger-text"}`}>{user.status}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
