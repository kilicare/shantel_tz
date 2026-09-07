"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, Plus, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Kind = "customers" | "suppliers" | "locations";
type Props = { kind: Kind };
type RecordItem = { id: string; name: string; email?: string; phone?: string; code?: string; balance?: number | string; status?: string };
const config = {
  customers: { title: "Customers", singular: "Customer", endpoint: "/customers", permission: "customers.create" },
  suppliers: { title: "Suppliers", singular: "Supplier", endpoint: "/suppliers", permission: "suppliers.create" },
  locations: { title: "Locations", singular: "Location", endpoint: "/locations", permission: "locations.create" },
} as const;
const initialForm = { name: "", email: "", phone: "", address: "", code: "", customerType: "INDIVIDUAL", locationType: "MAIN_STORE", description: "" };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export function MasterResourceWorkspace({ kind }: Props) {
  const current = config[kind];
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try { setLoading(true); setError(""); setRecords(unwrap(await apiClient.get(`${current.endpoint}?page=1&limit=100`))); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || `${current.title} could not be loaded.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void load(); }, [kind]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      const body = kind === "customers"
        ? { name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, customerType: form.customerType }
        : kind === "suppliers"
          ? { name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined }
          : { name: form.name, code: form.code, locationType: form.locationType, address: form.address || undefined, description: form.description || undefined };
      const saved = unwrap(await apiClient.post(current.endpoint, body));
      setMessage(`${saved.name} created successfully.`); setForm(initialForm); setShowForm(false); await load();
    } catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || `${current.singular} could not be created.`); }
  }

  const filtered = records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase()));
  const inputClass = "h-11 border-b border-[#f4f1ec]/25 bg-transparent text-sm outline-none";
  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Master data</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{current.title}</h1><p className="mt-2 text-sm text-[#17221f]/55">Contacts, balances, and operational reference records.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>{permissions.includes(current.permission) && <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> {showForm ? "Close form" : `New ${current.singular.toLowerCase()}`}</button>}</div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 flex items-center gap-2 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]"><Check size={17} /> {message}</div>}{showForm && <form onSubmit={save} className="mt-8 grid gap-4 bg-[#17221f] p-6 text-[#f4f1ec] sm:grid-cols-2"><h2 className="text-xl font-semibold sm:col-span-2">New {current.singular}</h2><input required aria-label={`${current.singular} name`} placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />{kind !== "locations" && <><input type="email" aria-label="Email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /><input aria-label="Phone" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></>}{kind === "locations" && <><input required aria-label="Location code" placeholder="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={inputClass} /><select aria-label="Location type" value={form.locationType} onChange={(event) => setForm({ ...form, locationType: event.target.value })} className="h-11 bg-[#f4f1ec] px-2 text-sm text-[#17221f]"><option value="MAIN_STORE">Main store</option><option value="BRANCH">Branch</option><option value="PROJECT_STORE">Project store</option><option value="OTHER">Other</option></select></>}{kind === "customers" && <select aria-label="Customer type" value={form.customerType} onChange={(event) => setForm({ ...form, customerType: event.target.value })} className="h-11 bg-[#f4f1ec] px-2 text-sm text-[#17221f]"><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select>}<input aria-label="Address" placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={inputClass} /><button type="submit" className="bg-[#e8a36b] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17221f] sm:col-span-2">Create {current.singular.toLowerCase()}</button></form>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between"><h2 className="text-2xl font-semibold">{current.title}</h2><span className="text-xs text-[#17221f]/45">{filtered.length} records</span></div><input aria-label={`Search ${current.title}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${current.title.toLowerCase()}`} className="mt-5 h-11 w-full border-b border-[#17221f]/15 bg-transparent text-sm outline-none" />{loading ? <p className="py-10 text-sm text-[#17221f]/50">Loading {current.title.toLowerCase()}...</p> : filtered.length ? <div className="mt-4 divide-y divide-[#17221f]/10">{filtered.map((record) => <div key={record.id} className="flex items-center justify-between py-4"><div><p className="text-sm font-semibold">{record.name}{record.code ? ` · ${record.code}` : ""}</p><p className="mt-1 text-xs text-[#17221f]/45">{record.email ?? record.phone ?? record.status ?? "ACTIVE"}</p></div>{record.balance !== undefined && <p className="text-sm font-semibold">{record.balance}</p>}</div>)}</div> : <p className="py-10 text-sm text-[#17221f]/50">No {current.title.toLowerCase()} found.</p>}</section></div></main></>;
}
