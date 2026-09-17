"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function CustomerReportsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiClient.get("/customers?page=1&limit=100");
      const rows = unwrap(response);
      const customersList = Array.isArray(rows) ? rows : rows.data ?? [];
      const summary = await Promise.all(
        customersList.map(async (customer: any) => {
          try {
            const balanceResponse = await apiClient.get(`/payments/reports/customer/${customer.id}/summary`);
            const balance = unwrap(balanceResponse);
            return {
              id: customer.id,
              name: customer.name,
              totalInvoiced: balance.totalInvoiced ?? 0,
              totalPaid: balance.totalPaid ?? 0,
              totalReturned: balance.totalReturned ?? 0,
              totalBalance: balance.totalBalance ?? 0,
            };
          } catch {
            return { id: customer.id, name: customer.name, totalInvoiced: 0, totalPaid: 0, totalReturned: 0, totalBalance: 0 };
          }
        }),
      );
      setCustomers(summary.filter((customer) => customer.totalInvoiced > 0 || customer.totalBalance !== 0));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Customer report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Customer balance</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Customer report</h1>
            <p className="mt-2 text-sm text-foreground/55">Posted customer activity, paid totals, and outstanding balances.</p>
          </div>
          <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
        </header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading customer report..." /> : customers.length === 0 ? <div className="mt-8"><EmptyState title="No customer balances" description="No customer activity found for the current data set." /></div> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{customers.map((customer) => <ShantelCard key={customer.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Customer</p><h2 className="mt-2 text-xl font-semibold">{customer.name}</h2><div className="mt-4 space-y-2 text-sm"><p>Total invoiced: <span className="font-semibold">{money.format(customer.totalInvoiced)}</span></p><p>Total paid: <span className="font-semibold">{money.format(customer.totalPaid)}</span></p><p>Total returned: <span className="font-semibold">{money.format(customer.totalReturned)}</span></p><p>Outstanding: <span className="font-semibold">{money.format(customer.totalBalance)}</span></p></div></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
