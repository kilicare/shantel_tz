"use client";

import { Fragment, useEffect, useState } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Requisition = {
  id: string;
  requisitionNumber?: string;
  status?: string;
  items?: Array<{ id: string; quantity: number | string; product?: { name?: string; sku?: string } }>;
};

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, string>>({});
  const [itemForms, setItemForms] = useState<Record<string, { productId: string; quantity: string }>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [requisitionResponse, supplierResponse] = await Promise.all([
        apiClient.get("/purchasing/requisitions?page=1&limit=50"),
        apiClient.get("/suppliers?page=1&limit=100"),
      ]);
      const productResponse = await apiClient.get("/products?page=1&limit=100");
      setRequisitions(unwrap(requisitionResponse));
      setSuppliers(unwrap(supplierResponse));
      setProducts(unwrap(productResponse));
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Requisitions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequisition(requisition: Requisition) {
    await transition(requisition, "submit", "");
  }

  async function transition(requisition: Requisition, action: "submit" | "reject" | "return-for-correction", reason: string) {
    try {
      setError("");
      const body = action === "submit" ? {} : { reason };
      if (action !== "submit" && !reason.trim()) { setError("A reason is required for this decision."); return; }
      const response = await apiClient.patch(`/purchasing/requisitions/${requisition.id}/${action}`, body);
      const updated = unwrap(response);
      setMessage(`${updated.requisitionNumber ?? requisition.requisitionNumber} is now ${updated.status}.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || `Requisition could not be ${action}.`);
    }
  }

  async function addItem(requisition: Requisition) {
    const form = itemForms[requisition.id] ?? { productId: "", quantity: "" };
    if (!form.productId || Number(form.quantity) <= 0) { setError("Choose a product and enter a quantity greater than zero."); return; }
    try {
      setError("");
      await apiClient.post(`/purchasing/requisitions/${requisition.id}/items`, { items: [{ productId: form.productId, quantity: Number(form.quantity) }] });
      setMessage(`Item added to ${requisition.requisitionNumber}.`);
      setItemForms((current) => ({ ...current, [requisition.id]: { productId: "", quantity: "" } }));
      await loadData();
    } catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Item could not be added."); }
  }

  async function loadHistory(requisition: Requisition) {
    try { const response = await apiClient.get(`/purchasing/requisitions/${requisition.id}/approval-history`); setHistory((current) => ({ ...current, [requisition.id]: unwrap(response) ?? [] })); }
    catch (requestError: any) { const apiMessage = requestError?.response?.data?.message; setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Approval history could not be loaded."); }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function approveRequisition(requisition: Requisition) {
    try {
      setError("");
      const response = await apiClient.patch(`/purchasing/requisitions/${requisition.id}/approve`);
      const approved = unwrap(response);
      setMessage(`${approved.requisitionNumber ?? requisition.requisitionNumber} is now APPROVED.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Requisition approval failed.");
    }
  }

  async function convertToPurchaseOrder(requisition: Requisition) {
    const supplierId = selectedSuppliers[requisition.id];
    if (!supplierId) {
      setError("Select a supplier before converting the requisition.");
      return;
    }

    try {
      setError("");
      const response = await apiClient.post(`/purchasing/requisitions/${requisition.id}/convert-to-po`, { supplierId });
      const purchaseOrder = unwrap(response);
      setMessage(`${purchaseOrder.poNumber ?? "Purchase order"} created successfully.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Requisition conversion failed.");
    }
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Procurement control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Requisition decisions.</h1>
              <p className="mt-2 text-sm text-[#172B4D]/55">Approve requests and convert them into purchase orders.</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white">
              <RefreshCw size={15} /> Refresh
            </button>
          </header>

          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">{message}</div>}

          <section className="mt-8 space-y-3" aria-label="Requisition decisions">
            {loading && <p className="bg-white p-5 text-sm text-[#172B4D]/55">Loading requisitions...</p>}
            {!loading && requisitions.length === 0 && <p className="bg-white p-5 text-sm text-[#172B4D]/55">No requisitions found.</p>}
            {requisitions.map((requisition) => (
              <Fragment key={requisition.id}>
              <article className="flex flex-col gap-4 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{requisition.requisitionNumber ?? "Requisition"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#172B4D]/50">{requisition.status ?? "UNKNOWN"}</p>
                  <div className="mt-3 space-y-1 text-xs text-[#172B4D]/65">{requisition.items?.map((item) => <p key={item.id}>{item.product?.sku} · {item.product?.name} · Qty {item.quantity}</p>)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(requisition.status === "DRAFT" || requisition.status === "RETURNED_FOR_CORRECTION") && <><select aria-label={`Add product to ${requisition.requisitionNumber ?? "requisition"}`} value={itemForms[requisition.id]?.productId ?? ""} onChange={(event) => setItemForms((current) => ({ ...current, [requisition.id]: { productId: event.target.value, quantity: current[requisition.id]?.quantity ?? "" } }))} className="max-w-full border border-[#172B4D]/15 bg-white px-3 py-2.5 text-sm"><option value="">Add product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select><input aria-label={`Item quantity for ${requisition.requisitionNumber ?? "requisition"}`} type="number" min="0.01" step="0.01" value={itemForms[requisition.id]?.quantity ?? ""} onChange={(event) => setItemForms((current) => ({ ...current, [requisition.id]: { productId: current[requisition.id]?.productId ?? "", quantity: event.target.value } }))} className="w-24 border border-[#172B4D]/15 px-3 py-2.5 text-sm" placeholder="Qty" /><button type="button" onClick={() => void addItem(requisition)} className="border border-[#172B4D]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]">Add item</button><button type="button" onClick={() => void submitRequisition(requisition)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Submit</button></>}
                  {requisition.status === "SUBMITTED" && <><input aria-label={`Decision reason for ${requisition.requisitionNumber ?? "requisition"}`} value={reasons[requisition.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [requisition.id]: event.target.value }))} className="w-48 border border-[#172B4D]/15 px-3 py-2.5 text-sm" placeholder="Decision reason" /><button type="button" onClick={() => void approveRequisition(requisition)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Approve</button><button type="button" onClick={() => void transition(requisition, "reject", reasons[requisition.id] ?? "")} className="border border-[#C94A4A]/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#C94A4A]">Reject</button><button type="button" onClick={() => void transition(requisition, "return-for-correction", reasons[requisition.id] ?? "")} className="border border-[#D4A72C]/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#7A5A12]">Return</button></>}
                  {requisition.status === "APPROVED" && <>
                    <select aria-label={`Supplier for ${requisition.requisitionNumber ?? "requisition"}`} value={selectedSuppliers[requisition.id] ?? ""} onChange={(event) => setSelectedSuppliers((current) => ({ ...current, [requisition.id]: event.target.value }))} className="border border-[#172B4D]/15 bg-white px-3 py-2.5 text-sm">
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                    <button type="button" onClick={() => void convertToPurchaseOrder(requisition)} className="border border-[#172B4D]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]">Convert to PO</button>
                  </>}
                  {requisition.status === "CONVERTED_TO_PO" && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#16805C]">Converted</span>}
                  <button type="button" onClick={() => void loadHistory(requisition)} className="border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]">History</button>
                </div>
              </article>
              {history[requisition.id] && <div className="border-t border-[#172B4D]/10 bg-[#F6F8FB] px-5 py-4 text-xs"><p className="font-semibold uppercase tracking-[0.1em]">Approval history</p>{history[requisition.id].map((entry) => <p key={entry.id} className="mt-2">Step {entry.approvalStep}: {entry.approvalDecision} · {entry.actedBy?.name ?? "Pending"}{entry.approverComment ? ` · ${entry.approverComment}` : ""}</p>)}</div>}
              </Fragment>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
