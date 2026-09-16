const CACHE_NAME = "shantel-v2";
const OFFLINE_URL = "/offline.html";
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
		for (const asset of [OFFLINE_URL, "/manifest.json", "/icons/icon.svg"]) {
			try {
				const response = await fetch(asset);
				if (response.ok) await cache.put(asset, response);
			} catch {}
		}
	}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("shantel-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") void self.skipWaiting(); });
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	const request = event.request;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith((async () => {
		try {
			const response = await fetch(request);
			if (response.ok && (request.mode === "navigate" || ["script", "style", "image", "font"].includes(request.destination))) {
				const copy = response.clone();
				void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
			}
			return response;
		} catch {
			const cached = await caches.match(request);
			if (cached) return cached;
			if (request.mode === "navigate") return caches.match(OFFLINE_URL);
			return new Response("Offline", { status: 503 });
		}
	})());
});
