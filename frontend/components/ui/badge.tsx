import type { HTMLAttributes } from "react";
import { cn } from "cn";

const badgeVariants = {
  default: "border-border-default bg-surface-muted text-text-secondary",
  primary: "border-brand-primary bg-brand-primary text-primary-foreground",
  success: "border-success bg-success-soft text-success-text",
  warning: "border-warning bg-warning-soft text-warning-text",
  danger: "border-danger bg-danger-soft text-danger-text",
  info: "border-info bg-info-soft text-info-text",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

export function Badge({ className, variant = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label font-semibold uppercase tracking-wide", badgeVariants[variant], className)} {...props} />;
}
