"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
export function UpdatePrompt() { const { updateAvailable, update } = usePWA(); return updateAvailable ? <div className="fixed bottom-4 left-4 z-50 border bg-primary p-4 text-primary-foreground shadow-xl"><p className="font-semibold">Update available</p><p className="mt-1 text-sm opacity-80">Reload to use the latest workspace.</p><Button className="mt-3" variant="secondary" size="sm" onClick={update}><RefreshCw /> Update now</Button></div> : null; }
