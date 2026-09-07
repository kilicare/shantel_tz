"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";

type Option = { id: string; name: string; code?: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  status?: string;
  sellingPrice?: number;
  costPrice?: number;
  productType?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  trackSerialNumber?: boolean;
  serialNumbers?: Array<{ serialNumber: string }>;
};
const blank = {
  name: "",
  sku: "",
  barcode: "",
  productType: "STOCK_ITEM",
  categoryId: "",
  brandId: "",
  unitId: "",
  costPrice: "",
  sellingPrice: "",
  trackSerialNumber: false,
};
function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export function EditableProductWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      setLoading(true);
      setError("");
      const [p, c, b, u] = await Promise.all([
        apiClient.get("/products?page=1&limit=100"),
        apiClient.get("/products/categories?page=1&limit=100"),
        apiClient.get("/products/brands?page=1&limit=100"),
        apiClient.get("/products/units?page=1&limit=100"),
      ]);
      setProducts(unwrap(p));
      setCategories(unwrap(c));
      setBrands(unwrap(b));
      setUnits(unwrap(u));
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(
        Array.isArray(value)
          ? value[0]
          : value || "Products could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(product: Product) {
    setEditingId(product.id);
    setOpen(true);
    setForm({
      ...blank,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      productType: product.productType ?? "STOCK_ITEM",
      categoryId: product.categoryId ?? "",
      brandId: product.brandId ?? "",
      unitId: product.unitId ?? "",
      costPrice: String(product.costPrice ?? ""),
      sellingPrice: String(product.sellingPrice ?? ""),
      trackSerialNumber: product.trackSerialNumber ?? false,
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const body = {
        ...form,
        barcode: form.barcode || undefined,
        brandId: form.brandId || undefined,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        trackSerialNumber: form.trackSerialNumber,
      };
      const saved = unwrap(
        editingId
          ? await apiClient.patch(`/products/${editingId}`, body)
          : await apiClient.post("/products", body),
      );
      setMessage(
        `${saved.name} ${editingId ? "updated" : "created"} successfully.`,
      );
      setForm(blank);
      setEditingId("");
      setOpen(false);
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(
        Array.isArray(value)
          ? value[0]
          : value || "Product could not be saved.",
      );
    }
  }
  async function deactivate(product: Product) {
    try {
      await apiClient.patch(`/products/${product.id}/deactivate`);
      setMessage(`${product.name} deactivated successfully.`);
      await load();
    } catch (requestError: any) {
      const value = requestError?.response?.data?.message;
      setError(
        Array.isArray(value)
          ? value[0]
          : value || "Product could not be deactivated.",
      );
    }
  }
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku} ${product.barcode ?? ""} ${(product.serialNumbers ?? []).map((serial) => serial.serialNumber).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const input =
    "h-11 border-b border-white/25 bg-transparent text-sm outline-none";
  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen min-w-0 bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">
                Product master
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Products</h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"
              >
                <RefreshCw size={15} /> Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(blank);
                  setOpen(!open);
                }}
                className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white"
              >
                <Plus size={15} /> New product
              </button>
            </div>
          </header>
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-3 text-sm text-[#5B3A0F]"
            >
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {message && (
            <div
              role="status"
              className="mt-6 flex items-center gap-2 text-sm text-[#16805C]"
            >
              <Check size={16} /> {message}
            </div>
          )}
          {open && (
            <form
              onSubmit={save}
              className="mt-8 grid gap-4 bg-[#172B4D] p-6 text-[#F6F8FB] sm:grid-cols-2"
            >
              <h2 className="text-xl font-semibold sm:col-span-2">
                {editingId ? "Edit Product" : "New Product"}
              </h2>
              <input
                required
                aria-label="Product name"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={input}
              />
              <input
                required
                aria-label="SKU"
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className={input}
              />
              <input
                aria-label="Barcode"
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className={input}
              />
              <select
                required
                aria-label="Category"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"
              >
                <option value="">Category</option>
                {categories.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Brand"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"
              >
                <option value="">Brand</option>
                {brands.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                required
                aria-label="Unit"
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"
              >
                <option value="">Unit</option>
                {units.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                aria-label="Cost price"
                placeholder="Cost price"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                className={input}
              />
              <input
                required
                type="number"
                aria-label="Selling price"
                placeholder="Selling price"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({ ...form, sellingPrice: e.target.value })
                }
                className={input}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.trackSerialNumber}
                  onChange={(e) =>
                    setForm({ ...form, trackSerialNumber: e.target.checked })
                  }
                />{" "}
                Track serial number
              </label>
              <button
                type="submit"
                className="bg-[#D4A72C] px-4 py-2.5 text-xs font-semibold text-[#172B4D] sm:col-span-2"
              >
                {editingId ? "Save changes" : "Create product"}
              </button>
            </form>
          )}
          <section className="mt-8 bg-white p-6">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-semibold">Products</h2>
              <span className="text-xs text-[#172B4D]/45">
                {filtered.length} records
              </span>
            </div>
            <input
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU or barcode"
              className="mt-5 h-11 w-full border-b border-[#172B4D]/15 bg-transparent text-sm outline-none"
            />
            {loading ? (
              <p className="py-10 text-sm text-[#172B4D]/50">Loading...</p>
            ) : (
              <div className="mt-4 divide-y divide-[#172B4D]/10">
                {filtered.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-[#172B4D]/45">
                        {product.sku}
                        {product.barcode ? ` · ${product.barcode}` : ""} ·{" "}
                        {product.status}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => edit(product)}
                        className="p-2"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Deactivate ${product.name}`}
                        onClick={() => void deactivate(product)}
                        className="p-2 text-[#2563EB]"
                      >
                        <Trash2 size={15} />
                      </button>
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
