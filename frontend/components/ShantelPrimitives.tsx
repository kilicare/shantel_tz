import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from "lucide-react";

import { cn } from "cn";

type Surface = "card" | "muted" | "feature";

export function ShantelCard({ className, surface = "card", ...props }: HTMLAttributes<HTMLDivElement> & { surface?: Surface }) {
  const surfaces: Record<Surface, string> = {
    card: "bg-surface-card text-text-primary",
    muted: "bg-surface-muted text-text-primary",
    feature: "bg-surface-feature text-text-inverse",
  };

  return <div className={cn("border border-border-subtle", surfaces[surface], className)} {...props} />;
}

const statusStyles = {
  success: "border-status-success-border bg-status-success-surface text-status-success-text",
  warning: "border-status-warning-border bg-status-warning-surface text-status-warning-text",
  danger: "border-status-danger-border bg-status-danger-surface text-status-danger-text",
  info: "border-status-info-border bg-status-info-surface text-status-info-text",
  pending: "border-status-pending-border bg-status-pending-surface text-status-pending-text",
  neutral: "border-border-default bg-surface-muted text-text-secondary",
} as const;

type StatusTone = keyof typeof statusStyles;
type StatusBadgeProps = { status: string; tone?: StatusTone; className?: string };

function inferStatusTone(status: string): StatusTone {
  const normalized = status.toUpperCase();
  if (["PAID", "ACTIVE", "COMPLETED", "APPROVED", "POSTED", "CONVERTED", "SUCCESS"].includes(normalized)) return "success";
  if (["DRAFT", "PENDING", "SUBMITTED", "IN_PROGRESS", "UNPAID", "LOW STOCK"].includes(normalized)) return "pending";
  if (["CANCELLED", "REJECTED", "FAILED", "OUT OF STOCK", "INACTIVE"].includes(normalized)) return "danger";
  if (["INFO", "RECEIVED"].includes(normalized)) return "info";
  return "neutral";
}

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]", statusStyles[tone ?? inferStatusTone(status)], className)}><StatusDot tone={tone ?? inferStatusTone(status)} />{status.replaceAll("_", " ")}</span>;
}

export function StatusDot({ tone = "neutral", className }: { tone?: StatusTone; className?: string }) {
  return <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", className)} />;
}

export function AlertBanner({ tone = "danger", children, className }: { tone?: Exclude<StatusTone, "neutral" | "pending">; children: ReactNode; className?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 border px-4 py-3 text-sm", statusStyles[tone], className)}><Icon className="mt-0.5 size-4 shrink-0" />{children}</div>;
}

export function KpiCard({ label, value, note, accent = "amber", icon: Icon }: { label: string; value: ReactNode; note?: ReactNode; accent?: "amber" | "teal" | "gold" | "terracotta"; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  const accents = { amber: "bg-brand-amber", teal: "bg-brand-teal", gold: "bg-brand-gold", terracotta: "bg-brand-terracotta" };
  return <ShantelCard className="relative overflow-hidden p-5"><div className={cn("absolute inset-x-0 top-0 h-1", accents[accent])} /><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>{Icon ? <Icon size={19} className="text-text-muted" /> : null}</div><p className="mt-8 text-2xl font-semibold tracking-[-0.04em]">{value}</p>{note ? <p className="mt-2 text-xs text-text-muted">{note}</p> : null}</ShantelCard>;
}

export function ChartFrame({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return <ShantelCard surface="feature" className={cn("overflow-hidden p-6 sm:p-7", className)}><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-amber">Analytics</p><h2 className="mt-2 text-xl font-semibold">{title}</h2>{description ? <p className="mt-2 max-w-lg text-sm leading-6 text-text-inverse/60">{description}</p> : null}</div><div className="mt-6">{children}</div></ShantelCard>;
}

export function EmptyState({ title = "Nothing here yet", description }: { title?: string; description?: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center border border-dashed border-border-default px-6 py-10 text-center"><p className="text-sm font-semibold text-text-primary">{title}</p>{description ? <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p> : null}</div>;
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-text-muted"><LoaderCircle className="size-7 animate-spin text-brand-amber" /><p className="text-sm">{message}</p></div>;
}