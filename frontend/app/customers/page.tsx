"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Customer = { id: string; name: string; email?: string | null; phone?: string | null; balance?: number | string; status?: string };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try { setLoading(true); setError(""); setCustomers(unwrap(await apiClient.get("/customers?page=1&limit=100"))); }
    catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Customers could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void loadCustomers(); }, []);
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const canCreate = permissions.includes("customers.create");

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-5 py-7 text-[#17221f] sm:px-10 sm:py-10"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Customer desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Keep every relationship visible.</h1><p className="mt-2 text-sm text-[#17221f]/55">Customer contacts, balances, and sales context for the team.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadCustomers()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>{canCreate && <button type="button" className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> New customer</button>}</div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ad6742]">Directory</p><h2 className="mt-2 text-2xl font-semibold">Customers</h2></div><span className="text-xs text-[#17221f]/45">{filtered.length} records</span></div><div className="relative mt-5"><Search size={17} className="absolute left-0 top-3 text-[#17221f]/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or email" className="h-11 w-full border-b border-[#17221f]/15 bg-transparent pl-7 text-sm outline-none focus:border-[#ad6742]" /></div>{loading ? <p className="py-10 text-sm text-[#17221f]/50">Loading customers...</p> : <div className="mt-4 divide-y divide-[#17221f]/10">{filtered.length ? filtered.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><UserRound size={19} className="text-[#ad6742]" /><div><p className="text-sm font-semibold">{customer.name}</p><p className="mt-1 text-xs text-[#17221f]/45">{customer.phone ?? "No phone"} · {customer.email ?? "No email"}</p></div></div><div className="text-right"><p className="text-sm font-semibold">TSh {Number(customer.balance ?? 0).toLocaleString()}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#17221f]/40">{customer.status ?? "ACTIVE"}</p></div></div>) : <p className="py-10 text-center text-sm text-[#17221f]/50">No customers found.</p>}</div>}</section></div></main></>;
}
