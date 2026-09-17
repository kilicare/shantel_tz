"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function PaymentReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const start = new Date(); start.setDate(start.getDate() - 30);
      const response = await apiClient.get(`/payments/reports/payment-methods?startDate=${start.toISOString()}&endDate=${new Date().toISOString()}`);
      setSummary(unwrap(response));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Payment report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cash movement</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Payment report</h1><p className="mt-2 text-sm text-foreground/55">Payment-method totals and recent movement for the last 30 days.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading payment report..." /> : !summary ? <EmptyState title="No payment data" description="No payment activity was returned for the selected period." /> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Object.entries(summary.summary ?? {}).map(([method, value]: [string, any]) => <ShantelCard key={method} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{method}</p><h2 className="mt-2 text-xl font-semibold">{money.format(value.total)}</h2><p className="mt-2 text-sm text-foreground/55">{value.count} payments</p></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
