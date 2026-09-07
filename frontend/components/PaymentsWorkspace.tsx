"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CreditCard, RefreshCw } from "lucide-react";
import { PaymentMethodWorkspace } from "@/components/PaymentMethodWorkspace";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/ShantelPrimitives";

type Customer = { id: string; name: string };
type Method = { id: string; name: string; code: string; description?: string };
type Payment = { id: string; paymentNumber?: string; amount?: number | string; status?: string; customer?: { name?: string } };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export function PaymentsWorkspace() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ customerId: "", amount: "", paymentMethodId: "", transactionReference: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try { setLoading(true); setError(""); const [customerResponse, methodResponse, paymentResponse] = await Promise.all([apiClient.get("/customers?page=1&limit=100"), apiClient.get("/payments/methods"), apiClient.get("/payments?page=1&limit=100")]); setCustomers(unwrap(customerResponse)); setMethods(unwrap(methodResponse)); setPayments(unwrap(paymentResponse)); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Payments could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void load(); }, []);

  async function record(event: FormEvent) {
    event.preventDefault();
    if (!form.customerId || !form.paymentMethodId || Number(form.amount) <= 0) { setError("Customer, payment method, and a positive amount are required."); return; }
    try { setError(""); const response = await apiClient.post("/payments/customer", { ...form, amount: Number(form.amount) }); const payment = unwrap(response); setMessage(`${payment.paymentNumber} recorded successfully.`); setForm({ customerId: "", amount: "", paymentMethodId: "", transactionReference: "" }); setShowForm(false); await load(); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Payment could not be recorded."); }
  }

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto w-full min-w-0 max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Finance desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Payments</h1><p className="mt-2 text-sm text-[#172B4D]/55">Record customer payments with traceable method and reference details.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>{permissions.includes("payments.record") && <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><CreditCard size={15} /> {showForm ? "Close" : "Record payment"}</button>}</div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">{message}</div>}{showForm && <form onSubmit={record} className="mt-8 grid gap-4 bg-[#172B4D] p-6 text-[#F6F8FB] sm:grid-cols-2"><h2 className="text-xl font-semibold sm:col-span-2">Record payment</h2><select required aria-label="Payment customer" value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><input required aria-label="Payment amount" type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]" /><select required aria-label="Payment method" value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"><option value="">Select payment method</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select><input aria-label="Payment reference" placeholder="Reference" value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]" /><button type="submit" className="bg-[#D4A72C] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#172B4D] sm:col-span-2">Record payment</button></form>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between"><h2 className="text-2xl font-semibold">Recent payments</h2><span className="text-xs text-[#172B4D]/45">{payments.length} records</span></div>{loading ? <p className="py-10 text-sm text-[#172B4D]/50">Loading payments...</p> : <div className="mt-4 divide-y divide-[#172B4D]/10">{payments.map((payment) => <div key={payment.id} className="flex items-center justify-between py-4"><div><p className="text-sm font-semibold">{payment.paymentNumber}</p><p className="text-xs text-[#172B4D]/45">{payment.customer?.name ?? "Customer"}</p></div><div className="text-right"><p className="text-sm font-semibold">TSh {payment.amount}</p><StatusBadge status={payment.status ?? "PENDING"} className="mt-1" /></div></div>)}</div>}</section><PaymentMethodWorkspace methods={methods} onChanged={load} /></div></main></>;
}
