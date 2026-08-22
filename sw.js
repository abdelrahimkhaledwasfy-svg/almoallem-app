const CACHE_NAME = 'almoallem-app-v1';
const CORE_ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

// Network-first for navigation/data, cache-first for static shell assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (CORE_ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '')))) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    }
    // Firebase/network requests: let them pass through normally (no offline order support)
});
