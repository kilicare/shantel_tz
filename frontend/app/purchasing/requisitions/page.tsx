"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Requisition = {
  id: string;
  requisitionNumber?: string;
  status?: string;
};

type Supplier = { id: string; name: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, string>>({});
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
      setRequisitions(unwrap(requisitionResponse));
      setSuppliers(unwrap(supplierResponse));
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Requisitions could not be loaded.");
    } finally {
      setLoading(false);
    }
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
      <main className="min-h-screen bg-[#f4f1ec] px-5 py-7 text-[#17221f] sm:px-10 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Procurement control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Requisition decisions.</h1>
              <p className="mt-2 text-sm text-[#17221f]/55">Approve requests and convert them into purchase orders.</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white">
              <RefreshCw size={15} /> Refresh
            </button>
          </header>

          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]">{message}</div>}

          <section className="mt-8 space-y-3" aria-label="Requisition decisions">
            {loading && <p className="bg-white p-5 text-sm text-[#17221f]/55">Loading requisitions...</p>}
            {!loading && requisitions.length === 0 && <p className="bg-white p-5 text-sm text-[#17221f]/55">No requisitions found.</p>}
            {requisitions.map((requisition) => (
              <article key={requisition.id} className="flex flex-col gap-4 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{requisition.requisitionNumber ?? "Requisition"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#17221f]/50">{requisition.status ?? "UNKNOWN"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {requisition.status === "DRAFT" && <button type="button" onClick={() => void approveRequisition(requisition)} className="flex items-center gap-2 bg-[#17221f] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Approve</button>}
                  {requisition.status === "APPROVED" && <>
                    <select aria-label={`Supplier for ${requisition.requisitionNumber ?? "requisition"}`} value={selectedSuppliers[requisition.id] ?? ""} onChange={(event) => setSelectedSuppliers((current) => ({ ...current, [requisition.id]: event.target.value }))} className="border border-[#17221f]/15 bg-white px-3 py-2.5 text-sm">
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                    <button type="button" onClick={() => void convertToPurchaseOrder(requisition)} className="border border-[#17221f]/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]">Convert to PO</button>
                  </>}
                  {requisition.status === "CONVERTED_TO_PO" && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#567b68]">Converted</span>}
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
