"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Payment = { id: string; paymentNumber?: string; amount?: number | string; customer?: { id?: string; name?: string } };
type Method = { id: string; name: string };
type Refund = { id: string; paymentNumber?: string; amount?: number | string; customer?: { name?: string }; status?: string };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function RefundsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("1");
  const [methodId, setMethodId] = useState("");
  const [reason, setReason] = useState("Round 2 refund test");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true); setError("");
      const [paymentsResponse, methodsResponse, refundsResponse] = await Promise.all([
        apiClient.get("/payments?page=1&limit=50"),
        apiClient.get("/payments/methods"),
        apiClient.get("/payments/refunds/all?page=1&limit=50"),
      ]);
      setPayments(unwrap(paymentsResponse).filter((payment: Payment) => Number(payment.amount) > 0));
      setMethods(unwrap(methodsResponse));
      setRefunds(unwrap(refundsResponse));
    } catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Refund data could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  async function createRefund() {
    const payment = payments.find((item) => item.id === paymentId);
    if (!payment?.customer?.id || !methodId || Number(amount) <= 0 || Number(amount) > Number(payment.amount)) { setError("Choose a payment and valid refund amount."); return; }
    try {
      const created = unwrap(await apiClient.post("/payments/refunds", { customerId: payment.customer.id, paymentId, refundAmount: Number(amount), paymentMethodId: methodId, reason }));
      setMessage(`${created.paymentNumber ?? "Refund"} recorded successfully.`); setPaymentId(""); await loadData();
    } catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Refund creation failed."); }
  }

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Finance desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Refunds with a trace.</h1><p className="mt-2 text-sm text-[#17221f]/55">Return funds against a recorded customer payment.</p></div><button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]">{message}</div>}<section className="mt-8 bg-white p-6"><h2 className="text-xl font-semibold">New refund</h2><div className="mt-4 grid gap-3 sm:grid-cols-4"><select aria-label="Original payment" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select payment</option>{payments.map((payment) => <option key={payment.id} value={payment.id}>{payment.paymentNumber} · {payment.customer?.name} · TSh {Number(payment.amount).toLocaleString()}</option>)}</select><input aria-label="Refund amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="border border-[#17221f]/15 px-3 py-2.5 text-sm" /><select aria-label="Refund method" value={methodId} onChange={(event) => setMethodId(event.target.value)} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select><button type="button" onClick={() => void createRefund()} className="flex items-center justify-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><RotateCcw size={15} /> Record refund</button></div></section><section className="mt-8 space-y-3" aria-label="Refunds"><h2 className="text-xl font-semibold">Recent refunds</h2>{loading && <p className="bg-white p-5 text-sm text-[#17221f]/55">Loading refunds...</p>}{!loading && refunds.length === 0 && <p className="bg-white p-5 text-sm text-[#17221f]/55">No refunds found.</p>}{refunds.map((refund) => <article key={refund.id} className="flex items-center justify-between bg-white p-5"><div><p className="font-semibold">{refund.paymentNumber}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#17221f]/50">{refund.customer?.name} · {refund.status}</p></div><p className="font-semibold text-[#ad6742]">TSh {Math.abs(Number(refund.amount)).toLocaleString()}</p></article>)}</section></div></main></>;
}
