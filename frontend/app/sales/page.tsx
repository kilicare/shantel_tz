"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Check, ChevronDown, FilePlus2, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { Invoice, Product, Customer, Location, salesService } from "@/services/sales.service";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { StatusBadge } from "@/components/ShantelPrimitives";

type CartLine = { productId: string; productName: string; sku: string; quantity: number; unitPrice: number };
const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
const number = (value: number | string) => Number(value) || 0;

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  async function loadWorkspace() {
    try {
      setIsLoading(true);
      const [invoiceResult, customerResult, productResult, locationResult] = await Promise.all([
        salesService.getInvoices(),
        salesService.getCustomers(),
        salesService.getProducts(),
        salesService.getLocations(),
      ]);
      setInvoices(invoiceResult?.data ?? []);
      setCustomers(customerResult?.data ?? []);
      setProducts(productResult?.data ?? []);
      setLocations(locationResult?.data ?? []);
      if (!selectedLocationId && (locationResult?.data ?? []).length) {
        setSelectedLocationId((locationResult?.data ?? [])[0].id);
      }
      setError("");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "Sales workspace could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    try {
      setPermissions(JSON.parse(sessionStorage.getItem("shantel_user") ?? "null")?.permissions ?? []);
    } catch {
      setPermissions([]);
    }
    void loadWorkspace();
  }, []);

  const selectedProduct = products.find((product) => product.id === productId);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines]);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  const filteredInvoices = invoices.filter((invoice) => `${invoice.invoiceNumber} ${invoice.customer?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const canCreateInvoice = permissions.includes("invoices.create");
  const canPostInvoice = permissions.includes("invoices.post");

  function addLine() {
    if (!selectedProduct || quantity < 1) return;
    const price = number(selectedProduct.sellingPrice);
    setLines((current) => {
      const existing = current.find((line) => line.productId === selectedProduct.id);
      if (existing) return current.map((line) => line.productId === selectedProduct.id ? { ...line, quantity: line.quantity + quantity } : line);
      return [...current, { productId: selectedProduct.id, productName: selectedProduct.name, sku: selectedProduct.sku, quantity, unitPrice: price }];
    });
    setProductId("");
    setQuantity(1);
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    if (!customerId || !lines.length) {
      setError("Choose a customer and add at least one product.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      const created = await salesService.createInvoice({ customerId, items: lines.map(({ productId: id, quantity: amount, unitPrice }) => ({ productId: id, quantity: amount, unitPrice })) });
      setInvoices((current) => [created, ...current]);
      setLines([]);
      setCustomerId("");
      setMessage(`${created.invoiceNumber} saved as a draft.`);
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Invoice could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePostInvoice(invoiceId: string) {
    if (!selectedLocationId) {
      setError("Choose a stock location before posting the invoice.");
      return;
    }

    try {
      setError("");
      const posted = await salesService.postInvoice(invoiceId, selectedLocationId);
      setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: posted.status ?? invoice.status, totalAmount: posted.totalAmount ?? invoice.totalAmount } : invoice));
      setMessage(`${posted.invoiceNumber} was posted successfully and stock was deducted.`);
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Invoice could not be posted.");
    }
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 border-b border-border-default pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/50 hover:text-primary"><ArrowLeft size={15} /> Dashboard</Link><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Sales desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Turn conversations into orders.</h1><p className="mt-2 text-sm text-foreground/55">Build a draft invoice, keep the customer context close, and post only when stock is ready.</p></div><div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/45"><ShoppingBag size={18} /> {invoices.length} invoices</div>
        </header>

        {error && <div className="mt-6 flex items-center gap-3 border border-border-default bg-primary/8 px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={18} /> {error}</div>}
        {message && <div className="mt-6 flex items-center gap-3 border border-border-default bg-status-success-surface px-4 py-3 text-sm text-muted-foreground"><Check size={18} /> {message}</div>}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {canCreateInvoice && <section className="bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-amber">New transaction</p><h2 className="mt-2 text-2xl font-semibold">Draft an invoice</h2></div><FilePlus2 className="text-brand-amber" /></div>
            <div className="mt-6 rounded-lg border border-border-default bg-background/3 p-3">
              <label className="block"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">Posting location</span><span className="relative mt-2 block"><select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} className="h-11 w-full appearance-none border-b border-border-default bg-transparent pr-8 text-sm outline-none focus:border-primary"><option value="" className="text-foreground">Select location</option>{locations.map((location) => <option key={location.id} value={location.id} className="text-foreground">{location.name}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-0 top-3.5 text-primary-foreground/45" /></span></label>
            </div>
            <form onSubmit={createDraft} className="mt-8">
              <label className="block"><span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground/55">Customer</span><span className="relative mt-2 block"><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-12 w-full appearance-none border-b border-border-default bg-transparent pr-8 text-sm outline-none focus:border-primary"><option value="" className="text-foreground">Choose a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id} className="text-foreground">{customer.name}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-0 top-3.5 text-primary-foreground/45" /></span></label>
              <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_92px_auto]"><label className="relative block"><span className="sr-only">Product</span><select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-12 w-full appearance-none border-b border-border-default bg-transparent pr-7 text-sm outline-none focus:border-primary"><option value="" className="text-foreground">Add a product</option>{products.map((product) => <option key={product.id} value={product.id} className="text-foreground">{product.name} · {money.format(number(product.sellingPrice))}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-0 top-3.5 text-primary-foreground/45" /></label><label><span className="sr-only">Quantity</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-12 w-full border-b border-border-default bg-transparent px-2 text-center text-sm outline-none focus:border-primary" /></label><button type="button" onClick={addLine} className="flex h-12 items-center justify-center gap-2 bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card"><Plus size={17} /> Add</button></div>
              <div className="mt-7 min-h-28 border-t border-border-default">{lines.length ? lines.map((line) => <div key={line.productId} className="flex items-center justify-between border-b border-border-default py-4"><div><p className="text-sm font-semibold">{line.productName}</p><p className="mt-1 text-xs text-primary-foreground/45">{line.sku} · {line.quantity} ×</p><input aria-label={`Unit price for ${line.productName}`} type="number" min="0.01" step="0.01" value={line.unitPrice} onChange={(event) => setLines((current) => current.map((item) => item.productId === line.productId ? { ...item, unitPrice: Number(event.target.value) } : item))} className="mt-1 h-8 w-32 border-b border-border-default bg-transparent text-sm" /></div><div className="flex items-center gap-3"><p className="text-sm font-semibold">{money.format(line.quantity * line.unitPrice)}</p><button type="button" onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="text-primary-foreground/40 hover:text-brand-amber" aria-label={`Remove ${line.productName}`}><Trash2 size={16} /></button></div></div>) : <p className="py-8 text-sm text-primary-foreground/40">Your invoice is empty. Add a product to begin.</p>}</div>
              <div className="mt-5 flex justify-between border-t border-border-default pt-5"><div><p className="text-xs uppercase tracking-[0.15em] text-primary-foreground/45">Estimated total</p><p className="mt-1 text-2xl font-semibold">{money.format(total)}</p></div><button type="submit" disabled={isSaving || !lines.length || !customerId} className="self-end bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-35">{isSaving ? "Saving..." : "Save draft"}</button></div>
            </form>
          </section>}

          <section className="bg-card p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Document flow</p><h2 className="mt-2 text-2xl font-semibold">Recent invoices</h2></div><span className="text-xs text-foreground/40">Drafts stay safe</span></div><div className="relative mt-6"><Search size={17} className="absolute left-0 top-3 text-foreground/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer" className="h-11 w-full border-b border-border-default bg-transparent pl-7 text-sm outline-none focus:border-primary" /></div><div className="mt-4 divide-y divide-[#172B4D]/10">{isLoading ? <p className="py-8 text-sm text-foreground/50">Loading invoices...</p> : filteredInvoices.length ? filteredInvoices.slice(0, 8).map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-foreground/45">{invoice.customer?.name} · {new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}</p></div><div className="text-right"><p className="text-sm font-semibold">{money.format(number(invoice.totalAmount))}</p><StatusBadge status={invoice.status} className="mt-1" />{canPostInvoice && invoice.status === "DRAFT" && <button type="button" onClick={() => void handlePostInvoice(invoice.id)} className="mt-2 block rounded bg-primary px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-card">Post</button>}</div></div>) : <div className="py-10 text-center"><p className="text-sm text-foreground/50">No invoices yet.</p><p className="mt-1 text-xs text-foreground/35">Your first draft will appear here.</p></div>}</div></section>
        </div>
      </div>
      </main>
    </>
  );
}
