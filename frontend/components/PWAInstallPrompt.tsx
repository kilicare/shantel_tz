"use client";

import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
export function PWAInstallPrompt() { const { canInstall, install, isInstalled } = usePWA(); const [dismissed, setDismissed] = useState(false); if (!canInstall || isInstalled || dismissed) return null; return <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] border bg-card p-4 shadow-xl"><div className="flex gap-3"><div className="flex-1"><p className="font-semibold">Install SHANTEL</p><p className="mt-1 text-sm text-muted-foreground">Keep your operations desk one tap away.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void install()}><Download /> Install</Button><Button size="sm" variant="outline" onClick={() => setDismissed(true)}>Dismiss</Button></div></div><button aria-label="Dismiss install prompt" onClick={() => setDismissed(true)}><X className="size-4" /></button></div></div>; }
