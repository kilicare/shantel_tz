"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ClipboardList, FileCheck2, PackageCheck, Plus, RefreshCw, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type RecordItem = { id?: string; requisitionNumber?: string; poNumber?: string; grnNumber?: string; status?: string; supplier?: { name?: string } };
type Product = { id: string; name: string; sku: string };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function PurchasingPage() {
  const [requisitions, setRequisitions] = useState<RecordItem[]>([]);
  const [orders, setOrders] = useState<RecordItem[]>([]);
  const [grns, setGrns] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ productId: "", quantity: "1", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPurchasing() {
    try {
      setLoading(true);
      setError("");
      const [requisitionResponse, orderResponse, grnResponse, productResponse] = await Promise.all([
        apiClient.get("/purchasing/requisitions?page=1&limit=20"),
        apiClient.get("/purchasing/purchase-orders?page=1&limit=20"),
        apiClient.get("/purchasing/grns?page=1&limit=20"),
        apiClient.get("/products?page=1&limit=100"),
      ]);
      setRequisitions(unwrap(requisitionResponse));
      setOrders(unwrap(orderResponse));
      setGrns(unwrap(grnResponse));
      setProducts(unwrap(productResponse));
    } catch (requestError: any) {
      const messageValue = requestError?.response?.data?.message;
      setError(Array.isArray(messageValue) ? messageValue[0] : messageValue || "Purchasing data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); }
    void loadPurchasing();
  }, []);

  async function createRequisition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.productId || Number(form.quantity) <= 0) { setError("Choose a product and enter a quantity greater than zero."); return; }
    try {
      setSaving(true); setError("");
      const response = await apiClient.post("/purchasing/requisitions", { items: [{ productId: form.productId, quantity: Number(form.quantity) }], notes: form.notes });
      const created = unwrap(response);
      setMessage(`${created.requisitionNumber ?? "Requisition"} created successfully.`);
      setForm({ productId: "", quantity: "1", notes: "" }); setShowForm(false); await loadPurchasing();
    } catch (requestError: any) {
      const messageValue = requestError?.response?.data?.message;
      setError(Array.isArray(messageValue) ? messageValue[0] : messageValue || "Requisition could not be created.");
    } finally { setSaving(false); }
  }

  const canCreate = permissions.includes("purchase_orders.create");
  const canApprove = permissions.includes("purchase_orders.approve");
  const canPost = permissions.includes("grns.post");
  const lists = [{ title: "Requisitions", icon: ClipboardList, items: requisitions, number: "requisitionNumber" }, { title: "Purchase orders", icon: FileCheck2, items: orders, number: "poNumber" }, { title: "Goods received", icon: PackageCheck, items: grns, number: "grnNumber" }];

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#f4f1ec] px-4 py-5 text-[#17221f] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#17221f]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ad6742]">Procurement desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Move purchases into stock.</h1><p className="mt-2 text-sm text-[#17221f]/55">Requisitions, purchase orders, and receiving in one controlled flow.</p></div><button type="button" onClick={() => void loadPurchasing()} className="flex items-center gap-2 border border-[#17221f]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh data</button></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#ad6742]/30 bg-[#ad6742]/8 px-4 py-3 text-sm text-[#8a4931]"><AlertCircle size={18} /> {error}</div>}{message && <div role="status" className="mt-6 border border-[#567b68]/30 bg-[#567b68]/10 px-4 py-3 text-sm text-[#365b4a]">{message}</div>}<section className="mt-8 grid gap-4 md:grid-cols-3">{lists.map(({ title, icon: Icon, items }) => <article key={title} className="bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17221f]/48">{title}</p><Icon size={18} className="text-[#ad6742]" /></div><p className="mt-7 text-3xl font-semibold">{loading ? "..." : items.length}</p></article>)}</section><section className="mt-8 flex flex-wrap gap-2" aria-label="Purchasing actions">{canCreate && <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#17221f] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Plus size={15} /> New requisition</button>}{canApprove && <button type="button" onClick={() => window.location.assign("/approvals")} className="border border-[#17221f]/20 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">Review approvals</button>}{canPost && <button type="button" onClick={() => window.location.assign("/inventory")} className="border border-[#17221f]/20 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">Post GRN</button>}</section>{showForm && <form onSubmit={createRequisition} className="mt-8 bg-[#17221f] p-6 text-[#f4f1ec] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8a36b]">Purchase request</p><h2 className="mt-2 text-2xl font-semibold">New requisition</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close requisition form"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Product<select aria-label="Requisition product" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-2 h-11 w-full bg-[#17221f] text-sm normal-case tracking-normal outline-none"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60">Quantity<input aria-label="Requisition quantity" type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label><label className="text-xs uppercase tracking-[0.12em] text-[#f4f1ec]/60 sm:col-span-2">Notes<input aria-label="Requisition notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 h-11 w-full border-b border-[#f4f1ec]/20 bg-transparent text-sm normal-case tracking-normal outline-none" /></label></div><button type="submit" disabled={saving} className="mt-6 bg-[#e8a36b] px-5 py-3 text-sm font-semibold text-[#17221f] disabled:opacity-50">{saving ? "Creating..." : "Create requisition"}</button></form>}<section className="mt-8 grid gap-5 lg:grid-cols-3">{lists.map(({ title, items, number }) => <article key={title} className="bg-white p-6"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-4 divide-y divide-[#17221f]/10">{items.length ? items.slice(0, 8).map((item, index) => <div key={item.id ?? index} className="py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{(item as any)[number] ?? "Unnumbered document"}</p><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ad6742]">{item.status ?? "UNKNOWN"}</span></div><p className="mt-1 text-xs text-[#17221f]/45">{item.supplier?.name ?? "Supplier pending"}</p></div>) : <p className="py-7 text-sm text-[#17221f]/50">No {title.toLowerCase()} found.</p>}</div></article>)}</section></div></main></>;
}
