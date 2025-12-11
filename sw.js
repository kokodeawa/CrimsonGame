
const CACHE_NAME = 'crimson-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error("Cache install failed:", err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(error => {
            // Return a fallback or just log error to prevent crash
            console.error("Fetch failed:", error);
            return new Response("Network error", { status: 408, headers: { "Content-Type": "text/plain" } });
        });
      })
  );
});
