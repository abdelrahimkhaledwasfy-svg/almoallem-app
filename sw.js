// ==================== نسخة الأبليكشن على الموبايل ====================
// قبل كده الملف ده كان بيفتح النسخة المحفوظة من index.html على طول ومايسألش عن الجديدة،
// فأي تحديث للأبليكشن ماكانش بيوصل للموبايلات. دلوقتي: لو فيه نت بنجيب أحدث نسخة دايمًا،
// والمحفوظة بتتستخدم بس لو النت مقطوع.
const CACHE_NAME = 'almoallem-app-v3';
const CORE_ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(CORE_ASSETS.map(function(a) { return new Request(a, { cache: 'reload' }); })); }).catch(function() {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            // نمسح أي نسخة قديمة محفوظة (v2 وقبلها)
            return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
        }).then(function() { return self.clients.claim(); }).then(function() {
            // أي شاشة مفتوحة على النسخة القديمة بتتحدث لوحدها مرة واحدة
            return self.clients.matchAll({ type: 'window' }).then(function(list) {
                list.forEach(function(c) { try { c.navigate(c.url); } catch (e) {} });
            });
        })
    );
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    var isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
    if (isPage) {
        // الصفحة نفسها: من النت الأول (أحدث نسخة)، ولو مفيش نت من المحفوظ
        event.respondWith(
            fetch(req, { cache: 'no-store' }).then(function(res) {
                if (res && res.ok) { var copy = res.clone(); caches.open(CACHE_NAME).then(function(c) { c.put('./index.html', copy); }); }
                return res;
            }).catch(function() { return caches.match('./index.html'); })
        );
        return;
    }
    if (CORE_ASSETS.some(function(a) { return url.pathname.endsWith(a.replace('./', '')); })) {
        event.respondWith(caches.match(req).then(function(cached) { return cached || fetch(req); }));
    }
});

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

messaging.onBackgroundMessage(function(payload) {
    var n = payload.notification || {};
    self.registration.showNotification(n.title || 'المعلم', {
        body: n.body || '',
        icon: n.icon || './icon-192.png',
        badge: './icon-192.png',
        tag: 'almoallem',
        data: { url: n.click_action || './' }
    });
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    var url = event.notification.data && event.notification.data.url ? event.notification.data.url : './';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
