"use client";

import { WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function OfflineIndicator() {
	const { isOnline } = usePWA();

	if (isOnline) return null;

	return (
		<div
			className="fixed inset-x-4 top-4 z-50 flex items-start gap-3 rounded-xl border border-warning/50 bg-surface px-4 py-3 text-text-primary shadow-elevation-3 sm:left-auto sm:right-6 sm:max-w-sm"
			role="status"
			aria-live="polite"
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
				<WifiOff className="size-4" aria-hidden="true" />
			</span>
			<span className="min-w-0">
				<span className="block text-label font-semibold">You are offline</span>
				<span className="mt-0.5 block text-small text-text-muted">Cached pages remain available while you reconnect.</span>
			</span>
		</div>
	);
}
