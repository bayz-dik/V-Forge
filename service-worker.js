// V-Forge Service Worker
// Ganti angka versi ini tiap kali ada update besar, biar cache lama dibuang otomatis
const CACHE_VERSION = 'vforge-v1';

const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALL: simpan file-file penting ke cache begitu service worker terpasang
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVATE: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// FETCH: strategi "cache first, lalu update di background" (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // Jangan cache request ke domain luar (font, unsplash, dll) — biarkan langsung ke network
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // kalau offline & gak ada di cache, gagal senyap

      return cachedResponse || fetchPromise;
    })
  );
});
