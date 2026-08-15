/* ═══════════════════════════════════════════════════
   RajaChess — Service Worker (Cache-First + Offline)
   Cache version: rajachess-v5
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = 'rajachess-v5';

/* All core assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/script.js',
  '/manifest.json',
  '/icon.png'
];

/* ── Install: pre-cache all assets ─────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      return self.skipWaiting(); // activate immediately
    })
  );
});

/* ── Activate: purge old cache versions ─────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim(); // take control of all open tabs
    })
  );
});

/* ── Fetch: Cache-First strategy ────────────────────── */
self.addEventListener('fetch', function (event) {
  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  /* Skip cross-origin requests (fonts, etc.) — let them go to network */
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      /* Cache hit → return immediately */
      if (cachedResponse) {
        return cachedResponse;
      }

      /* Cache miss → fetch from network, cache the response */
      return fetch(event.request).then(function (networkResponse) {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type === 'opaque'
        ) {
          return networkResponse;
        }

        /* Clone before consuming */
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function () {
        /* Offline fallback: serve index.html for navigation requests */
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});