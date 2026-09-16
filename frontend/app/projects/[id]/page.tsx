"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard, StatusBadge } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Product = { id: string; name: string; sku?: string | null };
type Location = { id: string; name: string };
type ProjectItem = { id: string; productId: string; quantity: string | number; totalCost: string | number; consumedAt?: string | null; product?: { name: string }; location?: { name: string } };
type Project = { id: string; projectNumber: string; name: string; status: string; customer?: { name: string } | null; items?: ProjectItem[] };
type ExpenseOption = { id: string; name: string };
type Summary = { totalCost: number; totalQuantity: number; consumedCount: number; remainingCount: number };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ExpenseOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ExpenseOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [consumeProductId, setConsumeProductId] = useState("");
  const [consumeLocationId, setConsumeLocationId] = useState("");
  const [consumeQuantity, setConsumeQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [projectResponse, productResponse, locationResponse, summaryResponse, optionsResponse] = await Promise.all([
        apiClient.get(`/projects/${projectId}`),
        apiClient.get("/products?page=1&limit=100"),
        apiClient.get("/locations?page=1&limit=100"),
        apiClient.get(`/projects/${projectId}/summary`),
        apiClient.get("/approvals/expenses/options"),
      ]);
      setProject(unwrap(projectResponse));
      setProducts(unwrap(productResponse));
      setLocations(unwrap(locationResponse));
      setSummary(unwrap(summaryResponse));
      const options = unwrap(optionsResponse);
      setCategories(options.categories ?? []);
      setPaymentMethods(options.paymentMethods ?? []);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Project details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (projectId) void load(); }, [projectId]);

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post(`/projects/${projectId}/items`, { productId, locationId, quantity: Number(quantity), unitCost: Number(unitCost) });
      setSuccess("Product added to project.");
      setProductId("");
      setQuantity("1");
      setUnitCost("0");
      await load();
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Product could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function consumeStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post(`/projects/${projectId}/consume-stock`, { productId: consumeProductId, locationId: consumeLocationId, quantity: Number(consumeQuantity) });
      setSuccess("Stock consumed for project.");
      setConsumeProductId("");
      setConsumeLocationId("");
      setConsumeQuantity("1");
      await load();
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Stock could not be consumed.");
    } finally {
      setSaving(false);
    }
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post("/approvals/expenses", { categoryId, paymentMethodId, description: expenseDescription, amount: Number(expenseAmount), projectId });
      setSuccess("Project expense created.");
      setCategoryId("");
      setPaymentMethodId("");
      setExpenseDescription("");
      setExpenseAmount("");
      await load();
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Expense could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Link href="/projects" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]"><ArrowLeft size={15} /> Projects</Link>
        {loading ? <LoadingState message="Loading project..." /> : !project ? <EmptyState title="Project not found" /> : <>
          <header className="mt-6 flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">{project.projectNumber}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{project.name}</h1><p className="mt-2 text-sm text-[#172B4D]/55">{project.customer?.name ?? "No customer linked"}</p></div><StatusBadge status={project.status} /></header>
          {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
          {success && <div className="mt-6"><AlertBanner tone="success">{success}</AlertBanner></div>}
          {summary && <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><ShantelCard className="p-4"><p className="text-xs text-[#172B4D]/55">Project cost</p><p className="mt-2 text-xl font-semibold">{summary.totalCost}</p></ShantelCard><ShantelCard className="p-4"><p className="text-xs text-[#172B4D]/55">Quantity</p><p className="mt-2 text-xl font-semibold">{summary.totalQuantity}</p></ShantelCard><ShantelCard className="p-4"><p className="text-xs text-[#172B4D]/55">Consumed</p><p className="mt-2 text-xl font-semibold">{summary.consumedCount}</p></ShantelCard><ShantelCard className="p-4"><p className="text-xs text-[#172B4D]/55">Remaining</p><p className="mt-2 text-xl font-semibold">{summary.remainingCount}</p></ShantelCard></div>}
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Project inventory</p><h2 className="mt-2 text-2xl font-semibold">Add product</h2><form onSubmit={addProduct} className="mt-6 space-y-4"><label className="block text-sm font-medium">Product<select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>)}</select></label><label className="block text-sm font-medium">Location<select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Quantity<input required min="0.01" step="0.01" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm" /></label><label className="block text-sm font-medium">Unit cost<input required min="0.01" step="0.01" type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm" /></label></div><button disabled={saving} type="submit" className="flex w-full items-center justify-center gap-2 bg-[#172B4D] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"><Plus size={15} />{saving ? "Adding..." : "Add product"}</button></form></ShantelCard>
            <ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Stock movement</p><h2 className="mt-2 text-2xl font-semibold">Consume stock</h2><form onSubmit={consumeStock} className="mt-6 space-y-4"><label className="block text-sm font-medium">Product<select required value={consumeProductId} onChange={(event) => setConsumeProductId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select assigned product</option>{project.items?.map((item) => <option key={item.id} value={item.productId}>{item.product?.name}</option>)}</select></label><label className="block text-sm font-medium">Location<select required value={consumeLocationId} onChange={(event) => setConsumeLocationId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select source location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="block text-sm font-medium">Quantity<input required min="0.01" step="0.01" type="number" value={consumeQuantity} onChange={(event) => setConsumeQuantity(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm" /></label><button disabled={saving} type="submit" className="w-full border border-[#172B4D]/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-50">{saving ? "Consuming..." : "Consume stock"}</button></form></ShantelCard>
            <ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Project finance</p><h2 className="mt-2 text-2xl font-semibold">Add expense</h2><form onSubmit={addExpense} className="mt-6 space-y-4"><label className="block text-sm font-medium">Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block text-sm font-medium">Payment method<select required value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm"><option value="">Select method</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><label className="block text-sm font-medium">Description<input required value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm" /></label><label className="block text-sm font-medium">Amount<input required min="0.01" step="0.01" type="number" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm" /></label><button disabled={saving} type="submit" className="w-full bg-[#172B4D] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50">{saving ? "Creating..." : "Create expense"}</button></form></ShantelCard>
            <ShantelCard className="p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Assigned products</p><h2 className="mt-2 text-2xl font-semibold">Project items</h2></div><button type="button" onClick={() => void load()} aria-label="Refresh project" className="border border-[#172B4D]/15 p-2.5 hover:bg-white"><RefreshCw size={15} /></button></div>{project.items?.length ? <div className="mt-5 divide-y divide-[#172B4D]/10">{project.items.map((item) => <div key={item.id} className="py-4"><div className="flex items-center justify-between gap-4"><p className="font-semibold">{item.product?.name ?? "Product"}</p><StatusBadge status={item.consumedAt ? "CONSUMED" : "ASSIGNED"} /></div><p className="mt-1 text-xs text-[#172B4D]/55">{item.location?.name ?? "Location"} · Qty {item.quantity} · Cost {item.totalCost}</p></div>)}</div> : <div className="mt-5"><EmptyState title="No products assigned" description="Add the first product to this project." /></div>}</ShantelCard>
          </section>
        </>}
      </div>
    </main>
  </>;
}
