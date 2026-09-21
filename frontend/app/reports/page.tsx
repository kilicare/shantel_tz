"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type Location = { id: string; name: string };
type Product = { id: string; name: string; sku: string };
type StockRow = {
  productSku: string;
  productName: string;
  quantity: number;
  location: string;
};
type LowStockRow = {
  productSku: string;
  productName: string;
  currentQuantity: number;
  minimumLevel: number;
  location: string;
};
type MovementRow = {
  date: string;
  movementType: string;
  product: string;
  quantityIn: number;
  quantityOut: number;
  location: string;
};
type ValuationRow = {
  productSku: string;
  productName: string;
  quantity: number;
  costValue: number;
  location: string;
};

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? {};
}

function rangeQuery() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);
  return `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
}

export default function ReportsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [stock, setStock] = useState<StockRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isNavigating = useNavigationLoading();

  async function loadReports(nextLocationId = locationId) {
    try {
      setLoading(true);
      setError("");
      const locationQuery = nextLocationId
        ? `?locationId=${nextLocationId}`
        : "";
      const reportParams = new URLSearchParams();
      if (nextLocationId) reportParams.set("locationId", nextLocationId);
      if (productId) reportParams.set("productId", productId);
      const movementQuery = reportParams.toString();
      const [
        locationsResponse,
        productsResponse,
        stockResponse,
        lowStockResponse,
        movementResponse,
        valuationResponse,
      ] = await Promise.all([
        apiClient.get("/locations?page=1&limit=100"),
        apiClient.get("/products?page=1&limit=100"),
        apiClient.get(`/reports/inventory/current-stock${locationQuery}`),
        apiClient.get(`/reports/inventory/low-stock${locationQuery}`),
        apiClient.get(
          `/reports/inventory/movements?${rangeQuery()}${movementQuery ? `&${movementQuery}` : ""}`,
        ),
        apiClient.get(`/reports/inventory/valuation${locationQuery}`),
      ]);
      setLocations(unwrap(locationsResponse));
      setProducts(unwrap(productsResponse));
      setStock(unwrap(stockResponse).details ?? []);
      setLowStock(unwrap(lowStockResponse).items ?? []);
      setMovements(unwrap(movementResponse).movements ?? []);
      setValuation(unwrap(valuationResponse).items ?? []);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : message || "Inventory reports could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function exportReport(format: "csv" | "excel" | "pdf") {
    try {
      const response = await apiClient.get(
        `/reports/export/inventory-${format}?locationId=${locationId}`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-report.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : message || "Inventory export failed.",
      );
    }
  }

  const selectedProduct = products.find((product) => product.id === productId);
  const matchesProduct = (name: string, sku?: string) =>
    !selectedProduct ||
    name === selectedProduct.name ||
    sku === selectedProduct.sku;
  const visibleStock = stock.filter((row) =>
    matchesProduct(row.productName, row.productSku),
  );
  const visibleLowStock = lowStock.filter((row) =>
    matchesProduct(row.productName, row.productSku),
  );
  const visibleValuation = valuation.filter((row) =>
    matchesProduct(row.productName, row.productSku),
  );
  const visibleMovements = movements.filter(
    (row) => !selectedProduct || row.product === selectedProduct.name,
  );

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-label font-semibold uppercase tracking-wider text-blue-primary">
                Reporting hub
              </p>
              <h1 className="mt-2 text-h1 font-semibold tracking-tight">
                Business reports
              </h1>
              <p className="mt-2 text-body text-text-muted">
                Sales, inventory, purchasing, payments, expenses, customers, suppliers, and audit coverage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-label font-semibold uppercase tracking-wide hover:bg-surface-hover"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </header>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["/reports/sales", "Sales", "Posted sales and invoice detail"],
              ["/reports/customers", "Customers", "Balances and account activity"],
              ["/reports/products", "Products", "Stock and product movement"],
              ["/reports/purchasing", "Purchasing", "Purchases, GRNs, and spend"],
              ["/reports/suppliers", "Suppliers", "Supplier liability and balances"],
              ["/reports/payments", "Payments", "Cash flow and aging"],
              ["/reports/expenses", "Expenses", "Operational spend tracking"],
              ["/reports/audit", "Audit", "Trail and integrity"],
              ["/reports", "Inventory", "Current stock and valuation"],
            ].map(([href, title, desc]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg border border-border-default bg-surface p-5 transition-colors hover:border-border-default hover:bg-surface-hover"
              >
                <p className="text-label font-semibold uppercase tracking-wide text-blue-primary">Report</p>
                <h2 className="mt-3 text-h3 font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 text-body text-text-muted">{desc}</p>
              </a>
            ))}
          </div>
          {error && (
            <div
              role="alert"
              className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em]">
              Location
              <select
                aria-label="Report location"
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  void loadReports(event.target.value);
                }}
                className="ml-3 border border-border-default bg-card px-3 py-2 text-sm normal-case tracking-normal"
              >
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em]">
              Product
              <select
                aria-label="Report product"
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value);
                  void loadReports(locationId);
                }}
                className="ml-3 border border-border-default bg-card px-3 py-2 text-sm normal-case tracking-normal"
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.sku}
                  </option>
                ))}
              </select>
            </label>
            {(["csv", "excel", "pdf"] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => exportReport(format)}
                className="flex items-center gap-2 border border-border-default px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
              >
                <Download size={14} /> {format.toUpperCase()}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="mt-8 bg-card p-6 text-sm text-foreground/55">
              Loading inventory reports...
            </p>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {[
                [
                  "Current stock",
                  visibleStock.map(
                    (row) =>
                      `${row.productName} · ${row.location}: ${row.quantity}`,
                  ),
                ],
                [
                  "Low stock",
                  visibleLowStock.map(
                    (row) =>
                      `${row.productName} · ${row.location}: ${row.currentQuantity} / min ${row.minimumLevel}`,
                  ),
                ],
                [
                  "Movement history",
                  visibleMovements.map(
                    (row) =>
                      `${row.product} · ${row.movementType} · ${row.location}: +${row.quantityIn} / -${row.quantityOut}`,
                  ),
                ],
                [
                  "Stock valuation",
                  visibleValuation.map(
                    (row) =>
                      `${row.productName} · ${row.location}: ${row.costValue.toLocaleString()}`,
                  ),
                ],
              ].map(([title, rows]) => (
                <section key={title as string} className="bg-card p-5">
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-foreground/55">
                    {(rows as string[]).length} records
                  </p>
                  <div className="mt-4 space-y-3">
                    {(rows as string[]).slice(0, 100).map((row, index) => (
                      <p
                        key={`${title}-${index}`}
                        className="border-b border-border-default pb-3 text-sm"
                      >
                        {row}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
