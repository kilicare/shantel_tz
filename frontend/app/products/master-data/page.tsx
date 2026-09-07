"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type MasterItem = { id: string; name: string; code?: string; description?: string; status?: string };
type Kind = "categories" | "brands" | "units";
const labels: Record<Kind, string> = { categories: "Categories", brands: "Brands", units: "Units" };
const singularLabels: Record<Kind, string> = { categories: "Category", brands: "Brand", units: "Unit" };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function ProductMasterDataPage() {
  const [kind, setKind] = useState<Kind>("categories");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadItems() {
    try { setLoading(true); setError(""); setItems(unwrap(await apiClient.get(`/products/${kind}?page=1&limit=100`))); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || `${labels[kind]} could not be loaded.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadItems(); setForm({ name: "", code: "", description: "" }); setEditingId(""); setSearch(""); }, [kind]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || (kind === "units" && !form.code.trim())) { setError(`${labels[kind]} name${kind === "units" ? " and code" : ""} is required.`); return; }
    try {
      setError("");
      const body = kind === "units" ? form : { name: form.name, description: form.description };
      const response = editingId ? await apiClient.patch(`/products/${kind}/${editingId}`, body) : await apiClient.post(`/products/${kind}`, body);
      const saved = unwrap(response); setMessage(`${saved.name ?? labels[kind].slice(0, -1)} ${editingId ? "updated" : "created"} successfully.`); setForm({ name: "", code: "", description: "" }); setEditingId(""); await loadItems();
    } catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || `${labels[kind]} could not be saved.`); }
  }
  async function remove(item: MasterItem) {
    try { await apiClient.delete(`/products/${kind}/${item.id}`); setMessage(`${item.name} deactivated successfully.`); await loadItems(); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || `${item.name} could not be deactivated.`); }
  }
  const filtered = items.filter((item) => `${item.name} ${item.code ?? ""} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Product master</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Categories, brands and units.</h1><p className="mt-2 text-sm text-[#17221f]/55">Maintain the reference data used by products and transactions.</p></div><button type="button" onClick={() => void loadItems()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 flex items-center gap-2 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]"><Check size={17} /> {message}</div>}<div className="mt-8 flex gap-2" role="tablist">{(Object.keys(labels) as Kind[]).map((value) => <button key={value} type="button" role="tab" aria-selected={kind === value} onClick={() => setKind(value)} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] ${kind === value ? "bg-[#17221f] text-white" : "border border-[#17221f]/15 bg-white"}`}>{labels[value]}</button>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={save} className="bg-[#17221f] p-6 text-[#f4f1ec]"><h2 className="text-xl font-semibold">{editingId ? `Edit ${singularLabels[kind]}` : `New ${singularLabels[kind]}`}</h2><label className="mt-6 block text-xs uppercase tracking-[0.12em]">Name<input aria-label={`${labels[kind]} name`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/25 bg-transparent text-sm outline-none" /></label>{kind === "units" && <label className="mt-5 block text-xs uppercase tracking-[0.12em]">Code<input aria-label="Unit code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/25 bg-transparent text-sm outline-none" /></label>}<label className="mt-5 block text-xs uppercase tracking-[0.12em]">Description<textarea aria-label={`${labels[kind]} description`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-24 w-full border border-[#f4f1ec]/20 bg-transparent p-2 text-sm outline-none" /></label><button type="submit" className="mt-6 flex items-center gap-2 bg-[#e8a36b] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#17221f]"><Plus size={15} /> {editingId ? "Save changes" : "Create"}</button></form><section className="bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{labels[kind]}</h2><span className="text-xs text-[#17221f]/45">{filtered.length} records</span></div><input aria-label={`Search ${labels[kind]}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${labels[kind].toLowerCase()}`} className="mt-5 h-11 w-full border-b border-[#17221f]/15 bg-transparent text-sm outline-none" /><div className="mt-4 divide-y divide-[#17221f]/10">{loading ? <p className="py-8 text-sm text-[#17221f]/50">Loading...</p> : filtered.length ? filtered.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{item.name}{item.code ? ` · ${item.code}` : ""}</p><p className="mt-1 text-xs text-[#17221f]/45">{item.status ?? "ACTIVE"} {item.description ? `· ${item.description}` : ""}</p></div><div className="flex gap-1"><button type="button" aria-label={`Edit ${item.name}`} onClick={() => { setEditingId(item.id); setForm({ name: item.name, code: item.code ?? "", description: item.description ?? "" }); }} className="p-2 text-[#17221f]/50"><Pencil size={15} /></button><button type="button" aria-label={`Deactivate ${item.name}`} onClick={() => void remove(item)} className="p-2 text-[#ad6742]"><Trash2 size={15} /></button></div></div>) : <p className="py-8 text-sm text-[#17221f]/50">No records found.</p>}</div></section></div></div></main></>;
}
