// V-Forge Service Worker — v9.1.4
// Startup fail-safe + critical scripts network-first.
const CACHE_VERSION = 'vforge-v9-1-4-startup-failsafe';

const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css?v=9.0.2',
  './css/v91-editor.css?v=9.1.2',
  './css/v913-layout.css?v=9.1.3',
  './js/firebase-config.js',
  './js/app.js?v=9.0.2',
  './js/projects.js?v=9.0.2',
  './js/workspace.js?v=9.0.2',
  './js/processor.js?v=9.0.2',
  './js/auth.js',
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

async function safePrecache(cache) {
  await Promise.allSettled(ASSETS_TO_CACHE.map(async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (response && response.ok) await cache.put(url, response.clone());
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(safePrecache)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name !== CACHE_VERSION)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

function isCriticalRequest(request) {
  const url = new URL(request.url);
  return /\/js\/(firebase-config|auth)\.js$/.test(url.pathname)
    || /\/index\.html$/.test(url.pathname);
}

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request))
      || (fallbackKey ? await cache.match(fallbackKey) : undefined)
      || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if (isCriticalRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(event.request);
    const refresh = fetch(event.request)
      .then(async (response) => {
        if (response && response.ok) await cache.put(event.request, response.clone());
        return response;
      })
      .catch(() => cached);
    return cached || refresh;
  })());
});
