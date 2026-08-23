const CACHE_NAME = 'almoallem-app-v2';
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

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (CORE_ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '')))) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
    }
});

/* =========================================================================
   إشعارات Firebase (Background)
   ========================================================================= */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCypCZMxYLYCOtQZSCVdQFdf1STPxBKzlc",
    authDomain: "almoallem-system.firebaseapp.com",
    projectId: "almoallem-system",
    messagingSenderId: "451766637006",
    appId: "1:451766637006:web:f4a727eb92ef24df0fdb9f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'المعلم', {
        body: n.body || '',
        icon: n.icon || './icon-192.png',
        badge: './icon-192.png',
        tag: 'almoallem',
        data: { url: n.click_action || './' }
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || './';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
