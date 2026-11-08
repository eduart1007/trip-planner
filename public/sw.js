// Trip Planner service worker.
// It saves the app's own files, so the app opens quickly and also without a connection.
// It never touches maps, routes, search, weather or account requests.
const VERSION = "v1";
const CACHE = `app-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/offline.html", "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // other websites are never touched
  if (url.pathname.startsWith("/api/")) return;

  // The page: the internet first, the saved copy when you are offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === "/") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match("/")) || (await cache.match("/offline.html")) || Response.error();
        })
    );
    return;
  }

  // The app's own files: the saved copy first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const saved = await cache.match(request);
        if (saved) return saved;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
