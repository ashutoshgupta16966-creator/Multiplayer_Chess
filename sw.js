/* ═══════════════════════════════════════════════════
   RajaChess — Service Worker (Network-First + Offline Fallback)
   Cache version: rajachess-v25
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = 'rajachess-v25';

/* Core assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/script.js',
  '/manifest.json',
  '/icon.png'
];

/* ── Install: pre-cache core assets & activate immediately ── */
self.addEventListener('install', function (event) {
  self.skipWaiting(); // Activate new service worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).catch(function (err) {
      console.warn('[SW] Pre-cache warning:', err);
    })
  );
});

/* ── Activate: purge all obsolete caches & claim clients ── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim(); // Take control of all clients immediately
    })
  );
});

/* ── Message Listener for Manual Skip-Waiting ── */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ── Fetch: Network-First strategy with Cache Fallback ── */
self.addEventListener('fetch', function (event) {
  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  /* Skip cross-origin requests (fonts, external CDN, etc.) — let them pass */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* Network-First Strategy:
     1. Try to fetch the latest response from network
     2. If successful, update the cache and return network response
     3. If offline / network fails, return cached response */
  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        /* Network failed (offline): serve from cache */
        return caches.match(event.request).then(function (cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          /* Fallback for navigation requests */
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});