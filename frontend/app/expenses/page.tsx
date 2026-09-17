"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, LoadingState } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Option = { id: string; name: string };
type Expense = { id: string; expenseNumber?: string; status?: string; description?: string; amount?: number | string };

const unwrap = (response: any) => {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Option[]>([]);
  const [form, setForm] = useState({ categoryId: "", paymentMethodId: "", description: "", amount: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [expenseResponse, optionResponse] = await Promise.all([
        apiClient.get("/approvals/expenses?page=1&limit=100"),
        apiClient.get("/approvals/expenses/options"),
      ]);
      setExpenses(unwrap(expenseResponse));
      const options = unwrap(optionResponse);
      setCategories(options.categories ?? []);
      setPaymentMethods(options.paymentMethods ?? []);
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Expenses could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError("");
      const created = unwrap(await apiClient.post("/approvals/expenses", { ...form, amount: Number(form.amount) }));
      setMessage(`${created.expenseNumber} created with amount TSh ${Number(created.amount).toLocaleString()}.`);
      setForm({ categoryId: "", paymentMethodId: "", description: "", amount: "" });
      setShowForm(false);
      await load();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Expense could not be created.");
    }
  }

  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-default pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Finance desk</p>
              <h1 className="mt-2 text-4xl font-semibold">Expenses</h1>
              <p className="mt-2 text-sm text-foreground/55">Track operational expenses through controlled submission and approval.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void load()} className="flex items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase">
                <RefreshCw size={15} /> Refresh
              </button>
              <button type="button" onClick={() => setShowForm((visible) => !visible)} className="flex items-center gap-2 bg-primary px-4 py-2 text-xs font-semibold uppercase text-white">
                <Plus size={15} /> New expense
              </button>
            </div>
          </header>

          {error && <div className="mt-5"><AlertBanner>{error}</AlertBanner></div>}
          {message && <div className="mt-5"><AlertBanner tone="success">{message}</AlertBanner></div>}

          {showForm && (
            <form onSubmit={createExpense} className="mt-7 grid gap-4 bg-primary p-5 text-white sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                Category
                <select required aria-label="Expense category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="mt-2 h-11 w-full bg-card px-3 text-sm font-normal normal-case tracking-normal text-foreground">
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                Payment method
                <select required aria-label="Expense payment method" value={form.paymentMethodId} onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })} className="mt-2 h-11 w-full bg-card px-3 text-sm font-normal normal-case tracking-normal text-foreground">
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75 sm:col-span-2">
                Description
                <input required aria-label="Expense description" placeholder="What was this expense for?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 h-11 w-full bg-card px-3 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-foreground/50" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                Amount (TSh)
                <input required min="0.01" step="0.01" type="number" aria-label="Expense amount" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-2 h-11 w-full bg-card px-3 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-foreground/50" />
              </label>
              <button type="submit" className="h-11 self-end bg-card px-4 text-xs font-semibold uppercase text-foreground">Create expense</button>
            </form>
          )}

          <section className="mt-8 bg-card p-5">
            <h2 className="text-xl font-semibold">Expense register</h2>
            {loading ? <LoadingState message="Loading expenses..." /> : <div className="mt-4 divide-y divide-[#172B4D]/10">{expenses.map((expense) => <article key={expense.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{expense.expenseNumber ?? expense.id}</p><p className="text-xs uppercase text-foreground/50">{expense.status} · {expense.description}</p></div><p className="font-semibold">TSh {Number(expense.amount ?? 0).toLocaleString()}</p></article>)}</div>}
          </section>
        </div>
      </main>
    </>
  );
}
