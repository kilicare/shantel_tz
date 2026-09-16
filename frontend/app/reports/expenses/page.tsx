"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function ExpenseReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiClient.get("/approvals/expenses?page=1&limit=100");
      const payload = unwrap(response);
      const rows = Array.isArray(payload) ? payload : payload.data ?? [];
      setItems(rows.filter((row: any) => row.status && row.amount != null));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Expense report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Operational cost</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Expense report</h1><p className="mt-2 text-sm text-[#172B4D]/55">Current expense entries and status state.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading expense report..." /> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ShantelCard key={item.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">{item.expenseNumber ?? item.id}</p><h2 className="mt-2 text-xl font-semibold">{item.description ?? "Expense"}</h2><div className="mt-4 space-y-2 text-sm"><p>Amount: <span className="font-semibold">{money.format(Number(item.amount ?? 0))}</span></p><p>Status: <span className="font-semibold">{item.status}</span></p></div></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
