"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, RefreshCw, Upload, X } from "lucide-react";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { apiClient } from "@/lib/api-client";
import { ShantelLoadingOverlay } from "@/components/ShantelLoadingOverlay";
import { useNavigationLoading } from "@/hooks/useNavigationLoading";

type Adjustment = {
  id: string;
  adjustmentNumber: string;
  status: string;
  reason: string;
  location?: { name?: string };
};
function unwrap(response: any) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return payload?.data ?? payload ?? [];
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isNavigating = useNavigationLoading();
  async function load() {
    try {
      setError("");
      setAdjustments(
        unwrap(await apiClient.get("/inventory/adjustments?page=1&limit=50")),
      );
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(
        Array.isArray(apiMessage)
          ? apiMessage[0]
          : apiMessage || "Adjustments could not be loaded.",
      );
    }
  }
  useEffect(() => {
    try {
      setPermissions(
        JSON.parse(sessionStorage.getItem("shantel_user") ?? "null")
          ?.permissions ?? [],
      );
    } catch {
      setPermissions([]);
    }
    void load();
  }, []);
  async function changeStatus(
    id: string,
    action: "approve" | "post" | "reject",
  ) {
    try {
      setError("");
      const userId = JSON.parse(
        sessionStorage.getItem("shantel_user") ?? "null",
      )?.id;
      const response = await apiClient.patch(
        `/inventory/adjustments/${id}/${action}`,
        action === "reject" ? {} : { userId },
      );
      const result = unwrap(response);
      setMessage(
        `${result.adjustmentNumber ?? "Adjustment"} is now ${result.status}.`,
      );
      await load();
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setError(
        Array.isArray(apiMessage)
          ? apiMessage[0]
          : apiMessage || `Adjustment could not be ${action}d.`,
      );
    }
  }
  const canApprove = permissions.includes("inventory.approve_adjust");
  return (
    <>
      <WorkspaceNavigation />
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-end justify-between border-b border-border-default pb-8">
            <div>
              <p className="text-label font-semibold uppercase tracking-wider text-blue-primary">
                Inventory control
              </p>
              <h1 className="mt-2 text-h1 font-semibold tracking-tight">
                Stock adjustments
              </h1>
              <p className="mt-2 text-body text-text-muted">
                Approve and post physical-count corrections with an accountable
                trail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-2 border border-border-default px-4 py-2.5 text-label font-semibold uppercase tracking-wide hover:bg-surface-hover"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </header>
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-3 border border-border-default bg-primary/8 px-4 py-3 text-sm text-muted-foreground"
            >
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {message && (
            <div
              role="status"
              className="mt-6 border border-border-default bg-status-success-surface px-4 py-3 text-sm text-muted-foreground"
            >
              {message}
            </div>
          )}
          <section className="mt-8 bg-card p-6">
            <div className="divide-y divide-[#172B4D]/10">
              {adjustments.length ? (
                adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-5"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {adjustment.adjustmentNumber}
                      </p>
                      <p className="mt-1 text-xs text-foreground/45">
                        {adjustment.location?.name} · {adjustment.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-caption font-semibold uppercase tracking-wide text-blue-primary">
                        {adjustment.status}
                      </span>
                      {canApprove && adjustment.status === "DRAFT" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void changeStatus(adjustment.id, "reject")
                            }
                            className="flex items-center gap-2 border border-danger px-3 py-2 text-caption font-semibold uppercase tracking-wide text-danger-text"
                          >
                            <X size={14} /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void changeStatus(adjustment.id, "approve")
                            }
                            className="flex items-center gap-2 bg-brand-primary px-3 py-2 text-caption font-semibold uppercase tracking-wide text-white"
                          >
                            <Check size={14} /> Approve
                          </button>
                        </>
                      )}
                      {canApprove && adjustment.status === "SUBMITTED" && (
                        <button
                          type="button"
                          onClick={() =>
                            void changeStatus(adjustment.id, "post")
                          }
                          className="flex items-center gap-2 border border-border-default px-3 py-2 text-caption font-semibold uppercase tracking-wide"
                        >
                          <Upload size={14} /> Post
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-foreground/50">
                  No adjustments found.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      
      <ShantelLoadingOverlay isVisible={isNavigating} message="Loading..." />
    </>
  );
}
