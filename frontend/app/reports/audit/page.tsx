"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function AuditReportsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiClient.get("/audit/logs/recent?limit=20");
      const payload = unwrap(response);
      setLogs(Array.isArray(payload) ? payload : payload.logs ?? []);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Audit report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Traceability</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Audit report</h1><p className="mt-2 text-sm text-[#172B4D]/55">Recent audit events and action trail across core business entities.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading audit report..." /> : logs.length === 0 ? <div className="mt-8"><EmptyState title="No audit activity" description="No recent audit events were returned." /></div> : <section className="mt-8 grid gap-4">{logs.map((entry, index) => <ShantelCard key={`${entry.id ?? index}`} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">{entry.entityType ?? "Event"}</p><h2 className="mt-2 text-xl font-semibold">{entry.action ?? "Audit action"}</h2><p className="mt-2 text-sm text-[#172B4D]/55">{entry.userName ?? entry.userId ?? "System"} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown time"}</p>{entry.details ? <p className="mt-3 text-sm">{JSON.stringify(entry.details)}</p> : null}</ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
