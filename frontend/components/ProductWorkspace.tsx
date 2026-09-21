"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, Plus, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type Option = { id: string; name: string; code?: string };
type Product = { id: string; name: string; sku: string; barcode?: string; status?: string; sellingPrice?: number; productType?: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

const initialForm = { name: "", sku: "", barcode: "", productType: "STOCK_ITEM", categoryId: "", brandId: "", unitId: "", costPrice: "", sellingPrice: "", minimumStockLevel: "", reorderLevel: "", tax: "18", trackStock: true, trackSerialNumber: false };

export function ProductWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isNavigating = useNavigationLoading();

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [productResponse, categoryResponse, brandResponse, unitResponse] = await Promise.all([
        apiClient.get("/products?page=1&limit=100"),
        apiClient.get("/products/categories?page=1&limit=100"),
        apiClient.get("/products/brands?page=1&limit=100"),
        apiClient.get("/products/units?page=1&limit=100"),
      ]);
      setProducts(unwrap(productResponse));
      setCategories(unwrap(categoryResponse));
      setBrands(unwrap(brandResponse));
      setUnits(unwrap(unitResponse));
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Products could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      const response = await apiClient.post("/products", {
        ...form,
        barcode: form.barcode || undefined,
        brandId: form.brandId || undefined,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        minimumStockLevel: form.minimumStockLevel ? Number(form.minimumStockLevel) : undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        tax: form.tax ? Number(form.tax) : undefined,
      });
      const saved = unwrap(response);
      setMessage(`${saved.name} created successfully.`);
      setForm(initialForm);
      setShowForm(false);
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(Array.isArray(value) ? value[0] : value || "Product could not be created.");
    }
  }

  const filtered = products.filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Product master</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Products</h1>
              <p className="mt-2 text-sm text-foreground/55">Catalog, pricing, and stock-tracked items used across operations.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
              <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> {showForm ? "Close form" : "New product"}</button>
            </div>
          </header>
          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-border-default bg-primary/80 px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}
          {message && <div role="status" className="mt-6 flex items-center gap-2 border border-border-default bg-primary/80 px-4 py-3 text-sm text-muted-foreground"><Check size={17} /> {message}</div>}
          {showForm && <form onSubmit={save} className="mt-8 grid gap-4 bg-primary p-6 text-primary-foreground sm:grid-cols-2 lg:grid-cols-4"><h2 className="text-xl font-semibold sm:col-span-2 lg:col-span-4">New Product</h2><input required aria-label="Product name" placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input required aria-label="SKU" placeholder="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input aria-label="Barcode" placeholder="Barcode" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><select aria-label="Product type" value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none"><option value="STOCK_ITEM">Stock Item</option><option value="SERVICE">Service</option></select><select aria-label="Category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select aria-label="Brand" value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none"><option value="">Select brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select aria-label="Unit" value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none"><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><input type="number" aria-label="Cost price" placeholder="Cost price" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input type="number" aria-label="Selling price" placeholder="Selling price" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input type="number" aria-label="Minimum stock level" placeholder="Minimum stock level" value={form.minimumStockLevel} onChange={(event) => setForm({ ...form, minimumStockLevel: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input type="number" aria-label="Reorder level" placeholder="Reorder level" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><input type="number" aria-label="Tax (%)" placeholder="Tax (%)" value={form.tax} onChange={(event) => setForm({ ...form, tax: event.target.value })} className="h-11 border-b border-border-default bg-transparent text-sm outline-none" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.trackStock} onChange={(event) => setForm({ ...form, trackStock: event.target.checked })} /> Track stock</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.trackSerialNumber} onChange={(event) => setForm({ ...form, trackSerialNumber: event.target.checked })} /> Track serial numbers</label><button type="submit" className="col-span-full bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-forest">Create product</button></form>}
          <section className="mt-8 bg-card p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Catalog</p>
                <h2 className="mt-2 text-2xl font-semibold">Products</h2>
              </div>
              <span className="text-xs text-foreground/45">{filtered.length} records</span>
            </div>
            <div className="relative mt-5">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, or barcode" className="h-11 w-full border-b border-border-default bg-transparent pl-7 text-sm outline-none focus:border-primary" />
            </div>
            {loading ? <p className="py-10 text-sm text-foreground/45">Loading products...</p> : filtered.length === 0 ? <p className="py-10 text-sm text-foreground/45">No products found.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <div key={product.id} className="rounded-lg border border-border-default bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{product.name}</p><p className="mt-1 text-xs text-foreground/45">{product.sku}</p></div><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${product.status === "ACTIVE" ? "bg-status-success-surface text-status-success-text" : "bg-status-danger-surface text-status-danger-text"}`}>{product.status ?? "ACTIVE"}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/45"><span>SKU: {product.sku}</span>{product.barcode && <span>Barcode: {product.barcode}</span>}</div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-foreground/45">Price</span><span className="font-medium">{product.sellingPrice ? TZS.format(product.sellingPrice) : "-"}</span></div></div>)}</div>}
          </section>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}

const TZS = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
