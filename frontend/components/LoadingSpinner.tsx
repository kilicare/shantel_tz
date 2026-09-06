import { LoaderCircle } from "lucide-react";
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) { return <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"><LoaderCircle className="size-7 animate-spin text-primary" /><p className="text-sm">{message}</p></div>; }
