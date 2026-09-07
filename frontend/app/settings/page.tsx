"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

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

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Administration</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Settings</h1><p className="mt-2 text-sm text-[#172B4D]/55">Users, roles, permissions, and document configuration for the workspace.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadSettings()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button><button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> New user</button></div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">{message}</div>}{showForm && <form onSubmit={createUser} className="mt-8 bg-[#172B4D] p-6 text-[#F6F8FB] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A72C]">User access</p><h2 className="mt-2 text-2xl font-semibold">Create workspace user</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close user form" className="text-[#F6F8FB]/60 hover:text-white"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">Role<select value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })} className="mt-2 h-11 w-full border-b border-[#F6F8FB]/20 bg-[#172B4D] text-sm normal-case tracking-normal outline-none"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></div><button type="submit" disabled={saving} className="mt-6 bg-[#D4A72C] px-5 py-3 text-sm font-semibold text-[#172B4D] disabled:opacity-50">{saving ? "Creating..." : "Create user"}</button></form>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Directory</p><h2 className="mt-2 text-2xl font-semibold">Users</h2></div><span className="text-xs text-[#172B4D]/45">{filteredUsers.length} records</span></div><div className="relative mt-5"><Search size={17} className="absolute left-0 top-3 text-[#172B4D]/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="h-11 w-full border-b border-[#172B4D]/15 bg-transparent pl-7 text-sm outline-none focus:border-[#2563EB]" /></div>{loading ? <p className="py-10 text-sm text-[#172B4D]/50">Loading users...</p> : <div className="mt-4 divide-y divide-[#172B4D]/10">{filteredUsers.map((user) => <div key={user.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold">{user.name ?? user.email}</p><p className="mt-1 text-xs text-[#172B4D]/45">{user.email} · {user.userRoles?.map((item) => item.role?.name).filter(Boolean).join(", ") || "No role"}</p></div><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#16805C]">{user.status}</span></div>)}</div>}</section></div></main></>;
}
