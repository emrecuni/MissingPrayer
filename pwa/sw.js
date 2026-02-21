const CACHE = 'kaza-namaz-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '🕌 Namaz Vakti', {
      body: data.body || 'Kaza namazınızı kılmayı unutmayın!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'prayer',
      actions: [
        { action: 'kilindi', title: '✅ Kıldım' },
        { action: 'sonra', title: '⏰ Sonra Hatırlat' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'kilindi') {
    // Ana uygulamaya mesaj gönder
    clients.matchAll({ type: 'window' }).then(cs => {
      cs.forEach(c => c.postMessage({ type: 'PRAYER_DONE', tag: e.notification.tag }));
    });
  }
  e.waitUntil(clients.openWindow('/'));
});
