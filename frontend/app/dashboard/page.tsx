"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, Boxes, CircleDollarSign, FileCheck2, Package, RefreshCw, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type DashboardData = {
  todaySales: { count: number; totalAmount: number; totalPaid: number };
  openInvoices: { count: number; totalBalance: number };
  pendingApprovals: number;
  lowStockItems: Array<{ product: string; sku: string; quantity: number; minimumStockLevel: number; location: string }>;
  stock: { totalItems: number; totalQuantity: number };
  recentTransactions: { invoices: Array<{ number: string; customer: string; amount: number; date: string }>; purchaseOrders: Array<{ number: string; supplier: string; amount: number; date: string }> };
};

const currency = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<Array<{ date: string; sales: number }>>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setError("");
      const [metricsResponse, trendResponse] = await Promise.all([
        apiClient.get("/reports/dashboard/metrics"),
        apiClient.get("/reports/dashboard/sales-trend"),
      ]);
      setData(metricsResponse.data.data ?? metricsResponse.data);
      setTrend(trendResponse.data.data ?? trendResponse.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Dashboard data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  if (isLoading) {
    return <main className="min-h-screen bg-[#f4f1ec] p-6 text-[#17221f] sm:p-10"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-4 w-24 bg-[#17221f]/10" /><div className="mt-5 h-12 w-72 bg-[#17221f]/10" /><div className="mt-10 grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 bg-white/70" />)}</div></div></main>;
  }

  if (error || !data) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f4f1ec] p-6"><div className="max-w-md border border-[#ad6742]/25 bg-white p-7 text-[#17221f]"><AlertCircle className="mb-4 text-[#ad6742]" /><h1 className="text-xl font-semibold">Dashboard unavailable</h1><p className="mt-2 text-sm text-[#17221f]/60">{error || "No dashboard data returned."}</p><button onClick={() => void loadDashboard()} className="mt-6 flex items-center gap-2 bg-[#17221f] px-4 py-3 text-sm font-semibold text-white"><RefreshCw size={16} /> Try again</button></div></main>;
  }

  const maxSales = Math.max(...trend.map((item) => item.sales), 1);
  const cards = [
    { label: "Today's sales", value: currency.format(data.todaySales.totalAmount), note: `${data.todaySales.count} invoices`, icon: CircleDollarSign, accent: "#e8a36b" },
    { label: "Outstanding", value: currency.format(data.openInvoices.totalBalance), note: `${data.openInvoices.count} open invoices`, icon: TrendingUp, accent: "#8aa39a" },
    { label: "Pending approvals", value: data.pendingApprovals.toString(), note: "Needs your attention", icon: FileCheck2, accent: "#d77e5a" },
    { label: "Stock on hand", value: data.stock.totalQuantity.toLocaleString(), note: `${data.stock.totalItems} products tracked`, icon: Boxes, accent: "#c5a65c" },
  ];

  return (
    <main className="min-h-screen bg-[#f4f1ec] px-5 py-7 text-[#17221f] sm:px-10 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 border-b border-[#17221f]/12 pb-8 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Operations overview</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Good morning, team.</h1><p className="mt-2 text-sm text-[#17221f]/55">Here is what is moving across Shantel today.</p></div>
          <button onClick={() => void loadDashboard()} className="flex items-center gap-2 self-start border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white sm:self-auto"><RefreshCw size={15} /> Refresh data</button>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon, accent }) => <article key={label} className="relative overflow-hidden bg-white p-5"><div className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: accent }} /><div className="flex items-start justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17221f]/48">{label}</p><Icon size={19} className="text-[#17221f]/35" /></div><p className="mt-8 text-2xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-2 text-xs text-[#17221f]/48">{note}</p></article>)}
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <article className="bg-[#17221f] p-6 text-[#f4f1ec] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e8a36b]">Sales pulse</p><h2 className="mt-2 text-xl font-semibold">Last 30 days</h2></div><TrendingUp className="text-[#e8a36b]" size={20} /></div><div className="mt-8 flex h-44 items-end gap-1.5 sm:gap-2">{trend.map((item) => <div key={item.date} className="group relative flex h-full flex-1 items-end"><div className="w-full bg-[#e8a36b]/75 transition-colors group-hover:bg-[#e8a36b]" style={{ height: `${Math.max((item.sales / maxSales) * 100, item.sales ? 4 : 1)}%` }} title={`${item.date}: ${currency.format(item.sales)}`} /></div>)}</div><div className="mt-4 flex justify-between text-[10px] uppercase tracking-[0.12em] text-[#f4f1ec]/35"><span>{trend[0]?.date}</span><span>{trend.at(-1)?.date}</span></div></article>
          <article className="bg-white p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ad6742]">Attention</p><h2 className="mt-2 text-xl font-semibold">Low stock</h2></div><Package size={20} className="text-[#ad6742]" /></div><div className="mt-6 space-y-4">{data.lowStockItems.length ? data.lowStockItems.slice(0, 4).map((item) => <div key={`${item.sku}-${item.location}`} className="flex items-center justify-between border-b border-[#17221f]/10 pb-3"><div><p className="text-sm font-semibold">{item.product}</p><p className="mt-1 text-xs text-[#17221f]/45">{item.sku} · {item.location}</p></div><span className="text-sm font-semibold text-[#ad6742]">{item.quantity} left</span></div>) : <p className="text-sm text-[#17221f]/50">Stock levels are healthy.</p>}</div></article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2"><article className="bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Recent invoices</h2><ArrowUpRight size={18} className="text-[#17221f]/35" /></div><div className="mt-5 divide-y divide-[#17221f]/10">{data.recentTransactions.invoices.map((invoice) => <div key={invoice.number} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{invoice.number}</p><p className="mt-1 text-xs text-[#17221f]/45">{invoice.customer}</p></div><p className="text-sm font-semibold">{currency.format(invoice.amount)}</p></div>)}</div></article><article className="bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Recent purchase orders</h2><ArrowUpRight size={18} className="text-[#17221f]/35" /></div><div className="mt-5 divide-y divide-[#17221f]/10">{data.recentTransactions.purchaseOrders.map((order) => <div key={order.number} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{order.number}</p><p className="mt-1 text-xs text-[#17221f]/45">{order.supplier}</p></div><p className="text-sm font-semibold">{currency.format(order.amount)}</p></div>)}</div></article></section>
      </div>
    </main>
  );
}