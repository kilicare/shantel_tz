"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, PackageCheck, Plus, Printer, RefreshCw, Send } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type PurchaseOrder = {
  id: string;
  poNumber?: string;
  status?: string;
  supplier?: { id: string; name: string };
  items?: Array<{ id: string; productId: string; quantity: number | string; product?: { name?: string } }>;
};
type GRN = { id: string; grnNumber?: string; status?: string; purchaseOrder?: { poNumber?: string } };
type Location = { id: string; name: string };
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string; costPrice?: number };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: "", productId: "", quantity: "1", unitCost: "0", discountPercent: "0", notes: "" });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({});
  const [grnQuantities, setGrnQuantities] = useState<Record<string, string>>({});
  const [receivingStatuses, setReceivingStatuses] = useState<Record<string, { totalReceived: number; totalOutstanding: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [ordersResponse, grnsResponse, locationsResponse, suppliersResponse, productsResponse] = await Promise.all([
        apiClient.get("/purchasing/purchase-orders?page=1&limit=50"),
        apiClient.get("/purchasing/grns?page=1&limit=50"),
        apiClient.get("/locations?page=1&limit=100"),
        apiClient.get("/suppliers?page=1&limit=100"),
        apiClient.get("/products?page=1&limit=100"),
      ]);
      const orderList = unwrap(ordersResponse) as PurchaseOrder[];
      setOrders(orderList);
      setGrns(unwrap(grnsResponse));
      setLocations(unwrap(locationsResponse));
      setSuppliers(unwrap(suppliersResponse));
      setProducts(unwrap(productsResponse));
      const statusEntries = await Promise.all(orderList.map(async (order) => { try { const response = await apiClient.get(`/purchasing/purchase-orders/${order.id}/receiving-status`); return [order.id, unwrap(response)] as const; } catch { return null; } }));
      setReceivingStatuses(Object.fromEntries(statusEntries.filter((entry): entry is [string, any] => entry !== null)));
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Purchase orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createPO(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.supplierId || !form.productId || Number(form.quantity) <= 0 || Number(form.unitCost) <= 0) { setError("Supplier, product, quantity, and unit cost are required."); return; }
    try { setError(""); const response = await apiClient.post("/purchasing/purchase-orders", { supplierId: form.supplierId, notes: form.notes, items: [{ productId: form.productId, quantity: Number(form.quantity), unitCost: Number(form.unitCost), discountPercent: Number(form.discountPercent) }] }); const created = unwrap(response); setMessage(`${created.poNumber ?? "Purchase order"} created with subtotal, tax, and total calculated.`); setShowForm(false); setForm({ supplierId: "", productId: "", quantity: "1", unitCost: "0", discountPercent: "0", notes: "" }); await loadData(); } catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Purchase order could not be created."); }
  }

  async function transitionOrder(order: PurchaseOrder, action: "submit" | "approve" | "post" | "reject") {
    try {
      setError("");
      if (action === "reject" && !(reasons[order.id] ?? "").trim()) { setError("A rejection reason is required."); return; }
      const response = await apiClient.patch(`/purchasing/purchase-orders/${order.id}/${action}`, action === "reject" ? { reason: reasons[order.id] } : {});
      const updated = unwrap(response);
      setMessage(`${updated.poNumber ?? order.poNumber} is now ${updated.status}.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || `PO ${action} failed.`);
    }
  }

  async function printPO(order: PurchaseOrder) {
    try { const response = await apiClient.get(`/documents/purchase-orders/${order.id}/print-pdf`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `${order.poNumber ?? "purchase-order"}.pdf`; link.click(); URL.revokeObjectURL(url); } catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Purchase order could not be printed."); }
  }

  async function createGRN(order: PurchaseOrder) {
    const locationId = selectedLocations[order.id];
    if (!locationId || !order.supplier?.id || !order.items?.length) {
      setError("Select a receiving location before creating the GRN.");
      return;
    }

    try {
      setError("");
      await apiClient.post("/purchasing/grns", {
        purchaseOrderId: order.id,
        supplierId: order.supplier.id,
        reference: `UI receipt for ${order.poNumber}`,
        items: order.items.map((item) => ({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          orderedQuantity: Number(item.quantity),
          receivedQuantity: Number(grnQuantities[item.id] ?? item.quantity),
          acceptedQuantity: Number(grnQuantities[item.id] ?? item.quantity),
          rejectedQuantity: 0,
        })),
      });
      setMessage(`${order.poNumber} GRN created successfully.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "GRN creation failed.");
    }
  }

  async function postGRN(grn: GRN) {
    const locationId = grn.id ? selectedLocations[grn.id] : "";
    if (!locationId) {
      setError("Select a receiving location before posting the GRN.");
      return;
    }

    try {
      setError("");
      const response = await apiClient.patch(`/purchasing/grns/${grn.id}/post`, { locationId });
      const posted = unwrap(response);
      setMessage(`${posted.grnNumber ?? grn.grnNumber} is now POSTED.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "GRN posting failed.");
    }
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Procurement control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Purchase orders and receiving.</h1>
              <p className="mt-2 text-sm text-foreground/55">Approve orders, post them, and receive accepted stock.</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-card"><RefreshCw size={15} /> Refresh</button>
            <button type="button" onClick={() => setShowForm((current) => !current)} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> New PO</button>
          </header>

          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-border-default bg-primary/8 px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-border-default bg-status-success-surface px-4 py-3 text-sm text-muted-foreground">{message}</div>}

          {showForm && <form onSubmit={createPO} className="mt-8 border border-border-default bg-primary p-5 text-white sm:p-6"><h2 className="text-xl font-semibold">Create purchase order</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select aria-label="PO supplier" value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} className="h-11 bg-card px-3 text-sm text-foreground"><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select aria-label="PO product" value={form.productId} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setForm({ ...form, productId: event.target.value, unitCost: product?.costPrice ? String(product.costPrice) : form.unitCost }); }} className="h-11 bg-card px-3 text-sm text-foreground"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select><input aria-label="PO quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-11 bg-card px-3 text-sm text-foreground" placeholder="Quantity" /><input aria-label="PO unit cost" type="number" min="0.01" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} className="h-11 bg-card px-3 text-sm text-foreground" placeholder="Unit cost" /><input aria-label="PO discount" type="number" min="0" step="0.01" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} className="h-11 bg-card px-3 text-sm text-foreground" placeholder="Discount %" /></div><p className="mt-3 text-sm text-white/70">Subtotal: TSh {(Number(form.quantity) * Number(form.unitCost)).toLocaleString()} · Tax (18%): TSh {(Number(form.quantity) * Number(form.unitCost) * (1 - Number(form.discountPercent) / 100) * 0.18).toLocaleString()} · Total: TSh {(Number(form.quantity) * Number(form.unitCost) * (1 - Number(form.discountPercent) / 100) * 1.18).toLocaleString()}</p><div className="mt-4 flex justify-end"><button type="submit" className="bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground">Save draft PO</button></div></form>}

          <section className="mt-8 space-y-3" aria-label="Purchase orders">
            <h2 className="text-xl font-semibold">Purchase orders</h2>
            {loading && <p className="bg-card p-5 text-sm text-foreground/55">Loading purchase orders...</p>}
            {!loading && orders.length === 0 && <p className="bg-card p-5 text-sm text-foreground/55">No purchase orders found.</p>}
            {orders.map((order) => (
              <article key={order.id} className="bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{order.poNumber ?? "Purchase order"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-foreground/50">{order.status} · {order.supplier?.name ?? "Supplier"}</p>
                    <p className="mt-2 text-sm text-foreground/65">{order.items?.map((item) => `${item.product?.name ?? "Product"} x ${item.quantity}`).join(", ")}</p>
                    {receivingStatuses[order.id] && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">Received {receivingStatuses[order.id].totalReceived} / {receivingStatuses[order.id].totalReceived + receivingStatuses[order.id].totalOutstanding} · Outstanding {receivingStatuses[order.id].totalOutstanding}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(order.status === "DRAFT" || order.status === "REJECTED") && <button type="button" onClick={() => void transitionOrder(order, "submit")} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Send size={15} /> Submit PO</button>}
                    {order.status === "SUBMITTED" && <><input aria-label={`PO rejection reason for ${order.poNumber ?? "purchase order"}`} value={reasons[order.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [order.id]: event.target.value }))} className="w-48 border border-border-default px-3 py-2.5 text-sm" placeholder="Rejection reason" /><button type="button" onClick={() => void transitionOrder(order, "approve")} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Check size={15} /> Approve PO</button><button type="button" onClick={() => void transitionOrder(order, "reject")} className="border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Reject</button></>}
                    {order.status === "APPROVED" && <button type="button" onClick={() => void transitionOrder(order, "post")} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Send size={15} /> Post PO</button>}
                    <button type="button" onClick={() => void printPO(order)} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Printer size={15} /> Print</button>
                  </div>
                </div>
                {(order.status === "SENT" || order.status === "PARTIALLY_RECEIVED") && <div className="mt-4 border-t border-border-default pt-4"><div className="mb-3 grid gap-2 sm:grid-cols-2">{order.items?.map((item) => <label key={item.id} className="text-xs uppercase tracking-[0.1em] text-foreground/55">{item.product?.name ?? "Product"} / ordered {item.quantity}<input aria-label={`GRN quantity for ${item.product?.name ?? "product"}`} type="number" min="0.01" max={Number(item.quantity)} step="0.01" value={grnQuantities[item.id] ?? String(item.quantity)} onChange={(event) => setGrnQuantities((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 h-10 w-full border border-border-default px-3 text-sm text-foreground" /></label>)}</div><div className="flex flex-wrap items-center gap-2"><select aria-label={`Receiving location for ${order.poNumber ?? "purchase order"}`} value={selectedLocations[order.id] ?? ""} onChange={(event) => setSelectedLocations((current) => ({ ...current, [order.id]: event.target.value }))} className="border border-border-default bg-card px-3 py-2.5 text-sm"><option value="">Select receiving location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void createGRN(order)} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><PackageCheck size={15} /> Create GRN</button></div></div>}
              </article>
            ))}
          </section>

          <section className="mt-10 space-y-3" aria-label="Goods received">
            <h2 className="text-xl font-semibold">Goods received</h2>
            {grns.length === 0 && <p className="bg-card p-5 text-sm text-foreground/55">No goods received found.</p>}
            {grns.map((grn) => <article key={grn.id} className="flex flex-col gap-3 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{grn.grnNumber ?? "GRN"}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-foreground/50">{grn.status} · {grn.purchaseOrder?.poNumber ?? "Purchase order"}</p></div>{grn.status === "DRAFT" && <div className="flex flex-wrap gap-2"><select aria-label={`Post location for ${grn.grnNumber ?? "GRN"}`} value={selectedLocations[grn.id] ?? ""} onChange={(event) => setSelectedLocations((current) => ({ ...current, [grn.id]: event.target.value }))} className="border border-border-default bg-card px-3 py-2.5 text-sm"><option value="">Select posting location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void postGRN(grn)} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Send size={15} /> Post GRN</button></div>}</article>)}
          </section>
        </div>
      </main>
    </>
  );
}
