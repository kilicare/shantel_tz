"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CreditCard, RefreshCw, DollarSign, FileText, Check, Clock, AlertTriangle, Printer, Eye, Plus, Search, Wallet, Banknote, Smartphone, Landmark } from "lucide-react";
import { PaymentMethodWorkspace } from "@/components/PaymentMethodWorkspace";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/ShantelPrimitives";

type Customer = { id: string; name: string };
type Method = { id: string; name: string; code: string; description?: string };
type Invoice = { id: string; invoiceNumber: string; customerId: string; totalAmount: number | string; balance: number | string; status: string };
type Payment = { id: string; paymentNumber?: string; amount?: number | string; status?: string; customer?: { id?: string; name?: string }; paymentMethod?: { name?: string; code?: string }; transactionReference?: string; paymentDate?: string; notes?: string };
type Receipt = { id: string; receiptNumber: string; amount: number | string; paymentId: string; customerId: string; invoiceId?: string; receiptDate: string; notes?: string };
type Refund = { id: string; paymentNumber?: string; amount?: number | string; status?: string; customer?: { name?: string }; paymentMethod?: { name?: string }; notes?: string; transactionReference?: string };

function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export function PaymentsWorkspace() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const [form, setForm] = useState({ 
    customerId: "", 
    invoiceId: "", 
    amount: "", 
    paymentMethodId: "",
    transactionReference: "",
    notes: "",
    paymentType: "with_invoice" as "with_invoice" | "without_invoice"
  });
  
  const [showForm, setShowForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundForm, setRefundForm] = useState({ paymentId: "", refundAmount: "", paymentMethodId: "", reason: "", notes: "" });
  const [receiptForm, setReceiptForm] = useState({ paymentId: "", amount: "", notes: "" });
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");

  async function load() { 
    try { 
      setLoading(true); 
      setError(""); 
      const [customerResponse, methodResponse, invoiceResponse, paymentResponse, receiptResponse, refundResponse] = await Promise.all([
        apiClient.get("/customers?page=1&limit=100"), 
        apiClient.get("/payments/methods"), 
        apiClient.get("/sales/invoices?page=1&limit=100"), 
        apiClient.get("/payments?page=1&limit=100"),
        apiClient.get("/payments/receipts/all?page=1&limit=100"),
        apiClient.get("/payments/refunds/all?page=1&limit=100")
      ]); 
      setCustomers(unwrap(customerResponse)); 
      setMethods(unwrap(methodResponse)); 
      setInvoices(unwrap(invoiceResponse)); 
      setPayments(unwrap(paymentResponse));
      setReceipts(unwrap(receiptResponse));
      setRefunds(unwrap(refundResponse));
    } catch (requestError: any) { 
      const value = requestError?.response?.data?.message; 
      setError(Array.isArray(value) ? value[0] : value || "Payments could not be loaded."); 
    } finally { 
      setLoading(false); 
    } 
  }

  useEffect(() => { 
    try { 
      setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); 
    } catch { 
      setPermissions([]); 
    } 
    void load(); 
  }, []);

  const customerInvoices = invoices.filter((invoice) => invoice.customerId === form.customerId && invoice.status !== "DRAFT" && Number(invoice.balance) > 0);
  const filteredPayments = payments.filter((payment) => 
    `${payment.paymentNumber} ${payment.customer?.name}`.toLowerCase().includes(search.toLowerCase())
  );
  const selectedInvoice = invoices.find((inv) => inv.id === form.invoiceId);
  const balance = selectedInvoice ? Number(selectedInvoice.balance) : 0;
  const paymentAmount = Number(form.amount) || 0;

  // Payment type validation
  const getPaymentTypeInfo = () => {
    if (!form.invoiceId) return { type: "Advance", valid: true };
    if (paymentAmount <= 0) return { type: "Invalid", valid: false, error: "Amount must be greater than 0" };
    if (paymentAmount > balance) return { type: "Overpayment", valid: true, warning: "Payment exceeds invoice balance" };
    if (paymentAmount === balance) return { type: "Full", valid: true };
    return { type: "Partial", valid: true };
  };

  const paymentTypeInfo = getPaymentTypeInfo();

  async function record(event: FormEvent) { 
    event.preventDefault(); 
    
    if (!form.customerId || !form.paymentMethodId || Number(form.amount) <= 0) { 
      setError("Select customer, payment method, and a positive amount."); 
      return; 
    } 
    
    if (form.paymentType === "with_invoice" && !form.invoiceId) {
      setError("Select an invoice for payment with invoice.");
      return;
    }

    if (!paymentTypeInfo.valid) {
      setError(paymentTypeInfo.error || "Invalid payment amount");
      return;
    }

    try { 
      const paymentData: any = {
        customerId: form.customerId,
        amount: Number(form.amount),
        paymentMethodId: form.paymentMethodId,
        transactionReference: form.transactionReference,
        notes: form.notes,
      };

      if (form.paymentType === "with_invoice" && form.invoiceId) {
        paymentData.invoiceId = form.invoiceId;
      }

      const payment = unwrap(await apiClient.post("/payments/customer", paymentData)); 
      setMessage(`${payment.paymentNumber} recorded successfully (${paymentTypeInfo.type} payment). Invoice balance refreshed.`); 
      setForm({ customerId: "", invoiceId: "", amount: "", paymentMethodId: "", transactionReference: "", notes: "", paymentType: "with_invoice" }); 
      setShowForm(false);
      await load(); 
    } catch (requestError: any) { 
      const value = requestError?.response?.data?.message; 
      setError(Array.isArray(value) ? value[0] : value || "Payment could not be recorded."); 
    } 
  }

  async function postPayment(paymentId: string) {
    try {
      await apiClient.patch(`/payments/${paymentId}/post`);
      setMessage("Payment posted successfully");
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Payment could not be posted");
    }
  }

  async function generateReceipt(event: FormEvent) {
    event.preventDefault();
    if (!receiptForm.paymentId || Number(receiptForm.amount) <= 0) {
      setError("Select payment and enter valid amount");
      return;
    }

    try {
      const payment = payments.find((p) => p.id === receiptForm.paymentId);
      if (!payment) {
        setError("Payment not found");
        return;
      }

      const receipt = unwrap(await apiClient.post("/payments/receipts", {
        paymentId: receiptForm.paymentId,
        customerId: payment.customer?.id || "",
        amount: Number(receiptForm.amount),
        notes: receiptForm.notes,
      }));
      setMessage(`Receipt ${receipt.receiptNumber} generated successfully`);
      setReceiptForm({ paymentId: "", amount: "", notes: "" });
      setShowReceiptForm(false);
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Receipt could not be generated");
    }
  }

  async function createRefund(event: FormEvent) {
    event.preventDefault();
    if (!refundForm.paymentId || Number(refundForm.refundAmount) <= 0 || !refundForm.paymentMethodId) {
      setError("Select payment, enter valid refund amount, and payment method");
      return;
    }

    try {
      const payment = payments.find((p) => p.id === refundForm.paymentId);
      if (!payment) {
        setError("Original payment not found");
        return;
      }

      const refund = unwrap(await apiClient.post("/payments/refunds", {
        customerId: payment.customer?.id || "",
        paymentId: refundForm.paymentId,
        refundAmount: Number(refundForm.refundAmount),
        paymentMethodId: refundForm.paymentMethodId,
        reason: refundForm.reason,
        notes: refundForm.notes,
      }));
      setMessage(`Refund ${refund.paymentNumber} created successfully`);
      setRefundForm({ paymentId: "", refundAmount: "", paymentMethodId: "", reason: "", notes: "" });
      setShowRefundForm(false);
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Refund could not be created");
    }
  }

  function getPaymentMethodIcon(code?: string) {
    if (!code) return <CreditCard size={16} />;
    const codeLower = code.toLowerCase();
    if (codeLower.includes("cash")) return <Wallet size={16} />;
    if (codeLower.includes("bank")) return <Landmark size={16} />;
    if (codeLower.includes("mobile") || codeLower.includes("mpesa") || codeLower.includes("tigo")) return <Smartphone size={16} />;
    return <CreditCard size={16} />;
  }

  function amountInWords(amount: number): string {
    // Simple implementation for amount in words
    return `${amount.toLocaleString()} TZS`;
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Finance desk</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Payments & Finance</h1>
              <p className="mt-2 text-sm text-[#172B4D]/55">Record payments, generate receipts, process refunds, and manage expenses.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]">
                <RefreshCw size={15} /> Refresh
              </button>
              {permissions.includes("payments.record") && (
                <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  <CreditCard size={15} /> {showForm ? "Close" : "Record payment"}
                </button>
              )}
            </div>
          </header>

          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]">
            <AlertCircle size={18} /> {error}
          </div>}
          {message && <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">
            <Check size={18} className="inline mr-2" /> {message}
          </div>}

          {/* Payment Recording Form */}
          {showForm && (
            <form onSubmit={record} className="mt-8 grid gap-4 bg-[#172B4D] p-6 text-[#F6F8FB] sm:grid-cols-2">
              <h2 className="text-xl font-semibold sm:col-span-2">Record Customer Payment</h2>
              
              <div className="sm:col-span-2">
                <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F6F8FB]/55">Payment Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="with_invoice"
                      checked={form.paymentType === "with_invoice"}
                      onChange={(e) => setForm({ ...form, paymentType: e.target.value as "with_invoice" | "without_invoice" })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">With Invoice</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="without_invoice"
                      checked={form.paymentType === "without_invoice"}
                      onChange={(e) => setForm({ ...form, paymentType: e.target.value as "with_invoice" | "without_invoice" })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Without Invoice (Advance)</span>
                  </label>
                </div>
              </div>

              <select required aria-label="Payment customer" value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value, invoiceId: "" })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]">
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>

              {form.paymentType === "with_invoice" && (
                <select required aria-label="Payment invoice" value={form.invoiceId} onChange={(event) => setForm({ ...form, invoiceId: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]">
                  <option value="">Select invoice</option>
                  {customerInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · balance TSh {Number(invoice.balance).toLocaleString()}</option>)}
                </select>
              )}

              <input required aria-label="Payment amount" type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-11 px-3 text-sm text-[#172B4D]" />
              
              <select required aria-label="Payment method" value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]">
                <option value="">Select payment method</option>
                {methods.map((method) => <option key={method.id} value={method.id}>{method.name} ({method.code})</option>)}
              </select>

              <input aria-label="Transaction reference" type="text" placeholder="Transaction reference (optional)" value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} className="h-11 px-3 text-sm text-[#172B4D]" />
              
              <input aria-label="Notes" type="text" placeholder="Notes (optional)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="h-11 px-3 text-sm text-[#172B4D]" />

              {/* Payment Type Info */}
              {form.amount && (
                <div className={`sm:col-span-2 p-3 rounded-md text-sm ${paymentTypeInfo.valid ? (paymentTypeInfo.warning ? "bg-yellow-500/20 text-yellow-200" : "bg-green-500/20 text-green-200") : "bg-red-500/20 text-red-200"}`}>
                  <div className="flex items-center gap-2">
                    {paymentTypeInfo.valid ? <Check size={16} /> : <AlertTriangle size={16} />}
                    <span className="font-semibold">{paymentTypeInfo.type} Payment</span>
                  </div>
                  {paymentTypeInfo.warning && <p className="mt-1 text-xs">{paymentTypeInfo.warning}</p>}
                  {selectedInvoice && (
                    <p className="mt-1 text-xs">
                      Invoice Balance: TSh {balance.toLocaleString()} | Payment: TSh {paymentAmount.toLocaleString()}
                      {paymentAmount < balance && ` | Remaining: TSh ${(balance - paymentAmount).toLocaleString()}`}
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className="bg-[#D4A72C] px-4 py-3 text-sm font-semibold text-[#172B4D] sm:col-span-2">Record payment</button>
            </form>
          )}

          {/* Recent Payments */}
          <section className="mt-8 bg-white p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Recent payments</h2>
                <p className="text-xs text-[#172B4D]/50 mt-1">Customer payments with status tracking</p>
              </div>
              <div className="flex gap-2">
                {permissions.includes("payments.record") && (
                  <button type="button" onClick={() => setShowReceiptForm(!showReceiptForm)} className="flex items-center gap-2 border border-[#172B4D]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <FileText size={14} /> Generate Receipt
                  </button>
                )}
                {permissions.includes("payments.record") && (
                  <button type="button" onClick={() => setShowRefundForm(!showRefundForm)} className="flex items-center gap-2 border border-[#172B4D]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                    <DollarSign size={14} /> Process Refund
                  </button>
                )}
              </div>
            </div>

            <div className="relative mt-6">
              <Search size={17} className="absolute left-0 top-3 text-[#172B4D]/35" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payment or customer" className="h-11 w-full border-b border-[#172B4D]/15 bg-transparent pl-7 text-sm outline-none focus:border-[#2563EB]" />
            </div>

            {loading ? (
              <p className="py-8 text-sm text-[#172B4D]/50">Loading payments...</p>
            ) : (
              <div className="mt-4 divide-y divide-[#172B4D]/10">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      {payment.paymentMethod && getPaymentMethodIcon(payment.paymentMethod.code)}
                      <div>
                        <p className="text-sm font-semibold">{payment.paymentNumber}</p>
                        <p className="text-xs text-[#172B4D]/50">{payment.customer?.name} · {payment.paymentMethod?.name}</p>
                        {payment.transactionReference && <p className="text-xs text-[#172B4D]/35">Ref: {payment.transactionReference}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">TSh {Number(payment.amount || 0).toLocaleString()}</p>
                      <StatusBadge status={payment.status ?? "RECORDED"} />
                      <div className="mt-2 flex gap-2 justify-end">
                        {payment.status === "RECORDED" && permissions.includes("payments.record") && (
                          <button type="button" onClick={() => postPayment(payment.id)} className="text-xs text-[#2563EB] hover:underline">Post</button>
                        )}
                        <button type="button" onClick={() => { setSelectedPayment(payment); setReceiptForm({ ...receiptForm, paymentId: payment.id, amount: String(payment.amount) }); setShowReceiptForm(true); }} className="text-xs text-[#2563EB] hover:underline">Receipt</button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPayments.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[#172B4D]/50">No payments found.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Receipt Generation Form */}
          {showReceiptForm && (
            <form onSubmit={generateReceipt} className="mt-8 grid gap-4 bg-white p-6 sm:grid-cols-2">
              <h2 className="text-xl font-semibold sm:col-span-2">Generate Receipt</h2>
              <select required aria-label="Payment for receipt" value={receiptForm.paymentId} onChange={(event) => setReceiptForm({ ...receiptForm, paymentId: event.target.value })} className="h-11 border border-[#172B4D]/15 px-2 text-sm text-[#172B4D]">
                <option value="">Select payment</option>
                {payments.filter((p) => p.status === "POSTED").map((payment) => (
                  <option key={payment.id} value={payment.id}>{payment.paymentNumber} · TSh {Number(payment.amount || 0).toLocaleString()}</option>
                ))}
              </select>
              <input required aria-label="Receipt amount" type="number" min="0.01" step="0.01" placeholder="Amount" value={receiptForm.amount} onChange={(event) => setReceiptForm({ ...receiptForm, amount: event.target.value })} className="h-11 border border-[#172B4D]/15 px-3 text-sm text-[#172B4D]" />
              <input aria-label="Receipt notes" type="text" placeholder="Notes (optional)" value={receiptForm.notes} onChange={(event) => setReceiptForm({ ...receiptForm, notes: event.target.value })} className="h-11 border border-[#172B4D]/15 px-3 text-sm text-[#172B4D] sm:col-span-2" />
              <button type="submit" className="bg-[#172B4D] px-4 py-3 text-sm font-semibold text-white sm:col-span-2">Generate Receipt</button>
            </form>
          )}

          {/* Refund Form */}
          {showRefundForm && (
            <form onSubmit={createRefund} className="mt-8 grid gap-4 bg-white p-6 sm:grid-cols-2">
              <h2 className="text-xl font-semibold sm:col-span-2">Process Refund</h2>
              <select required aria-label="Original payment" value={refundForm.paymentId} onChange={(event) => setRefundForm({ ...refundForm, paymentId: event.target.value })} className="h-11 border border-[#172B4D]/15 px-2 text-sm text-[#172B4D]">
                <option value="">Select original payment</option>
                {payments.filter((p) => p.status === "POSTED").map((payment) => (
                  <option key={payment.id} value={payment.id}>{payment.paymentNumber} · TSh {Number(payment.amount || 0).toLocaleString()}</option>
                ))}
              </select>
              <input required aria-label="Refund amount" type="number" min="0.01" step="0.01" placeholder="Refund amount" value={refundForm.refundAmount} onChange={(event) => setRefundForm({ ...refundForm, refundAmount: event.target.value })} className="h-11 border border-[#172B4D]/15 px-3 text-sm text-[#172B4D]" />
              <select required aria-label="Refund payment method" value={refundForm.paymentMethodId} onChange={(event) => setRefundForm({ ...refundForm, paymentMethodId: event.target.value })} className="h-11 border border-[#172B4D]/15 px-2 text-sm text-[#172B4D]">
                <option value="">Select refund method</option>
                {methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
              <input aria-label="Refund reason" type="text" placeholder="Reason for refund" value={refundForm.reason} onChange={(event) => setRefundForm({ ...refundForm, reason: event.target.value })} className="h-11 border border-[#172B4D]/15 px-3 text-sm text-[#172B4D]" />
              <input aria-label="Refund notes" type="text" placeholder="Additional notes (optional)" value={refundForm.notes} onChange={(event) => setRefundForm({ ...refundForm, notes: event.target.value })} className="h-11 border border-[#172B4D]/15 px-3 text-sm text-[#172B4D] sm:col-span-2" />
              <button type="submit" className="bg-[#172B4D] px-4 py-3 text-sm font-semibold text-white sm:col-span-2">Process Refund</button>
            </form>
          )}

          {/* Recent Receipts */}
          {receipts.length > 0 && (
            <section className="mt-8 bg-white p-5">
              <h2 className="text-xl font-semibold">Recent receipts</h2>
              <div className="mt-4 divide-y divide-[#172B4D]/10">
                {receipts.slice(0, 5).map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-semibold">{receipt.receiptNumber}</p>
                      <p className="text-xs text-[#172B4D]/50">{new Date(receipt.receiptDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">TSh {Number(receipt.amount).toLocaleString()}</p>
                      <button type="button" onClick={() => setViewReceipt(receipt)} className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 mt-1">
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Refunds */}
          {refunds.length > 0 && (
            <section className="mt-8 bg-white p-5">
              <h2 className="text-xl font-semibold">Recent refunds</h2>
              <div className="mt-4 divide-y divide-[#172B4D]/10">
                {refunds.slice(0, 5).map((refund) => (
                  <div key={refund.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-semibold">{refund.paymentNumber}</p>
                      <p className="text-xs text-[#172B4D]/50">{refund.customer?.name} · {refund.paymentMethod?.name}</p>
                      {refund.transactionReference && <p className="text-xs text-[#172B4D]/35">Ref: {refund.transactionReference}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">TSh {Number(refund.amount || 0).toLocaleString()}</p>
                      <StatusBadge status={refund.status ?? "RECORDED"} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Receipt View Modal */}
          {viewReceipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/55 px-4" role="dialog" aria-modal="true">
              <div className="w-full max-w-md bg-white p-6 text-[#172B4D] shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Receipt</p>
                    <h2 className="mt-2 text-xl font-semibold">{viewReceipt.receiptNumber}</h2>
                  </div>
                  <button type="button" onClick={() => setViewReceipt(null)} className="rounded-lg p-2 text-[#172B4D]/50 hover:bg-[#F6F8FB]">
                    ×
                  </button>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#172B4D]/70">Date:</span>
                    <span className="text-sm font-semibold">{new Date(viewReceipt.receiptDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#172B4D]/70">Amount:</span>
                    <span className="text-sm font-semibold">TSh {Number(viewReceipt.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#172B4D]/70">In words:</span>
                    <span className="text-sm font-semibold">{amountInWords(Number(viewReceipt.amount))}</span>
                  </div>
                  {viewReceipt.notes && (
                    <div className="border-t border-[#172B4D]/10 pt-3">
                      <span className="text-sm text-[#172B4D]/70">Notes:</span>
                      <p className="text-sm mt-1">{viewReceipt.notes}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={() => setViewReceipt(null)} className="flex-1 bg-[#172B4D] px-4 py-3 text-sm font-semibold text-white">Close</button>
                  <button type="button" className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-3 text-sm font-semibold">
                    <Printer size={16} /> Print PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          <PaymentMethodWorkspace methods={methods} onChanged={() => load()} />
        </div>
      </main>
    </>
  );
}