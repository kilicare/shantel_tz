"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, RefreshCw, RotateCcw, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { AlertBanner, EmptyState, LoadingState, ShantelCard, StatusBadge } from "@/components/ShantelPrimitives";
import { apiClient } from "@/lib/api-client";

type Approval = { id: string; documentType: string; documentId: string; approvalStep: number; approvalDecision: string };
type User = { id: string; name: string; email: string };
type Expense = { id: string; expenseNumber: string; description?: string; status?: string };
type HistoryEntry = { step: number; decision: string; approver?: string; actedBy?: string; actedAt?: string; comments?: string };
type History = { completedSteps: number; totalSteps: number; history: HistoryEntry[] };

function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

function apiMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message || fallback;
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Approval[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [approverId, setApproverId] = useState("");
  const [comment, setComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const selectableUsers = users.filter((user) => user.id !== currentUserId);
  const [historyId, setHistoryId] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      apiClient.get("/approvals/pending?page=1&limit=100"),
      apiClient.get("/users?page=1&limit=100"),
      apiClient.get("/approvals/expenses?page=1&limit=100"),
    ]);
    const pendingResult = results[0];
    if (pendingResult.status === "fulfilled") setPending(unwrap(pendingResult.value));
    else setError("Approval queue could not be loaded.");
    if (results[1].status === "fulfilled") setUsers(unwrap(results[1].value));
    if (results[2].status === "fulfilled") setExpenses(unwrap(results[2].value));
    setLoading(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawUser = window.sessionStorage.getItem("shantel_user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      setCurrentUserId(parsedUser?.id ?? "");
    } catch {
      setCurrentUserId("");
    }
  }, []);

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError(""); setSuccess("");
      await apiClient.post("/approvals/submit", { documentType: "EXPENSE", documentId, approverIds: [approverId], notes: comment || undefined });
      setSuccess("Document submitted for approval.");
      setComment("");
      await load();
    } catch (requestError: any) {
      setError(apiMessage(requestError, "Document could not be submitted."));
    }
  }

  async function decide(approval: Approval, action: "approve" | "reject" | "return-for-correction") {
    try {
      setError(""); setSuccess("");
      const body = {
        documentType: approval.documentType,
        documentId: approval.documentId,
        approvalStep: approval.approvalStep,
        ...(action === "approve" ? { comments: comment } : action === "reject" ? { rejectionReason: comment } : { correctionReason: comment }),
      };
      await apiClient.patch(`/approvals/${action}`, body);
      const label = action === "return-for-correction" ? "returned for correction" : action === "reject" ? "rejected" : "approved";
      setSuccess(`Document ${label}.`);
      setComment("");
      await load();
    } catch (requestError: any) {
      setError(apiMessage(requestError, `Document could not be ${action}.`));
    }
  }

  async function loadHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError("");
      setHistory(unwrap(await apiClient.get(`/approvals/document/EXPENSE/${historyId}/history`)));
    } catch (requestError: any) {
      setError(apiMessage(requestError, "Approval history could not be loaded."));
    }
  }

  return <>
    <WorkspaceNavigation />
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-border-default pb-7 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Control room</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Approvals</h1><p className="mt-2 text-sm text-muted-foreground">Submit decisions, record accountability, and keep document history visible.</p></div>
          <button type="button" onClick={() => void load()} className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]"><RefreshCw size={15} /> Refresh</button>
        </header>
        {error && <div className="mt-6"><AlertBanner>{error}</AlertBanner></div>}
        {success && <div className="mt-6"><AlertBanner tone="success">{success}</AlertBanner></div>}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Submit</p><h2 className="mt-2 text-2xl font-semibold">Send for approval</h2><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Expense<select required value={documentId} onChange={(event) => setDocumentId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select document</option>{expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.expenseNumber} · {expense.description} · {expense.status}</option>)}</select></label><label className="block text-sm font-medium">Approver<select required value={approverId} onChange={(event) => setApproverId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 text-sm"><option value="">Select approver</option>{selectableUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label><label className="block text-sm font-medium">Comment<input value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 py-2 text-sm" /></label><button type="submit" className="w-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">Submit for approval</button></form></ShantelCard>
          <ShantelCard className="p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pending queue</p><h2 className="mt-2 text-2xl font-semibold">Your decisions</h2></div><span className="text-xs text-muted-foreground">{pending.length} items</span></div>{loading ? <LoadingState message="Loading approvals..." /> : pending.length === 0 ? <div className="mt-5"><EmptyState title="No pending approvals" /></div> : <div className="mt-5 divide-y divide-border-default">{pending.map((approval) => <div key={approval.id} className="py-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{approval.documentType}</p><StatusBadge status={approval.approvalDecision} /></div><p className="mt-1 text-xs text-muted-foreground">Step {approval.approvalStep} · {approval.documentId}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void decide(approval, "approve")} className="flex items-center gap-1 border border-border-default px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"><Check size={14} /> Approve</button><button type="button" onClick={() => void decide(approval, "reject")} className="flex items-center gap-1 border border-border-default px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"><X size={14} /> Reject</button><button type="button" onClick={() => void decide(approval, "return-for-correction")} className="flex items-center gap-1 border border-border-default px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"><RotateCcw size={14} /> Return</button></div></div>)}</div>}</ShantelCard>
          <ShantelCard className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Audit trail</p><h2 className="mt-2 text-2xl font-semibold">Document history</h2><form onSubmit={loadHistory} className="mt-6 space-y-4"><label className="block text-sm font-medium">Expense ID<input required value={historyId} onChange={(event) => setHistoryId(event.target.value)} className="mt-2 h-11 w-full border border-border-default bg-card px-3 py-2 text-sm" /></label><button type="submit" className="w-full border border-border-default px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em]">Load history</button></form>{history && <div className="mt-5 border-t border-border-default pt-4 text-xs"><p>{history.completedSteps}/{history.totalSteps} completed</p>{history.history?.map((entry, index) => <p key={`${entry.step}-${entry.decision}-${entry.actedAt ?? index}`} className="mt-2">Step {entry.step}: {entry.decision} · {entry.approver ?? "Unknown"} · {entry.actedBy ?? "Pending"}{entry.comments ? ` · ${entry.comments}` : ""}</p>)}</div>}</ShantelCard>
        </section>
      </div>
    </main>
  </>;
}
