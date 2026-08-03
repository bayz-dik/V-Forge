// V-Forge Service Worker
// Ganti angka versi ini tiap kali ada update besar, biar cache lama dibuang otomatis
const CACHE_VERSION = 'vforge-v4-0-1-project-history-hotfix';

const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css?v=4.0.1',
  './js/firebase-config.js?v=4.0.1',
  './js/app.js?v=4.0.1',
  './js/projects.js?v=4.0.1',
  './js/auth.js?v=4.0.1',
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

// FETCH: navigasi memakai network-first agar update UI tidak tertahan cache lama.
// Asset lokal lain memakai stale-while-revalidate agar aplikasi tetap cepat.
self.addEventListener('fetch', (event) => {
  // Jangan cache request ke domain luar (font, unsplash, dll) — biarkan langsung ke network
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put('./index.html', networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
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
