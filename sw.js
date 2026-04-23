// LogosChallenge Service Worker
const CACHE_NAME = "logoschallenge-v2";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // ⚠️ Ne jamais intercepter POST/PATCH/DELETE ou les appels API/Supabase/Auth
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("openrouter.ai") ||
    url.hostname.includes("accounts.google.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    return; // Laisser passer sans intercepter
  }

  // Network first pour les pages, cache en fallback
  event.respondWith(
    fetch(req)
      .then(response => {
        if (response.ok && req.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match("/")))
  );
});
