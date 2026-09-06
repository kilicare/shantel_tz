"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CreditCard, RefreshCw, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Customer = { id: string; name: string };
type PaymentMethod = { id: string; name: string };
type Payment = { id: string; paymentNumber?: string; amount?: number | string; status?: string; customer?: { name?: string } };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function PaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", amount: "", paymentMethodId: "", transactionReference: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPayments() {
    try {
      setLoading(true); setError("");
      const [customersResponse, methodsResponse, paymentsResponse] = await Promise.all([apiClient.get("/customers?page=1&limit=100"), apiClient.get("/payments/methods"), apiClient.get("/payments?page=1&limit=100")]);
      setCustomers(unwrap(customersResponse)); setMethods(unwrap(methodsResponse)); setPayments(unwrap(paymentsResponse));
    } catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Payments could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void loadPayments(); }, []);

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.customerId || !form.paymentMethodId || Number(form.amount) <= 0) { setError("Customer, payment method, and a positive amount are required."); return; }
    try { setSaving(true); setError(""); const response = await apiClient.post("/payments/customer", { ...form, amount: Number(form.amount) }); const payment = unwrap(response); setMessage(`${payment.paymentNumber ?? "Payment"} recorded successfully.`); setForm({ customerId: "", amount: "", paymentMethodId: "", transactionReference: "", notes: "" }); setShowForm(false); await loadPayments(); }
    catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Payment could not be recorded."); }
    finally { setSaving(false); }
  }

  const canRecord = permissions.includes("payments.record");
  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-5 py-7 text-[#17221f] sm:px-10 sm:py-10"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Finance desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Payments</h1><p className="mt-2 text-sm text-[#17221f]/55">Record customer payments with traceable method and reference details.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadPayments()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>{canRecord && <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><CreditCard size={15} /> Record payment</button>}</div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]">{message}</div>}{showForm && <form onSubmit={recordPayment} className="mt-8 bg-[#17221f] p-6 text-[#f4f1ec] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8a36b]">Customer receipt</p><h2 className="mt-2 text-2xl font-semibold">Record payment</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close payment form"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Customer<select aria-label="Payment customer" value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="mt-2 h-11 w-full bg-[#17221f] text-sm normal-case tracking-normal outline-none"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Amount<input aria-label="Payment amount" type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Payment method<select aria-label="Payment method" value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })} className="mt-2 h-11 w-full bg-[#17221f] text-sm normal-case tracking-normal outline-none"><option value="">Select method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Reference<input aria-label="Payment reference" value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label></div><button type="submit" disabled={saving} className="mt-6 bg-[#e8a36b] px-5 py-3 text-sm font-semibold text-[#17221f] disabled:opacity-50">{saving ? "Recording..." : "Record payment"}</button></form>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ad6742]">Ledger</p><h2 className="mt-2 text-2xl font-semibold">Recent payments</h2></div><span className="text-xs text-[#17221f]/45">{payments.length} records</span></div>{loading ? <p className="py-10 text-sm text-[#17221f]/50">Loading payments...</p> : <div className="mt-4 divide-y divide-[#17221f]/10">{payments.length ? payments.map((payment, index) => <div key={payment.id ?? index} className="flex items-center justify-between py-4"><div><p className="text-sm font-semibold">{payment.paymentNumber ?? "Unnumbered payment"}</p><p className="mt-1 text-xs text-[#17221f]/45">{payment.customer?.name ?? "Customer"}</p></div><div className="text-right"><p className="text-sm font-semibold">TSh {Number(payment.amount ?? 0).toLocaleString()}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#567b68]">{payment.status ?? "RECORDED"}</p></div></div>) : <p className="py-10 text-center text-sm text-[#17221f]/50">No payments found.</p>}</div>}</section></div></main></>;
}
