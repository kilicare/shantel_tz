"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type AuditLog = { id: string; timestamp: string; entityType: string; entityId: string; action: string; user?: { name?: string; email?: string } | null; metadata?: unknown };
type IntegrityResult = { checkedAt?: string; status?: string; isHealthy?: boolean; issueCount?: number; issues?: unknown[]; invalidSequences?: unknown[]; usersWithoutRole?: unknown[] };
type Product = { id: string; name: string; sku: string };
type Location = { id: string; name: string };
type StockTrace = { product?: string; location?: string; movements?: Array<{ date: string; type: string; quantity: number; direction: string; balance: number; referenceType?: string; referenceId?: string }> };

function unwrap(response: any) { return response?.data?.data ?? response?.data ?? response ?? []; }
function unwrapList(response: any) {
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.results ?? [];
}
function errorMessage(error: any, fallback: string) { const message = error?.response?.data?.message; return Array.isArray(message) ? message[0] : message || fallback; }

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [checks, setChecks] = useState<Record<string, IntegrityResult>>({});
  const [trace, setTrace] = useState<StockTrace | null>(null);
  const [filters, setFilters] = useState({ entityType: "", action: "", startDate: "", endDate: "" });
  const [traceForm, setTraceForm] = useState({ productId: "", locationId: "" });
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [error, setError] = useState("");
  const isNavigating = useNavigationLoading();

  async function load() {
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams({ limit: "100" });
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.action) params.set("action", filters.action);
      const [logsResponse, productsResponse, locationsResponse, inventoryResponse, documentsResponse, usersResponse] = await Promise.all([
        apiClient.get(`/audit/logs/recent?${params}`), apiClient.get("/products?page=1&limit=100"), apiClient.get("/locations?page=1&limit=100"),
        apiClient.get("/audit/integrity/stock"), apiClient.get("/audit/integrity/documents"), apiClient.get("/audit/integrity/users"),
      ]);
      let nextLogs = unwrap(logsResponse) as AuditLog[];
      if (filters.startDate || filters.endDate) nextLogs = nextLogs.filter((log) => { const value = new Date(log.timestamp).getTime(); return (!filters.startDate || value >= new Date(filters.startDate).getTime()) && (!filters.endDate || value <= new Date(`${filters.endDate}T23:59:59`).getTime()); });
      setLogs(nextLogs); setProducts(unwrapList(productsResponse)); setLocations(unwrapList(locationsResponse));
      setChecks({ inventory: unwrap(inventoryResponse), documents: unwrap(documentsResponse), users: unwrap(usersResponse) });
    } catch (requestError: any) { setError(errorMessage(requestError, "Audit data could not be loaded.")); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [filters]);
  async function loadTrace() {
    if (!traceForm.productId) return;
    try { setTraceLoading(true); setError(""); const query = traceForm.locationId ? `?locationId=${traceForm.locationId}` : ""; let tracePayload = unwrap(await apiClient.get(`/audit/trace/stock/${traceForm.productId}${query}`)); while (tracePayload?.data && !("product" in tracePayload)) tracePayload = tracePayload.data; setTrace(tracePayload); }
    catch (requestError: any) { setError(errorMessage(requestError, "Stock movement trace could not be loaded.")); } finally { setTraceLoading(false); }
  }

  const checkCards = [{ key: "inventory", label: "Inventory integrity" }, { key: "documents", label: "Document integrity" }, { key: "users", label: "User integrity" }];
  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border-default pb-8">
            <div>
              <p className="text-label font-semibold uppercase tracking-wider text-blue-primary">Control centre</p>
              <h1 className="mt-2 text-h1 font-semibold tracking-tight">Audit & integrity</h1>
              <p className="mt-2 text-body text-text-muted">Evidence from system activity, consistency checks, and stock movement history.</p>
            </div>
            <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default bg-surface px-4 py-2.5 text-label font-semibold uppercase tracking-wide hover:bg-surface-hover"><RefreshCw size={16} /> Refresh</button>
          </header>
          {error && <div role="alert" className="mt-6 flex items-center gap-3 border border-border-default bg-card px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {checkCards.map((card) => {
              const result = checks[card.key];
              const healthy = result && (result.status === "OK" || result.isHealthy === true);
              return (
                <article key={card.key} className="border border-border-default bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-label font-semibold uppercase tracking-wide text-foreground/55">{card.label}</p>
                    {healthy ? <CheckCircle2 className="text-text-muted" size={20} /> : result ? <XCircle className="text-text-muted" size={20} /> : <ShieldCheck className="text-brand-amber" size={20} />}
                  </div>
                  <p className="mt-4 text-h2 font-semibold">{!result ? "Checking" : healthy ? "Healthy" : `${result.issueCount ?? (result.issues?.length ?? result.invalidSequences?.length ?? result.usersWithoutRole?.length ?? 0)} issue(s)`}</p>
                  <p className="mt-1 text-small text-foreground/50">{result?.checkedAt ? new Date(result.checkedAt).toLocaleString() : "Live check"}</p>
                </article>
              );
            })}
          </section>
          <section className="mt-8 border border-border-default bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3"><Search size={19} className="text-blue-primary" /><h2 className="text-h3 font-semibold">Audit log evidence</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input aria-label="Entity type filter" placeholder="Entity type" value={filters.entityType} onChange={(event) => setFilters({ ...filters, entityType: event.target.value })} className="h-11 border border-border-default px-3 text-body" />
              <input aria-label="Action filter" placeholder="Action" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} className="h-11 border border-border-default px-3 text-body" />
              <input aria-label="Start date filter" type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="h-11 border border-border-default px-3 text-sm" />
              <div className="flex gap-2">
                <input aria-label="End date filter" type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="h-11 min-w-0 flex-1 border border-border-default px-3 text-sm" />
                <button type="button" onClick={() => void load()} className="h-11 bg-primary px-4 text-xs font-semibold uppercase tracking-[0.1em] text-white">Apply</button>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border-default text-xs uppercase tracking-[0.1em] text-foreground/50">
                  <tr><th className="pb-3">When</th><th className="pb-3">Entity</th><th className="pb-3">Action</th><th className="pb-3">Actor</th><th className="pb-3">Reference</th></tr>
                </thead>
                <tbody>
                  {logs.map((log) => <tr key={log.id} className="border-b border-border-default"><td className="py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td><td className="py-3">{log.entityType}</td><td className="py-3 font-medium">{log.action}</td><td className="py-3">{log.user?.name ?? "System"}</td><td className="py-3 text-foreground/55">{log.entityId}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-8 border border-border-default bg-primary p-5 text-white sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-amber">Movement trace</p>
              <h2 className="mt-2 text-xl font-semibold">Product and location history</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <select aria-label="Trace product" value={traceForm.productId} onChange={(event) => setTraceForm({ ...traceForm, productId: event.target.value })} className="h-11 min-w-56 bg-card px-3 text-sm text-foreground"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select>
              <select aria-label="Trace location" value={traceForm.locationId} onChange={(event) => setTraceForm({ ...traceForm, locationId: event.target.value })} className="h-11 min-w-48 bg-card px-3 text-sm text-foreground"><option value="">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
              <button type="button" onClick={() => void loadTrace()} disabled={!traceForm.productId || traceLoading} className="flex h-11 items-center gap-2 bg-card px-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground disabled:opacity-50">{traceLoading && <RefreshCw size={15} className="animate-spin" />} Trace stock</button>
            </div>
            {trace && <div className="mt-6 overflow-x-auto">
              <p className="mb-3 text-sm text-white/65">{trace.product} · {trace.location} · {trace.movements?.length ?? 0} movements</p>
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-border-default/15 text-xs uppercase tracking-[0.1em] text-white/55">
                  <tr><th className="pb-3">Date</th><th className="pb-3">Type</th><th className="pb-3">Direction</th><th className="pb-3">Quantity</th><th className="pb-3">Balance</th><th className="pb-3">Reference</th></tr>
                </thead>
                <tbody>
                  {trace.movements?.map((movement, index) => <tr key={`${movement.date}-${index}`} className="border-b border-border-default/15"><td className="py-3">{new Date(movement.date).toLocaleString()}</td><td className="py-3">{movement.type}</td><td className="py-3">{movement.direction}</td><td className="py-3">{movement.quantity}</td><td className="py-3">{movement.balance}</td><td className="py-3 text-white/65">{movement.referenceType} · {movement.referenceId}</td></tr>)}
                </tbody>
              </table>
            </div>}
          </section>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
