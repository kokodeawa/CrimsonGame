
const CACHE_NAME = 'crimson-pwa-v13-fix-crash';

// Files we want to cache immediately on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: Pre-cache critical files
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force new SW to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch(err => {
            console.error('Pre-cache failed:', err);
        });
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// Fetch: Hybrid Strategy
self.addEventListener('fetch', (event) => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Strategy 1: For HTML Navigation (index.html) -> Network First, Fallback to Cache
  // This ensures the user gets game updates if online, but works offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        })
        .catch(() => {
            // If offline, return the cached index.html
            return caches.match('./index.html').then(response => {
                return response || caches.match(event.request);
            });
        })
    );
    return;
  }

  // Strategy 2: For Assets (JS, CSS, Images, Audio) -> Cache First, Fallback to Network
  // This makes the game load instantly.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Validate response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(err => {
          // Swallow errors for non-critical assets to prevent crashes
          // console.log('Fetch failed for', event.request.url);
      });
    })
  );
});
