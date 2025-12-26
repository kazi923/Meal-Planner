// Always‑fresh service worker
// Ensures CSS, JS, and HTML are never stale

self.addEventListener('install', event => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

// Always fetch the latest version of every file
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});