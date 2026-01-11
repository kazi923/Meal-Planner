const CACHE_NAME = "meal-planner-cache-v1";

const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "storage.js",
  "background.jpg",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Install: cache all core files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
});

// Fetch: serve from cache first, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});