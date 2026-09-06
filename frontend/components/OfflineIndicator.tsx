"use client";

import { WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
export function OfflineIndicator() { const { isOnline } = usePWA(); return isOnline ? null : <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"><WifiOff className="size-4" /> You are offline. Cached pages remain available.</div>; }
