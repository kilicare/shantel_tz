"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function PurchasingReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiClient.get("/purchasing/purchase-orders?page=1&limit=100");
      const rows = unwrap(response);
      const list = Array.isArray(rows) ? rows : rows.data ?? [];
      setOrders(list.map((order: any) => ({
        id: order.id,
        poNumber: order.poNumber,
        supplier: order.supplier?.name ?? order.supplierName ?? "Supplier",
        totalAmount: Number(order.totalAmount ?? 0),
        status: order.status ?? "",
      })));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Purchasing report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Procurement analytics</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Purchasing report</h1><p className="mt-2 text-sm text-foreground/55">Recent purchase orders and current procurement status.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading purchasing report..." /> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orders.map((order) => <ShantelCard key={order.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{order.poNumber}</p><h2 className="mt-2 text-xl font-semibold">{order.supplier}</h2><div className="mt-4 space-y-2 text-sm"><p>Amount: <span className="font-semibold">{money.format(order.totalAmount)}</span></p><p>Status: <span className="font-semibold">{order.status}</span></p></div></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
