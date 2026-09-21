"use client";

import { FormEvent, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard, StatusBadge } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type Option = { id: string; name: string };
type Serial = { id: string; serialNumber: string; serialStatus: string; product?: { name: string } | null; location?: { name: string } | null; project?: { name: string } | null; asset?: { name: string } | null };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export default function SerialNumbersPage() {
  const [serials, setSerials] = useState<Serial[]>([]); const [products, setProducts] = useState<Option[]>([]); const [locations, setLocations] = useState<Option[]>([]); const [projects, setProjects] = useState<Option[]>([]); const [assets, setAssets] = useState<Option[]>([]);
  const [productId, setProductId] = useState(""); const [serialNumber, setSerialNumber] = useState(""); const [assignId, setAssignId] = useState(""); const [assignProjectId, setAssignProjectId] = useState(""); const [assignAssetId, setAssignAssetId] = useState(""); const [assignLocationId, setAssignLocationId] = useState(""); const [status, setStatus] = useState("IN_PROJECT"); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [history, setHistory] = useState<any>(null);
  const isNavigating = useNavigationLoading();
  async function load() { try { setLoading(true); setError(""); const [serialResponse, productResponse, locationResponse, projectResponse, assetResponse] = await Promise.all([apiClient.get("/projects/serial-numbers?page=1&limit=100"), apiClient.get("/products?page=1&limit=100"), apiClient.get("/locations?page=1&limit=100"), apiClient.get("/projects?page=1&limit=100"), apiClient.get("/projects/assets?page=1&limit=100")]); setSerials(unwrap(serialResponse)); setProducts(unwrap(productResponse)); setLocations(unwrap(locationResponse)); setProjects(unwrap(projectResponse)); setAssets(unwrap(assetResponse)); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Serial numbers could not be loaded."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function register(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { setSaving(true); setError(""); setSuccess(""); await apiClient.post("/projects/serial-numbers/register", { productId, serialNumber }); setSuccess("Serial number registered."); setSerialNumber(""); await load(); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Serial number could not be registered."); } finally { setSaving(false); } }
  async function assign(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { setSaving(true); setError(""); setSuccess(""); await apiClient.post(`/projects/serial-numbers/${assignId}/assign`, { projectId: assignProjectId || undefined, assetId: assignAssetId || undefined, locationId: assignLocationId || undefined }); setSuccess("Serial assigned successfully."); await load(); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Serial could not be assigned."); } finally { setSaving(false); } }
  async function changeStatus(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { setSaving(true); setError(""); setSuccess(""); await apiClient.patch(`/projects/serial-numbers/${assignId}/status`, { status }); setSuccess(`Serial status changed to ${status}.`); await load(); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Serial status could not be changed."); } finally { setSaving(false); } }
  async function showHistory(id: string) { try { setError(""); setHistory(unwrap(await apiClient.get(`/projects/serial-numbers/${id}/history`))); } catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Serial history could not be loaded."); } }
  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Traceability desk</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Serial numbers</h1>
              <p className="mt-2 text-sm text-foreground/55">Register, assign, sell, return, deactivate, and inspect lifecycle history.</p>
            </div>
            <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
          </header>
          {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
          {success && <div className="mt-6"><AlertBanner tone="success">{success}</AlertBanner></div>}
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <ShantelCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Register</p>
              <h2 className="mt-2 text-2xl font-semibold">New serial</h2>
              <form onSubmit={register} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">Product<select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-medium">Serial number<input required value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm" /></label>
                <button disabled={saving} type="submit" className="w-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50">Register</button>
              </form>
            </ShantelCard>
            <ShantelCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Assign</p>
              <h2 className="mt-2 text-2xl font-semibold">Link serial</h2>
              <form onSubmit={assign} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">Serial<select required value={assignId} onChange={(event) => setAssignId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select serial</option>{serials.map((item) => <option key={item.id} value={item.id}>{item.serialNumber}</option>)}</select></label>
                <label className="block text-sm font-medium">Project<select value={assignProjectId} onChange={(event) => setAssignProjectId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">No project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-medium">Asset<select value={assignAssetId} onChange={(event) => setAssignAssetId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">No asset</option>{assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-medium">Location<select value={assignLocationId} onChange={(event) => setAssignLocationId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">No location</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <button disabled={saving} type="submit" className="w-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50">Assign</button>
              </form>
            </ShantelCard>
            <ShantelCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Status</p>
              <h2 className="mt-2 text-2xl font-semibold">Change status</h2>
              <form onSubmit={changeStatus} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">Serial<select required value={assignId} onChange={(event) => setAssignId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select serial</option>{serials.map((item) => <option key={item.id} value={item.id}>{item.serialNumber}</option>)}</select></label>
                <label className="block text-sm font-medium">Status<select required value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="IN_PROJECT">In project</option><option value="IN_STOCK">In stock</option><option value="SOLD">Sold</option><option value="RETURNED">Returned</option><option value="DEACTIVATED">Deactivated</option></select></label>
                <button disabled={saving} type="submit" className="w-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50">Change status</button>
              </form>
            </ShantelCard>
          </section>
          <section className="mt-8 bg-card p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Directory</p>
                <h2 className="mt-2 text-2xl font-semibold">All serials</h2>
              </div>
              <span className="text-xs text-foreground/45">{serials.length} records</span>
            </div>
            {loading ? <LoadingState message="Loading serials..." /> : serials.length === 0 ? <div className="mt-5"><EmptyState title="No serials yet" description="Register the first serial number to begin." /></div> : <div className="mt-5 divide-y divide-[#172B4D]/10">{serials.map((serial) => <div key={serial.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{serial.serialNumber}</p><p className="mt-1 font-semibold">{serial.product?.name ?? "No product"}</p><p className="mt-1 text-xs text-foreground/55">{serial.serialStatus} · {serial.project?.name ?? "No project"} · {serial.asset?.name ?? "No asset"} · {serial.location?.name ?? "No location"}</p></div><div className="flex items-center gap-3"><StatusBadge status={serial.serialStatus} /><button type="button" onClick={() => void showHistory(serial.id)} className="text-xs text-foreground/50 hover:text-foreground">History</button></div></div>)}</div>}
          </section>
          {history && <section className="mt-8 bg-card p-6"><h2 className="text-xl font-semibold">History</h2><div className="mt-4 text-xs">{history.map((entry: any, index: number) => <p key={index} className="mt-2">{entry}</p>)}</div></section>}
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
