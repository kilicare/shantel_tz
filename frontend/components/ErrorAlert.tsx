"use client";

import { AlertCircle, X } from "lucide-react";
export function ErrorAlert({ error, onDismiss }: { error: string | null; onDismiss?: () => void }) { if (!error) return null; return <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span>{onDismiss ? <button onClick={onDismiss} aria-label="Dismiss error"><X className="size-4" /></button> : null}</div>; }
