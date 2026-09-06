"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => { const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true; setIsInstalled(standalone); setIsOnline(navigator.onLine); const online = () => setIsOnline(true); const offline = () => setIsOnline(false); window.addEventListener("online", online); window.addEventListener("offline", offline); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); }; }, []);
  useEffect(() => { const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallEvent); }; const installed = () => { setIsInstalled(true); setInstallPrompt(null); }; window.addEventListener("beforeinstallprompt", capture); window.addEventListener("appinstalled", installed); return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed); }; }, []);
  useEffect(() => { if (!("serviceWorker" in navigator)) return; let registration: ServiceWorkerRegistration | undefined; let interval: ReturnType<typeof setInterval>; void navigator.serviceWorker.register("/service-worker.js").then((next) => { registration = next; interval = setInterval(() => void registration?.update(), 60000); registration.addEventListener("updatefound", () => { const worker = registration?.installing; worker?.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateAvailable(true); }); }); }).catch(() => undefined); return () => { if (interval) clearInterval(interval); }; }, []);
  return { isInstalled, installPrompt, canInstall: Boolean(installPrompt), isOnline, updateAvailable, install: async () => { if (!installPrompt) return; await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === "accepted") setInstallPrompt(null); }, update: () => { navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" }); window.location.reload(); } };
}
