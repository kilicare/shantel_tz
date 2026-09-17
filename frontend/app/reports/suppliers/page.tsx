"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function SupplierReportsPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const suppliersResponse = await apiClient.get("/suppliers?page=1&limit=100");
      const supplierList = Array.isArray(unwrap(suppliersResponse)) ? unwrap(suppliersResponse) : unwrap(suppliersResponse).data ?? [];
      const rows = await Promise.all(supplierList.map(async (supplier: any) => {
        try {
          const balance = await apiClient.get(`/payments/reports/supplier/${supplier.id}/liability`);
          const detail = unwrap(balance);
          return { id: supplier.id, name: supplier.name, outstandingLiability: detail.outstandingLiability ?? 0, totalReceived: detail.totalReceived ?? 0, totalPaid: detail.totalPaid ?? 0 };
        } catch {
          return { id: supplier.id, name: supplier.name, outstandingLiability: 0, totalReceived: 0, totalPaid: 0 };
        }
      }));
      setSuppliers(rows.filter((row) => row.outstandingLiability !== 0 || row.totalReceived > 0));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Supplier balance report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Supplier exposure</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Supplier balance report</h1><p className="mt-2 text-sm text-foreground/55">Open liabilities and supplier payment coverage.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading supplier balances..." /> : suppliers.length === 0 ? <div className="mt-8"><EmptyState title="No supplier liabilities" description="No supplier liability data is currently available." /></div> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => <ShantelCard key={supplier.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Supplier</p><h2 className="mt-2 text-xl font-semibold">{supplier.name}</h2><div className="mt-4 space-y-2 text-sm"><p>Total received: <span className="font-semibold">{money.format(supplier.totalReceived)}</span></p><p>Total paid: <span className="font-semibold">{money.format(supplier.totalPaid)}</span></p><p>Outstanding: <span className="font-semibold">{money.format(supplier.outstandingLiability)}</span></p></div></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
