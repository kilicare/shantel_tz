"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response; }

export default function ProductReportsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiClient.get("/products?page=1&limit=100");
      const rows = unwrap(response);
      const productList = Array.isArray(rows) ? rows : rows.data ?? [];
      const summary = await Promise.all(
        productList.map(async (product: any) => {
          const stock = await apiClient.get(`/products/${product.id}/stock`);
          const stockData = unwrap(stock);
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            quantity: stockData?.quantity ?? 0,
            costPrice: stockData?.costPrice ?? product.costPrice ?? 0,
          };
        }),
      );
      setProducts(summary);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Product report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Product analytics</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Product report</h1><p className="mt-2 text-sm text-[#172B4D]/55">Current stock and product-level value snapshot across the catalog.</p></div>
          <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
        </header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {loading ? <LoadingState message="Loading product report..." /> : products.length === 0 ? <div className="mt-8"><EmptyState title="No products available" description="The current product catalog is empty or not loaded." /></div> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ShantelCard key={product.id} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">{product.sku}</p><h2 className="mt-2 text-xl font-semibold">{product.name}</h2><div className="mt-4 space-y-2 text-sm"><p>Quantity on hand: <span className="font-semibold">{product.quantity}</span></p><p>Unit cost: <span className="font-semibold">{money.format(product.costPrice)}</span></p><p>Stock value: <span className="font-semibold">{money.format(product.quantity * Number(product.costPrice ?? 0))}</span></p></div></ShantelCard>)}</section>}
      </div>
    </main>
  </>;
}
