"use client";

import { useId } from "react";

type Option = { label: string; value: string };
export function FormField({ label, type = "text", placeholder, value, onChange, error, required, disabled, options, className = "", helpText }: { label: string; type?: "text" | "email" | "password" | "number" | "date" | "textarea" | "select"; placeholder?: string; value: string | number; onChange: (value: string) => void; error?: string | null; required?: boolean; disabled?: boolean; options?: Option[]; className?: string; helpText?: string }) {
  const controlId = useId();
  const descriptionId = `${controlId}-description`;
  const baseClasses = "h-11 w-full border border-border-subtle bg-surface px-3 text-body text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-disabled rounded-md";
  const errorClasses = error ? "border-danger focus:border-danger focus:ring-danger/25" : "";
  const classes = `${baseClasses} ${errorClasses}`;

  return <div className={`space-y-2 ${className}`}><label htmlFor={controlId} className="text-label font-medium text-text-primary">{label}{required ? <span className="text-danger"> *</span> : null}</label>{type === "textarea" ? <textarea id={controlId} aria-describedby={error || helpText ? descriptionId : undefined} aria-invalid={Boolean(error)} className={`${classes} min-h-24 py-2.5`} placeholder={placeholder} value={value} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} disabled={disabled} /> : type === "select" ? <select id={controlId} aria-describedby={error || helpText ? descriptionId : undefined} aria-invalid={Boolean(error)} className={classes} value={value} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)} disabled={disabled}><option value="">{placeholder ?? "Select"}</option>{options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input id={controlId} aria-describedby={error || helpText ? descriptionId : undefined} aria-invalid={Boolean(error)} className={classes} type={type} placeholder={placeholder} value={value} onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} disabled={disabled} />}{error ? <p id={descriptionId} className="text-caption text-danger" role="alert">{error}</p> : helpText ? <p id={descriptionId} className="text-caption text-text-muted">{helpText}</p> : null}</div>;
}
