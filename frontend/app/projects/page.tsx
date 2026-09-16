"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard, StatusBadge } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Project = { id: string; projectNumber: string; name: string; description?: string | null; status: string; customer?: { name: string } | null };
type Customer = { id: string; name: string };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [projectResponse, customerResponse] = await Promise.all([
        apiClient.get("/projects?page=1&limit=100"),
        apiClient.get("/customers?page=1&limit=100"),
      ]);
      setProjects(unwrap(projectResponse));
      setCustomers(unwrap(customerResponse));
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.post("/projects", {
        name,
        customerId: customerId || undefined,
        description: description || undefined,
      });
      setName("");
      setCustomerId("");
      setDescription("");
      setSuccess("Project created successfully.");
      await load();
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message[0] : message || "Project could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Project desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Projects</h1><p className="mt-2 text-sm text-[#172B4D]/55">Create projects, connect customers, and keep delivery costs visible.</p></div>
          <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>
        </header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {success && <div className="mt-6"><AlertBanner tone="success">{success}</AlertBanner></div>}
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
          <ShantelCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">New project</p>
            <h2 className="mt-2 text-2xl font-semibold">Start a project</h2>
            <form onSubmit={createProject} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Project name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm outline-none focus:border-[#2563EB]" /></label>
              <label className="block text-sm font-medium">Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 h-11 w-full border border-[#172B4D]/15 bg-white px-3 text-sm outline-none focus:border-[#2563EB]"><option value="">No customer linked</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-2 w-full border border-[#172B4D]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]" /></label>
              <button disabled={saving} type="submit" className="flex w-full items-center justify-center gap-2 bg-[#172B4D] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"><Plus size={15} />{saving ? "Creating..." : "Create project"}</button>
            </form>
          </ShantelCard>
          <ShantelCard className="p-6">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Directory</p><h2 className="mt-2 text-2xl font-semibold">All projects</h2></div><span className="text-xs text-[#172B4D]/45">{projects.length} records</span></div>
            {loading ? <LoadingState message="Loading projects..." /> : projects.length === 0 ? <div className="mt-5"><EmptyState title="No projects yet" description="Create the first project to begin Round 8." /></div> : <div className="mt-5 divide-y divide-[#172B4D]/10">{projects.map((project) => <div key={project.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">{project.projectNumber}</p><Link href={`/projects/${project.id}`} className="mt-1 block font-semibold hover:text-[#2563EB]">{project.name}</Link><p className="mt-1 text-xs text-[#172B4D]/55">{project.customer?.name ?? "No customer linked"}</p></div><StatusBadge status={project.status} /></div>)}</div>}
          </ShantelCard>
        </section>
      </div>
    </main>
  </>;
}
