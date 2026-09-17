"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard, StatusBadge } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Option = { id: string; name: string };
type Asset = { id: string; assetNumber: string; name: string; assetType: string; status: string; product?: { name: string } | null; location?: { name: string } | null; project?: { name: string } | null; warrantyEndDate?: string | null };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("EQUIPMENT");
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [warrantyEndDate, setWarrantyEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const [assetResponse, productResponse, locationResponse, projectResponse] = await Promise.all([apiClient.get("/projects/assets?page=1&limit=100"), apiClient.get("/products?page=1&limit=100"), apiClient.get("/locations?page=1&limit=100"), apiClient.get("/projects?page=1&limit=100")]);
      setAssets(unwrap(assetResponse)); setProducts(unwrap(productResponse)); setLocations(unwrap(locationResponse)); setProjects(unwrap(projectResponse));
    } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Assets could not be loaded."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setSuccess("");
      await apiClient.post("/projects/assets", { name, assetType, productId: productId || undefined, locationId, projectId: projectId || undefined, warrantyEndDate: warrantyEndDate ? `${warrantyEndDate}T00:00:00.000Z` : undefined });
      setSuccess("Asset registered successfully."); setName(""); setProductId(""); setProjectId(""); setWarrantyEndDate(""); await load();
    } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Asset could not be registered."); } finally { setSaving(false); }
  }
  async function deactivate(assetId: string) {
    try { setError(""); setSuccess(""); await apiClient.patch(`/projects/assets/${assetId}/deactivate`); setSuccess("Asset deactivated."); await load(); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Asset status could not be changed."); }
  }
  return <><WorkspaceNavigation /><main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto w-full max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Asset desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Assets</h1><p className="mt-2 text-sm text-muted-foreground">Register equipment, connect ownership context, and track status.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button></header>{error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}{success && <div className="mt-6"><AlertBanner tone="success">{success}</AlertBanner></div>}<section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.5fr]"><ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Register asset</p><h2 className="mt-2 text-2xl font-semibold">New asset</h2><form onSubmit={register} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm" /></label><label className="block text-sm font-medium">Asset type<input required value={assetType} onChange={(event) => setAssetType(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm" /></label><label className="block text-sm font-medium">Product<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">No product linked</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Location<select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select location</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">No project linked</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Warranty end<input type="date" value={warrantyEndDate} onChange={(event) => setWarrantyEndDate(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm" /></label><button disabled={saving} type="submit" className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"><Plus size={15} />{saving ? "Registering..." : "Register asset"}</button></form></ShantelCard><ShantelCard className="p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Asset report</p><h2 className="mt-2 text-2xl font-semibold">Registered assets</h2></div><span className="text-xs text-muted-foreground">{assets.length} records</span></div>{loading ? <LoadingState message="Loading assets..." /> : assets.length === 0 ? <div className="mt-5"><EmptyState title="No assets yet" /></div> : <div className="mt-5 divide-y divide-[#172B4D]/10">{assets.map((asset) => <div key={asset.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{asset.assetNumber}</p><p className="mt-1 font-semibold">{asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{asset.product?.name ?? "No product"} · {asset.location?.name ?? "No location"} · {asset.project?.name ?? "No project"}</p>{asset.warrantyEndDate && <p className="mt-1 text-xs text-muted-foreground">Warranty ends {asset.warrantyEndDate.slice(0, 10)}</p>}</div><div className="flex items-center gap-3"><StatusBadge status={asset.status} />{asset.status !== "DISPOSED" && <button type="button" onClick={() => void deactivate(asset.id)} className="border border-border-default px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]">Deactivate</button>}</div></div>)}</div>}</ShantelCard></section></div></main></>;
}
