"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, PackageCheck, RefreshCw, Send } from "lucide-react";
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

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [ordersResponse, grnsResponse, locationsResponse] = await Promise.all([
        apiClient.get("/purchasing/purchase-orders?page=1&limit=50"),
        apiClient.get("/purchasing/grns?page=1&limit=50"),
        apiClient.get("/locations?page=1&limit=100"),
      ]);
      setOrders(unwrap(ordersResponse));
      setGrns(unwrap(grnsResponse));
      setLocations(unwrap(locationsResponse));
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

  async function transitionOrder(order: PurchaseOrder, action: "approve" | "post") {
    try {
      setError("");
      const response = await apiClient.patch(`/purchasing/purchase-orders/${order.id}/${action}`);
      const updated = unwrap(response);
      setMessage(`${updated.poNumber ?? order.poNumber} is now ${updated.status}.`);
      await loadData();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || `PO ${action} failed.`);
    }
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
          receivedQuantity: Number(item.quantity),
          acceptedQuantity: Number(item.quantity),
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
      <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Procurement control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Purchase orders and receiving.</h1>
              <p className="mt-2 text-sm text-[#172B4D]/55">Approve orders, post them, and receive accepted stock.</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>
          </header>

          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">{message}</div>}

          <section className="mt-8 space-y-3" aria-label="Purchase orders">
            <h2 className="text-xl font-semibold">Purchase orders</h2>
            {loading && <p className="bg-white p-5 text-sm text-[#172B4D]/55">Loading purchase orders...</p>}
            {!loading && orders.length === 0 && <p className="bg-white p-5 text-sm text-[#172B4D]/55">No purchase orders found.</p>}
            {orders.map((order) => (
              <article key={order.id} className="bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{order.poNumber ?? "Purchase order"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#172B4D]/50">{order.status} · {order.supplier?.name ?? "Supplier"}</p>
                    <p className="mt-2 text-sm text-[#172B4D]/65">{order.items?.map((item) => `${item.product?.name ?? "Product"} x ${item.quantity}`).join(", ")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === "DRAFT" && <button type="button" onClick={() => void transitionOrder(order, "approve")} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Approve PO</button>}
                    {order.status === "SUBMITTED" && <button type="button" onClick={() => void transitionOrder(order, "post")} className="flex items-center gap-2 border border-[#172B4D]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Send size={15} /> Post PO</button>}
                  </div>
                </div>
                {(order.status === "SENT" || order.status === "APPROVED") && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#172B4D]/10 pt-4"><select aria-label={`Receiving location for ${order.poNumber ?? "purchase order"}`} value={selectedLocations[order.id] ?? ""} onChange={(event) => setSelectedLocations((current) => ({ ...current, [order.id]: event.target.value }))} className="border border-[#172B4D]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select receiving location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void createGRN(order)} className="flex items-center gap-2 border border-[#172B4D]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><PackageCheck size={15} /> Create GRN</button></div>}
              </article>
            ))}
          </section>

          <section className="mt-10 space-y-3" aria-label="Goods received">
            <h2 className="text-xl font-semibold">Goods received</h2>
            {grns.length === 0 && <p className="bg-white p-5 text-sm text-[#172B4D]/55">No goods received found.</p>}
            {grns.map((grn) => <article key={grn.id} className="flex flex-col gap-3 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{grn.grnNumber ?? "GRN"}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#172B4D]/50">{grn.status} · {grn.purchaseOrder?.poNumber ?? "Purchase order"}</p></div>{grn.status === "DRAFT" && <div className="flex flex-wrap gap-2"><select aria-label={`Post location for ${grn.grnNumber ?? "GRN"}`} value={selectedLocations[grn.id] ?? ""} onChange={(event) => setSelectedLocations((current) => ({ ...current, [grn.id]: event.target.value }))} className="border border-[#172B4D]/15 bg-white px-3 py-2.5 text-sm"><option value="">Select posting location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void postGRN(grn)} className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Send size={15} /> Post GRN</button></div>}</article>)}
          </section>
        </div>
      </main>
    </>
  );
}
