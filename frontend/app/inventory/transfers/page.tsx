"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowRightLeft, Check, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Product = { id: string; name: string; sku: string };
type Location = { id: string; name: string };
type Transfer = { id: string; transferNumber?: string; status?: string; sourceLocation?: { name?: string }; destLocation?: { name?: string } };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ sourceLocationId: "", destLocationId: "", productId: "", quantity: "1", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTransfers() {
    try {
      setLoading(true);
      setError("");
      const [transferResponse, locationResponse, productResponse] = await Promise.all([
        apiClient.get("/inventory/transfers?page=1&limit=20"),
        apiClient.get("/locations?page=1&limit=100"),
        apiClient.get("/products?page=1&limit=100"),
      ]);
      setTransfers(unwrap(transferResponse));
      setLocations(unwrap(locationResponse));
      setProducts(unwrap(productResponse));
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Stock transfers could not be loaded.");
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
    void loadTransfers();
  }, []);

  async function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.sourceLocationId || !form.destLocationId || !form.productId || Number(form.quantity) <= 0) {
      setError("Source, destination, product, and quantity are required.");
      return;
    }

    if (form.sourceLocationId === form.destLocationId) {
      setError("Source and destination must be different locations.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const userId = JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.id;
      const response = await apiClient.post("/inventory/transfers", {
        sourceLocationId: form.sourceLocationId,
        destLocationId: form.destLocationId,
        items: [{ productId: form.productId, quantity: Number(form.quantity) }],
        notes: form.notes,
        userId,
      });
      const created = unwrap(response);
      setMessage(`${created.transferNumber ?? "Transfer"} created successfully.`);
      setForm({ sourceLocationId: "", destLocationId: "", productId: "", quantity: "1", notes: "" });
      await loadTransfers();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Transfer could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function transition(id: string, action: "approve" | "post") {
    try {
      setError("");
      const userId = JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.id;
      const response = await apiClient.patch(`/inventory/transfers/${id}/${action}`, { userId });
      const result = unwrap(response);
      setMessage(`${result.transferNumber ?? "Transfer"} is now ${result.status}.`);
      await loadTransfers();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || `Transfer could not be ${action}d.`);
    }
  }

  const canCreate = permissions.includes("inventory.transfer");
  const canApprove = permissions.includes("inventory.approve_adjust");

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Inventory control</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Stock transfers</h1>
              <p className="mt-2 text-sm text-[#172B4D]/55">Move goods between locations with approval and posting.</p>
            </div>
            <button type="button" onClick={() => void loadTransfers()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white">
              <RefreshCw size={15} /> Refresh
            </button>
          </header>

          {error && (
            <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {message && (
            <div role="status" className="mt-6 border border-[#16805C]/30 bg-[#16805C]/10 px-4 py-3 text-sm text-[#16805C]">
              {message}
            </div>
          )}

          {canCreate && (
            <form onSubmit={createTransfer} className="mt-8 bg-[#172B4D] p-6 text-[#F6F8FB] sm:p-8">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="text-[#D4A72C]" />
                <h2 className="text-2xl font-semibold">Create stock transfer</h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">
                  Source location
                  <select
                    aria-label="Source location"
                    value={form.sourceLocationId}
                    onChange={(event) => setForm({ ...form, sourceLocationId: event.target.value })}
                    className="mt-2 h-11 w-full bg-[#172B4D] text-sm normal-case tracking-normal"
                  >
                    <option value="">Select source</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">
                  Destination location
                  <select
                    aria-label="Destination location"
                    value={form.destLocationId}
                    onChange={(event) => setForm({ ...form, destLocationId: event.target.value })}
                    className="mt-2 h-11 w-full bg-[#172B4D] text-sm normal-case tracking-normal"
                  >
                    <option value="">Select destination</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">
                  Product
                  <select
                    aria-label="Transfer product"
                    value={form.productId}
                    onChange={(event) => setForm({ ...form, productId: event.target.value })}
                    className="mt-2 h-11 w-full bg-[#172B4D] text-sm normal-case tracking-normal"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">
                  Quantity
                  <input
                    aria-label="Transfer quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                    className="mt-2 h-11 w-full bg-[#172B4D] px-3 text-sm normal-case tracking-normal outline-none focus:border focus:border-[#D4A72C]"
                  />
                </label>
              </div>

              <label className="mt-4 block text-xs uppercase tracking-[0.12em] text-[#F6F8FB]/60">
                Notes
                <textarea
                  aria-label="Transfer notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={3}
                  className="mt-2 w-full bg-[#172B4D] px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border focus:border-[#D4A72C]"
                  placeholder="Optional notes"
                />
              </label>

              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={saving} className="bg-[#D4A72C] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#172B4D] disabled:opacity-60">
                  {saving ? "Creating..." : "Create transfer"}
                </button>
              </div>
            </form>
          )}

          <section className="mt-8 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Directory</p>
                <h2 className="mt-2 text-2xl font-semibold">Transfers</h2>
              </div>
              <span className="text-xs text-[#172B4D]/45">{transfers.length} records</span>
            </div>

            {loading ? (
              <p className="py-10 text-sm text-[#172B4D]/50">Loading transfers...</p>
            ) : transfers.length === 0 ? (
              <p className="py-10 text-sm text-[#172B4D]/50">No transfers found.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="flex flex-col gap-3 border border-[#172B4D]/10 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#172B4D]">{transfer.transferNumber ?? "Transfer"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#172B4D]/50">{transfer.status ?? "DRAFT"}</p>
                      <p className="mt-2 text-sm text-[#172B4D]/70">
                        {transfer.sourceLocation?.name ?? "Unknown source"} → {transfer.destLocation?.name ?? "Unknown destination"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canApprove && transfer.status === "DRAFT" && (
                        <button type="button" onClick={() => void transition(transfer.id, "approve")} className="flex items-center gap-2 bg-[#172B4D] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {canApprove && (transfer.status === "DRAFT" || transfer.status === "SUBMITTED") && (
                        <button type="button" onClick={() => void transition(transfer.id, "post")} className="flex items-center gap-2 border border-[#172B4D]/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
                          <Check size={14} /> Post
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
