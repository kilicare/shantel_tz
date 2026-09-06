const CACHE_NAME = "shantel-v1";
const OFFLINE_URL = "/offline.html";
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", OFFLINE_URL, "/manifest.json", "/icons/icon.svg"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") void self.skipWaiting(); });
self.addEventListener("fetch", (event) => { if (event.request.method !== "GET") return; const request = event.request; event.respondWith(fetch(request).then((response) => { if (response.ok && new URL(request.url).origin === self.location.origin) { const copy = response.clone(); void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)); } return response; }).catch(() => caches.match(request).then((cached) => cached ?? (request.mode === "navigate" ? caches.match(OFFLINE_URL) : new Response("Offline", { status: 503 }))))); });
