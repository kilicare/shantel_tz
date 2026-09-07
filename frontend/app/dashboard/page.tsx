"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpRight, Boxes, CalendarDays, CircleDollarSign, FileCheck2, LogOut, Package, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { KpiCard } from "@/components/ShantelPrimitives";

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
  const router = useRouter();
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

  useEffect(() => {
    if (!localStorage.getItem("shantel_access_token")) {
      router.replace("/login");
      return;
    }

    void loadDashboard();
  }, [router]);

  if (isLoading) {
    return <main className="min-h-screen bg-[#F6F8FB] p-6 text-[#172B4D] sm:p-10"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-4 w-24 bg-[#172B4D]/10" /><div className="mt-5 h-12 w-72 bg-[#172B4D]/10" /><div className="mt-10 grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 bg-white/70" />)}</div></div></main>;
  }

  if (error || !data) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-6"><div className="max-w-md border border-[#2563EB]/25 bg-white p-7 text-[#172B4D]"><AlertCircle className="mb-4 text-[#2563EB]" /><h1 className="text-xl font-semibold">Dashboard unavailable</h1><p className="mt-2 text-sm text-[#172B4D]/60">{error || "No dashboard data returned."}</p><button onClick={() => void loadDashboard()} className="mt-6 flex items-center gap-2 bg-[#172B4D] px-4 py-3 text-sm font-semibold text-white"><RefreshCw size={16} /> Try again</button></div></main>;
  }

  const maxSales = Math.max(...trend.map((item) => item.sales), 1);
  const pulseWeeks = Array.from({ length: 5 }, (_, index) => {
    const week = trend.slice(index * 7, index * 7 + 7);
    const total = week.reduce((sum, item) => sum + item.sales, 0);
    return { label: week[0]?.date.slice(5) ?? "-", total, days: week.filter((item) => item.sales > 0).length };
  }).filter((week) => week.label !== "-");
  const pulseTotal = trend.reduce((sum, item) => sum + item.sales, 0);
  const activeDays = trend.filter((item) => item.sales > 0).length;
  const peakDay = trend.reduce((peak, item) => item.sales > peak.sales ? item : peak, trend[0] ?? { date: "-", sales: 0 });
  const recentHalf = trend.slice(Math.ceil(trend.length / 2)).reduce((sum, item) => sum + item.sales, 0);
  const earlierHalf = trend.slice(0, Math.ceil(trend.length / 2)).reduce((sum, item) => sum + item.sales, 0);
  const pulseChange = earlierHalf ? ((recentHalf - earlierHalf) / earlierHalf) * 100 : recentHalf ? 100 : 0;
  const cards = [
    { label: "Today's sales", value: currency.format(data.todaySales.totalAmount), note: `${data.todaySales.count} invoices`, icon: CircleDollarSign, accent: "#D4A72C" },
    { label: "Outstanding", value: currency.format(data.openInvoices.totalBalance), note: `${data.openInvoices.count} open invoices`, icon: TrendingUp, accent: "#8aa39a" },
    { label: "Pending approvals", value: data.pendingApprovals.toString(), note: "Needs your attention", icon: FileCheck2, accent: "#d77e5a" },
    { label: "Stock on hand", value: data.stock.totalQuantity.toLocaleString(), note: `${data.stock.totalItems} products tracked`, icon: Boxes, accent: "#D4A72C" },
  ];

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-col justify-between gap-6 border-b border-[#172B4D]/12 pb-8 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Operations overview</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Good morning, team.</h1><p className="mt-2 text-sm text-[#172B4D]/55">Here is what is moving across Shantel today.</p></div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto"><button onClick={() => void loadDashboard()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white"><RefreshCw size={15} /> Refresh data</button><button onClick={() => { localStorage.removeItem("shantel_access_token"); localStorage.removeItem("shantel_refresh_token"); localStorage.removeItem("shantel_user"); router.push("/login"); }} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white" aria-label="Log out"><LogOut size={15} /> Log out</button></div>
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon, accent }) => <KpiCard key={label} label={label} value={value} note={note} icon={Icon} accent={accent as "amber" | "teal" | "gold" | "terracotta"} />)}
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]">
          <article className="overflow-hidden rounded-2xl bg-[#172B4D] p-6 text-[#F6F8FB] shadow-[0_18px_50px_rgba(23,43,77,0.18)] sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4A72C]">Sales pulse</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">The rhythm of your revenue</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[#F6F8FB]/55">A simple view of when sales are happening, how strong the week is, and where the biggest day landed.</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4A72C]/30 bg-[#D4A72C]/10"><TrendingUp className="text-[#D4A72C]" size={20} /></div></div><div className="mt-7 grid grid-cols-3 gap-3 border-y border-[#F6F8FB]/10 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F6F8FB]/40">30-day sales</p><p className="mt-1 text-lg font-semibold">{currency.format(pulseTotal)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F6F8FB]/40">Active days</p><p className="mt-1 text-lg font-semibold">{activeDays}<span className="ml-1 text-xs font-normal text-[#F6F8FB]/40">/ 30</span></p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F6F8FB]/40">Best day</p><p className="mt-1 text-lg font-semibold">{currency.format(peakDay.sales)}</p></div></div><div className="relative mt-6 h-48" aria-label="Sales trend for the last 30 days" role="img"><div className="absolute inset-x-0 top-0 border-t border-[#F6F8FB]/10" /><div className="absolute inset-x-0 top-1/2 border-t border-[#F6F8FB]/10" /><div className="absolute inset-x-0 bottom-0 border-t border-[#F6F8FB]/15" /><svg viewBox="0 0 500 180" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible"><defs><linearGradient id="pulseFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#D4A72C" stopOpacity="0.32" /><stop offset="100%" stopColor="#D4A72C" stopOpacity="0" /></linearGradient></defs><path d={`M ${trend.map((item, index) => `${(index / Math.max(trend.length - 1, 1)) * 500},${174 - (item.sales / maxSales) * 150}`).join(" L ")} L 500,180 L 0,180 Z`} fill="url(#pulseFill)" /><path d={`M ${trend.map((item, index) => `${(index / Math.max(trend.length - 1, 1)) * 500},${174 - (item.sales / maxSales) * 150}`).join(" L ")}`} fill="none" stroke="#D4A72C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />{trend.map((item, index) => item.sales > 0 ? <circle key={item.date} cx={(index / Math.max(trend.length - 1, 1)) * 500} cy={174 - (item.sales / maxSales) * 150} r="5" fill="#172B4D" stroke="#D4A72C" strokeWidth="3"><title>{`${item.date}: ${currency.format(item.sales)}`}</title></circle> : null)}</svg></div><div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.12em] text-[#F6F8FB]/35"><span>{trend[0]?.date}</span><span>{trend.at(-1)?.date}</span></div><div className="mt-6 grid grid-cols-5 gap-2">{pulseWeeks.map((week) => <div key={week.label} className="min-w-0"><div className="h-1.5 bg-[#F6F8FB]/10"><div className="h-full bg-[#D4A72C]" style={{ width: `${Math.max((week.total / maxSales / 7) * 100, week.total ? 8 : 0)}%` }} /></div><p className="mt-2 truncate text-[10px] text-[#F6F8FB]/45">Week {week.label}</p><p className="mt-1 truncate text-xs font-semibold">{currency.format(week.total)}</p></div>)}</div></article>
          <article className="rounded-2xl bg-[#f0e6d8] p-6 text-[#172B4D] shadow-[0_12px_35px_rgba(23,43,77,0.12)] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Signal</p><h2 className="mt-2 text-xl font-semibold">What the pulse says</h2></div><Sparkles className="text-[#2563EB]" size={20} /></div><div className="mt-8 space-y-5"><div className="flex gap-3"><CalendarDays className="mt-0.5 shrink-0 text-[#2563EB]" size={18} /><div><p className="text-sm font-semibold">{activeDays ? `Sales moved on ${activeDays} ${activeDays === 1 ? "day" : "days"}` : "No sales recorded yet"}</p><p className="mt-1 text-xs leading-5 text-[#172B4D]/55">Consistency is easier to improve when the team can see it.</p></div></div><div className="flex gap-3"><TrendingUp className="mt-0.5 shrink-0 text-[#2563EB]" size={18} /><div><p className="text-sm font-semibold">Peak: {peakDay.date}</p><p className="mt-1 text-xs leading-5 text-[#172B4D]/55">That day contributed {currency.format(peakDay.sales)} to the period.</p></div></div><div className="border-t border-[#172B4D]/10 pt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#172B4D]/45">Momentum</p><p className="mt-2 text-2xl font-semibold">{pulseChange > 0 ? "+" : ""}{pulseChange.toFixed(0)}%</p><p className="mt-1 text-xs leading-5 text-[#172B4D]/55">Second half compared with the first half of this period.</p></div></div></article>
          <article className="rounded-2xl bg-white p-6 shadow-[0_12px_35px_rgba(23,43,77,0.09)] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Attention</p><h2 className="mt-2 text-xl font-semibold">Low stock</h2></div><Package size={20} className="text-[#2563EB]" /></div><div className="mt-6 space-y-4">{data.lowStockItems.length ? data.lowStockItems.slice(0, 4).map((item) => <div key={`${item.sku}-${item.location}`} className="flex items-center justify-between border-b border-[#172B4D]/10 pb-3"><div><p className="text-sm font-semibold">{item.product}</p><p className="mt-1 text-xs text-[#172B4D]/45">{item.sku} · {item.location}</p></div><span className="text-sm font-semibold text-[#2563EB]">{item.quantity} left</span></div>) : <p className="text-sm text-[#172B4D]/50">Stock levels are healthy.</p>}</div></article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2"><article className="rounded-2xl bg-white p-6 shadow-[0_12px_35px_rgba(23,43,77,0.09)]"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Sales activity</p><h2 className="mt-2 text-lg font-semibold">Recent invoices</h2></div><ArrowUpRight size={18} className="text-[#172B4D]/35" /></div><div className="mt-5 divide-y divide-[#172B4D]/10">{data.recentTransactions.invoices.map((invoice) => <div key={invoice.number} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{invoice.number}</p><p className="mt-1 text-xs text-[#172B4D]/45">{invoice.customer}</p></div><p className="text-sm font-semibold">{currency.format(invoice.amount)}</p></div>)}</div></article><article className="rounded-2xl bg-white p-6 shadow-[0_12px_35px_rgba(23,43,77,0.09)]"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Procurement activity</p><h2 className="mt-2 text-lg font-semibold">Recent purchase orders</h2></div><ArrowUpRight size={18} className="text-[#172B4D]/35" /></div><div className="mt-5 divide-y divide-[#172B4D]/10">{data.recentTransactions.purchaseOrders.map((order) => <div key={order.number} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{order.number}</p><p className="mt-1 text-xs text-[#172B4D]/45">{order.supplier}</p></div><p className="text-sm font-semibold">{currency.format(order.amount)}</p></div>)}</div></article></section>
      </div>
      </main>
    </>
  );
}