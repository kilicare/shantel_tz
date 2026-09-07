import { LoaderCircle } from "lucide-react";
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) { return <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-text-muted"><LoaderCircle className="size-7 animate-spin text-brand-amber" /><p className="text-sm">{message}</p></div>; }
