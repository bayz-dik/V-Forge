// V-Forge Service Worker — v9.1.3
// Mobile workspace, preview zoom, desktop page layout and timeline zoom hotfix.
const CACHE_VERSION = 'vforge-v9-1-3-layout-preview-zoom';

const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css?v=9.0.2',
  './css/v91-editor.css?v=9.1.2',
  './css/v913-layout.css?v=9.1.3',
  './js/firebase-config.js?v=9.0.2',
  './js/app.js?v=9.0.2',
  './js/projects.js?v=9.0.2',
  './js/workspace.js?v=9.0.2',
  './js/processor.js?v=9.0.2',
  './js/auth.js?v=9.0.2',
  './js/studio.js?v=9.0.2',
  './js/v9-ui.js?v=9.0.2',
  './js/v91-editor.js?v=9.1.2',
  './js/v913-layout.js?v=9.1.3',
  './assets/images/vf-car-01.jpg',
  './assets/images/vf-car-02.jpg',
  './assets/images/vf-car-03.jpg',
  './assets/images/vf-car-04.jpg',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response?.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response?.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
