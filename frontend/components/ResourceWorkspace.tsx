"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";

type ResourceWorkspaceProps = { eyebrow: string; title: string; description: string; endpoint: string; emptyLabel: string; createPermission?: string; createLabel?: string };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export function ResourceWorkspace({ eyebrow, title, description, endpoint, emptyLabel, createPermission, createLabel = "New record" }: ResourceWorkspaceProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    try {
      setLoading(true);
      setError("");
      const result = unwrap(await apiClient.get(endpoint));
      setRecords(Array.isArray(result) ? result : result ? [result] : []);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || `${title} could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void load(); }, []);
  const filtered = records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase()));
  const canCreate = createPermission ? permissions.includes(createPermission) : false;
  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto w-full min-w-0 max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">{eyebrow}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{title}</h1><p className="mt-2 text-sm text-[#17221f]/55">{description}</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>{canCreate && <button type="button" className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> {createLabel}</button>}</div></header>{error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}<ShantelCard className="mt-8 p-4 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ad6742]">Directory</p><h2 className="mt-2 text-2xl font-semibold">{title}</h2></div><span className="text-xs text-[#17221f]/45">{filtered.length} records</span></div><div className="relative mt-5"><Search size={17} className="absolute left-0 top-3 text-[#17221f]/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="h-11 w-full border-b border-[#17221f]/15 bg-transparent pl-7 text-sm outline-none focus:border-[#ad6742]" /></div>{loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : filtered.length ? <div className="mt-4 divide-y divide-[#17221f]/10">{filtered.slice(0, 100).map((record, index) => <div key={record.id ?? index} className="py-4"><p className="text-sm font-semibold">{record.name ?? record.product?.name ?? record.supplier?.name ?? record.email ?? record.number ?? record.invoiceNumber ?? record.id ?? "Record"}</p><p className="mt-1 line-clamp-2 text-xs text-[#17221f]/45">{record.status ?? record.code ?? record.phone ?? record.description ?? "Operational record"}</p></div>)}</div> : <EmptyState title={emptyLabel} />}</ShantelCard></div></main></>;
}
