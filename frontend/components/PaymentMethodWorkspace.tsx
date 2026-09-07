"use client";

import { FormEvent, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type PaymentMethod = { id: string; name: string; code: string; description?: string };

export function PaymentMethodWorkspace({ methods, onChanged }: { methods: PaymentMethod[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function create(event: FormEvent) {
    event.preventDefault();
    try { setError(""); const response = await apiClient.post("/payments/methods", form); setMessage(`${response.data?.data?.name ?? form.name} created successfully.`); setForm({ name: "", code: "", description: "" }); setOpen(false); await onChanged(); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Payment method could not be created."); }
  }

  async function deactivate(method: PaymentMethod) {
    try { setError(""); await apiClient.patch(`/payments/methods/${method.id}/deactivate`); setMessage(`${method.name} deactivated successfully.`); await onChanged(); }
    catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Payment method could not be deactivated."); }
  }

  return <section className="mt-8 bg-white p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ad6742]">Configuration</p><h2 className="mt-2 text-2xl font-semibold">Payment methods</h2></div><button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-[#17221f] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white"><Plus size={15} /> {open ? "Close" : "New method"}</button></div>{message && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#365b4a]"><Check size={16} /> {message}</p>}{error && <p role="alert" className="mt-4 text-sm text-[#8a4931]">{error}</p>}{open && <form onSubmit={create} className="mt-5 grid gap-3 sm:grid-cols-3"><input required aria-label="Payment method name" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 border-b border-[#17221f]/15 bg-transparent text-sm outline-none" /><input required aria-label="Payment method code" placeholder="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="h-10 border-b border-[#17221f]/15 bg-transparent text-sm uppercase outline-none" /><input aria-label="Payment method description" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-10 border-b border-[#17221f]/15 bg-transparent text-sm outline-none" /><button type="submit" className="bg-[#e8a36b] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#17221f] sm:col-span-3">Create method</button></form>}<div className="mt-5 divide-y divide-[#17221f]/10">{methods.map((method) => <div key={method.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{method.name} · {method.code}</p><p className="text-xs text-[#17221f]/45">{method.description ?? "ACTIVE"}</p></div><button type="button" aria-label={`Deactivate ${method.name}`} onClick={() => void deactivate(method)} className="p-2 text-[#ad6742]"><Trash2 size={15} /></button></div>)}</div></section>;
}
