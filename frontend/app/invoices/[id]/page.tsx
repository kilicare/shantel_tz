"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Printer, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Invoice = { id: string; invoiceNumber: string; status: string; notes?: string; customer?: { name?: string }; items?: Array<{ product?: { name?: string }; quantity: number | string; unitPrice: number | string }> };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload; }

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadInvoice() {
    try {
      const loaded = unwrap(await apiClient.get(`/sales/invoices/${params.id}`));
      setInvoice(loaded); setNotes(loaded.notes ?? "");
    } catch (requestError: any) { setError(requestError?.response?.data?.message || "Invoice could not be loaded."); }
  }
  useEffect(() => { if (params.id) void loadInvoice(); }, [params.id]);

  async function saveDraft() {
    try { const updated = unwrap(await apiClient.patch(`/sales/invoices/${params.id}`, { notes })); setInvoice(updated); setMessage("Invoice draft updated successfully."); }
    catch (requestError: any) { setError(requestError?.response?.data?.message || "Invoice could not be updated."); }
  }

  async function printInvoice() {
    const response = await apiClient.get(`/documents/invoices/${params.id}/print-pdf`, { responseType: "blob" });
    window.open(URL.createObjectURL(response.data), "_blank");
  }

  if (!invoice) return <><WorkspaceNavigation /><main className="p-8">{error || "Loading invoice..."}</main></>;
  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-4xl"><button type="button" onClick={() => router.push("/invoices")} className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><ArrowLeft size={15} /> Invoices</button><header className="flex items-end justify-between border-b border-[#17221f]/12 pb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ad6742]">Invoice detail</p><h1 className="mt-2 text-4xl font-semibold">{invoice.invoiceNumber}</h1><p className="mt-2 text-sm text-[#17221f]/55">{invoice.customer?.name} · {invoice.status}</p></div><button type="button" onClick={() => void printInvoice()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Printer size={15} /> Print</button></header>{error && <div role="alert" className="mt-6 border border-[#ad6742]/30 bg-[#ad6742]/8 p-4 text-sm text-[#8a4931]">{error}</div>}{message && <div role="status" className="mt-6 flex items-center gap-2 border border-[#567b68]/30 bg-[#567b68]/10 p-4 text-sm text-[#365b4a]"><Check size={17} /> {message}</div>}<section className="mt-8 bg-white p-6"><h2 className="text-xl font-semibold">Items</h2><div className="mt-4 divide-y divide-[#17221f]/10">{invoice.items?.map((item, index) => <div key={`${item.product?.name}-${index}`} className="flex justify-between py-3 text-sm"><span>{item.product?.name} x {item.quantity}</span><span>TSh {Number(item.unitPrice).toLocaleString()}</span></div>)}</div></section><section className="mt-6 bg-white p-6"><label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#17221f]/55">Notes{invoice.status !== "DRAFT" && " · locked after posting"}</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={invoice.status !== "DRAFT"} className="mt-3 min-h-28 w-full border border-[#17221f]/15 p-3 text-sm disabled:bg-[#f4f1ec]" /><button type="button" onClick={() => void saveDraft()} disabled={invoice.status !== "DRAFT"} className="mt-4 flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-40"><Save size={15} /> Save changes</button></section></div></main></>;
}
