"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Invoice = { invoiceNumber: string; customer: string; invoiceDate: string; totalAmount: number; amountPaid: number; balance: number; itemCount: number };
type Report = { summary: { invoiceCount: number; totalRevenue: number; totalPaid: number; totalOutstanding: number; averageInvoiceValue: number }; invoices: Invoice[] };
const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function dateValue(date: Date) { return date.toISOString().slice(0, 10); }
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function SalesReportsPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(dateValue(new Date(today.getTime() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(dateValue(today));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(event?: FormEvent) {
    event?.preventDefault();
    try {
      setLoading(true); setError("");
      const response = await apiClient.get(`/reports/sales/by-date?startDate=${encodeURIComponent(`${startDate}T00:00:00.000Z`)}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`);
      setReport(unwrap(response));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Sales report could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function exportReport(format: "csv" | "excel" | "pdf") {
    const response = await apiClient.get(`/reports/export/sales-${format}?startDate=${encodeURIComponent(`${startDate}T00:00:00.000Z`)}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `sales-report.${format === "excel" ? "xlsx" : format}`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto w-full max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Sales intelligence</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Sales report</h1><p className="mt-2 text-sm text-[#172B4D]/55">Posted sales, paid totals, balances, and invoice detail by date range.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>{error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}<form onSubmit={load} className="mt-8 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold uppercase tracking-[0.12em]">From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 block h-11 border border-[#172B4D]/15 bg-white px-3 text-sm normal-case tracking-normal" /></label><label className="text-xs font-semibold uppercase tracking-[0.12em]">To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 block h-11 border border-[#172B4D]/15 bg-white px-3 text-sm normal-case tracking-normal" /></label><button type="submit" className="h-11 bg-[#172B4D] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">Apply dates</button>{(["csv", "excel", "pdf"] as const).map((format) => <button key={format} type="button" onClick={() => void exportReport(format)} className="flex h-11 items-center gap-2 border border-[#172B4D]/15 px-3 text-xs font-semibold uppercase tracking-[0.1em]"><Download size={14} />{format}</button>)}</form>{loading ? <LoadingState message="Loading sales report..." /> : !report || report.invoices.length === 0 ? <div className="mt-8"><EmptyState title="No posted sales in this period" description="Try a wider date range." /></div> : <><section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ShantelCard className="p-5"><p className="text-xs text-[#172B4D]/55">Invoices</p><p className="mt-2 text-2xl font-semibold">{report.summary.invoiceCount}</p></ShantelCard><ShantelCard className="p-5"><p className="text-xs text-[#172B4D]/55">Revenue</p><p className="mt-2 text-2xl font-semibold">{money.format(report.summary.totalRevenue)}</p></ShantelCard><ShantelCard className="p-5"><p className="text-xs text-[#172B4D]/55">Paid</p><p className="mt-2 text-2xl font-semibold">{money.format(report.summary.totalPaid)}</p></ShantelCard><ShantelCard className="p-5"><p className="text-xs text-[#172B4D]/55">Outstanding</p><p className="mt-2 text-2xl font-semibold">{money.format(report.summary.totalOutstanding)}</p></ShantelCard></section><section className="mt-8 bg-white p-6"><h2 className="text-2xl font-semibold">Posted invoice detail</h2><div className="mt-5 divide-y divide-[#172B4D]/10">{report.invoices.map((invoice) => <div key={invoice.invoiceNumber} className="grid gap-2 py-4 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-center"><div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="text-xs text-[#172B4D]/55">{invoice.customer} · {invoice.itemCount} items</p></div><p className="text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</p><p className="text-sm">{money.format(invoice.totalAmount)}</p><p className="text-sm">Balance {money.format(invoice.balance)}</p></div>)}</div></section></>}</div></main></>;
}
