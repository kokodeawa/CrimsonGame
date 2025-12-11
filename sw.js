
const CACHE_NAME = 'crimson-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Attempt to cache all, but don't fail installation if one fails (like manifest icons)
        return Promise.all(
            urlsToCache.map(url => {
                return cache.add(url).catch(err => {
                    console.warn('Failed to cache:', url, err);
                });
            })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                if (event.request.url.startsWith('http')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
        }).catch(error => {
            console.error("Fetch failed:", error);
            // Optionally return a fallback page here
             return new Response("Offline (Network Error)", {
                 status: 503,
                 headers: { 'Content-Type': 'text/plain' }
             });
        });
      })
  );
});
