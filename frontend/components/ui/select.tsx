import type { SelectHTMLAttributes } from "react";
import { cn } from "cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-md border border-border-subtle bg-surface px-3 text-body text-text-primary outline-none transition-colors focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-disabled",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
