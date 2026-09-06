"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, PackagePlus, RefreshCw, Send } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Invoice = { id: string; invoiceNumber?: string; customerId?: string; customer?: { name?: string } };
type InvoiceItem = { productId: string; product?: { name?: string } };
type SalesReturn = { id: string; returnNumber?: string; status?: string; invoice?: { invoiceNumber?: string } };
type Location = { id: string; name: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function ReturnsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [returnLocations, setReturnLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [invoiceResponse, returnResponse, locationResponse] = await Promise.all([
        apiClient.get("/sales/invoices?page=1&limit=50"),
        apiClient.get("/sales/returns?page=1&limit=50"),
        apiClient.get("/locations?page=1&limit=100"),
      ]);
      setInvoices(unwrap(invoiceResponse));
      setReturns(unwrap(returnResponse));
      setLocations(unwrap(locationResponse));
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Returns data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function selectInvoice(id: string) {
    setInvoiceId(id);
    setProductId("");
    setInvoiceItems([]);
    if (!id) return;
    try {
      const invoice = unwrap(await apiClient.get(`/sales/invoices/${id}`));
      setInvoiceItems(invoice.items ?? []);
    } catch {
      setError("Invoice items could not be loaded.");
    }
  }

  async function createReturn() {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice?.customerId || !productId || Number(quantity) <= 0) {
      setError("Choose a posted invoice, product, and valid quantity.");
      return;
    }
    try {
      const created = unwrap(await apiClient.post("/sales/returns", {
        customerId: invoice.customerId,
        invoiceId,
        items: [{ productId, quantity: Number(quantity), reason: "Round 2 UI return test" }],
        notes: "Round 2 UI return test",
      }));
      setMessage(`${created.returnNumber ?? "Sales return"} created successfully.`);
      setInvoiceId("");
      setProductId("");
      setInvoiceItems([]);
      await loadData();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Return creation failed.");
    }
  }

  async function approveReturn(item: SalesReturn) {
    try {
      const updated = unwrap(await apiClient.patch(`/sales/returns/${item.id}/approve`));
      setMessage(`${updated.returnNumber ?? item.returnNumber} is now SUBMITTED.`);
      await loadData();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Return approval failed.");
    }
  }

  async function postReturn(item: SalesReturn) {
    const locationId = returnLocations[item.id];
    if (!locationId) {
      setError("Select a posting location before posting the return.");
      return;
    }
    try {
      const updated = unwrap(await apiClient.patch(`/sales/returns/${item.id}/post`, { locationId }));
      setMessage(`${updated.returnNumber ?? item.returnNumber} is now POSTED.`);
      await loadData();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Return posting failed.");
    }
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-[#f4f1ec] px-5 py-7 text-[#17221f] sm:px-10 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Returns control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Return goods with a trail.</h1>
              <p className="mt-2 text-sm text-[#17221f]/55">Create, approve, and post customer returns.</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
          </header>
          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]">{message}</div>}
          <section className="mt-8 bg-white p-6">
            <h2 className="text-xl font-semibold">New sales return</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <select aria-label="Return invoice" value={invoiceId} onChange={(event) => void selectInvoice(event.target.value)} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select invoice</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {invoice.customer?.name ?? "Customer"}</option>)}</select>
              <select aria-label="Return product" value={productId} onChange={(event) => setProductId(event.target.value)} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select product</option>{invoiceItems.map((item) => <option key={item.productId} value={item.productId}>{item.product?.name ?? "Product"}</option>)}</select>
              <input aria-label="Return quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="border border-[#17221f]/15 px-3 py-2.5 text-sm" />
              <button type="button" onClick={() => void createReturn()} className="flex items-center justify-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><PackagePlus size={15} /> Create return</button>
            </div>
          </section>
          <section className="mt-8 space-y-3" aria-label="Sales returns">
            <h2 className="text-xl font-semibold">Sales returns</h2>
            {loading && <p className="bg-white p-5 text-sm text-[#17221f]/55">Loading returns...</p>}
            {!loading && returns.length === 0 && <p className="bg-white p-5 text-sm text-[#17221f]/55">No sales returns found.</p>}
            {returns.map((item) => <article key={item.id} className="flex flex-col gap-3 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.returnNumber ?? "Sales return"}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#17221f]/50">{item.status} · {item.invoice?.invoiceNumber ?? "Invoice"}</p></div>{item.status === "DRAFT" && <button type="button" onClick={() => void approveReturn(item)} className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Approve</button>}{item.status === "SUBMITTED" && <div className="flex flex-wrap gap-2"><select aria-label={`Return posting location for ${item.returnNumber ?? "return"}`} value={returnLocations[item.id] ?? ""} onChange={(event) => setReturnLocations((current) => ({ ...current, [item.id]: event.target.value }))} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void postReturn(item)} className="flex items-center gap-2 border border-[#17221f]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Send size={15} /> Post</button></div>}</article>)}
          </section>
        </div>
      </main>
    </>
  );
}
