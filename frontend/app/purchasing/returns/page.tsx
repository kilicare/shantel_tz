"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, PackageMinus, RefreshCw, Send } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type GRN = { id: string; grnNumber?: string; status?: string; supplierId: string; supplier?: { name?: string }; items?: Array<{ productId: string; acceptedQuantity: number | string; product?: { name?: string; sku?: string } }> };
type ReturnRecord = { id: string; returnNumber?: string; status?: string; supplier?: { name?: string }; grn?: { grnNumber?: string } };
type Location = { id: string; name: string };

function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }
function message(error: any, fallback: string) { const value = error?.response?.data?.message; return Array.isArray(value) ? value[0] : value || fallback; }

export default function PurchaseReturnsPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedItems, setSelectedItems] = useState<GRN["items"]>([]);
  const [form, setForm] = useState({ grnId: "", productId: "", quantity: "", reason: "", locationId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try { setLoading(true); setError(""); const [grnResponse, returnResponse, locationResponse] = await Promise.all([apiClient.get("/purchasing/grns?page=1&limit=100"), apiClient.get("/purchasing/purchase-returns?page=1&limit=100"), apiClient.get("/locations?page=1&limit=100")]); setGrns(unwrap(grnResponse).filter((grn: GRN) => grn.status === "POSTED")); setReturns(unwrap(returnResponse)); setLocations(unwrap(locationResponse)); }
    catch (requestError: any) { setError(message(requestError, "Purchase returns could not be loaded.")); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const selectedGRN = grns.find((grn) => grn.id === form.grnId);
  const selectedItem = selectedItems?.find((item) => item.productId === form.productId);

  async function chooseGRN(grnId: string) {
    setForm((current) => ({ ...current, grnId, productId: "" }));
    setSelectedItems([]);
    if (!grnId) return;
    try { const response = await apiClient.get(`/purchasing/grns/${grnId}`); setSelectedItems(unwrap(response)?.items ?? []); }
    catch (requestError: any) { setError(message(requestError, "GRN items could not be loaded.")); }
  }

  async function createReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGRN || !selectedItem || Number(form.quantity) <= 0 || !form.reason.trim()) { setError("Select a posted GRN/product, enter a valid quantity, and provide a reason."); return; }
    try { setError(""); const response = await apiClient.post("/purchasing/purchase-returns", { grnId: selectedGRN.id, supplierId: selectedGRN.supplierId, items: [{ productId: selectedItem.productId, quantity: Number(form.quantity), reason: form.reason }] }); const created = unwrap(response); setNotice(`${created.returnNumber ?? "Purchase return"} created as DRAFT.`); setForm({ ...form, reason: "", quantity: "" }); await load(); }
    catch (requestError: any) { setError(message(requestError, "Purchase return could not be created.")); }
  }
  async function transition(record: ReturnRecord, action: "approve" | "post") {
    try { setError(""); const body = action === "post" ? { locationId: form.locationId } : {}; if (action === "post" && !form.locationId) { setError("Select the stock location before posting."); return; } const response = await apiClient.patch(`/purchasing/purchase-returns/${record.id}/${action}`, body); const updated = unwrap(response); setNotice(`${updated.returnNumber ?? record.returnNumber} is now ${updated.status}.`); await load(); }
    catch (requestError: any) { setError(message(requestError, `Purchase return could not be ${action}d.`)); }
  }

  return <><WorkspaceNavigation /><main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-end justify-between gap-5 border-b border-border-default pb-7"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Procurement control</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Purchase returns.</h1><p className="mt-2 text-sm text-foreground/55">Return accepted stock with approval, inventory movement, and supplier balance evidence.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>
    {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-border-default bg-card px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}{notice && <div role="status" className="mt-6 border border-border-default bg-status-success-surface px-4 py-3 text-sm text-muted-foreground">{notice}</div>}
    <form onSubmit={createReturn} className="mt-8 border border-border-default bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><PackageMinus className="text-primary" size={20} /><h2 className="text-xl font-semibold">Create purchase return</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select aria-label="Return GRN" value={form.grnId} onChange={(event) => void chooseGRN(event.target.value)} className="h-11 border border-border-default bg-card px-3 text-sm"><option value="">Select posted GRN</option>{grns.map((grn) => <option key={grn.id} value={grn.id}>{grn.grnNumber} · {grn.supplier?.name}</option>)}</select><select aria-label="Return product" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="h-11 border border-border-default bg-card px-3 text-sm"><option value="">Select product</option>{selectedItems?.map((item) => <option key={item.productId} value={item.productId}>{item.product?.sku} · {item.product?.name} · accepted {item.acceptedQuantity}</option>)}</select><input aria-label="Return quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-11 border border-border-default px-3 text-sm" placeholder="Quantity" /><input aria-label="Return reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="h-11 border border-border-default px-3 text-sm" placeholder="Reason" /><button type="submit" className="flex h-11 items-center justify-center gap-2 bg-primary px-4 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Send size={15} /> Submit return</button></div></form>
    <section className="mt-8 space-y-3"><h2 className="text-xl font-semibold">Return register</h2>{loading && <p className="bg-card p-5 text-sm text-foreground/55">Loading returns...</p>}{!loading && returns.length === 0 && <p className="bg-card p-5 text-sm text-foreground/55">No purchase returns found.</p>}{returns.map((record) => <article key={record.id} className="flex flex-col gap-4 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{record.returnNumber}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-foreground/50">{record.status} · {record.supplier?.name} · {record.grn?.grnNumber}</p></div><div className="flex flex-wrap items-center gap-2">{record.status === "DRAFT" && <button type="button" onClick={() => void transition(record, "approve")} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Check size={15} /> Approve</button>}{record.status === "SUBMITTED" && <><select aria-label={`Posting location for ${record.returnNumber}`} value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} className="border border-border-default bg-card px-3 py-2.5 text-sm"><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><button type="button" onClick={() => void transition(record, "post")} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"><Send size={15} /> Post</button></>}</div></article>)}</section>
  </div></main></>;
}
