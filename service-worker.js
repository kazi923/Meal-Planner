// service-worker.js
const CACHE_NAME = 'meal-planner-v3';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const RUNTIME_CACHE = 'meal-planner-runtime-v1';
const OFFLINE_PAGE = './index.html'; // fallback for navigation requests

// Utility to limit cache size (optional)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Install event: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch event: respond with cache-first for core, stale-while-revalidate for runtime, and offline fallback for navigation
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Serve core assets from cache first
  if (CORE_ASSETS.includes(url.pathname) || CORE_ASSETS.includes(url.href)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => caches.match(OFFLINE_PAGE));
        })
      )
    );
    return;
  }

  // Navigation requests: try network first, fallback to cache (offline page)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Put a copy in runtime cache for future offline use
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Images and other runtime assets: stale-while-revalidate
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then(response => {
            if (response && response.ok) {
              cache.put(request, response.clone());
              // optional: trim cache size
              trimCache(RUNTIME_CACHE, 60).catch(() => {});
            }
            return response;
          })
          .catch(() => null);

        // Return cached if available immediately, otherwise wait for network
        return cached || networkFetch || Promise.reject('no-response');
      })
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).catch(() => null))
  );
});

// Listen for skipWaiting message from the page to activate new SW immediately
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});