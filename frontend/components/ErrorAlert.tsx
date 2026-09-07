"use client";

import { AlertCircle, X } from "lucide-react";
export function ErrorAlert({ error, onDismiss }: { error: string | null; onDismiss?: () => void }) { if (!error) return null; return <div role="alert" className="flex items-start gap-3 border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span>{onDismiss ? <button onClick={onDismiss} aria-label="Dismiss error" className="rounded-sm p-1 hover:bg-status-danger-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-focus"><X className="size-4" /></button> : null}</div>; }
