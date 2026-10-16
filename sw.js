// SnackLoop ERP Service Worker v11 (Super Admin admin_kiky & Multi-Role Sync)
const CACHE_NAME = 'snackloop-cache-v11';

// 1. Core Local App Shell Assets
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './Snackloop-logo.png',
  './Snackloop-logo.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-32x32.png'
];

// 2. High-Priority External CDN Hosts to Cache for Zero-Latency Mobile Performance
const CACHEABLE_CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Install Event - Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker v2] Pre-caching core app shell');
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[ServiceWorker v2] Pre-cache notice:', err);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker v2] Purging deprecated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Dynamic Stale-While-Revalidate & Network-First Routing
self.addEventListener('fetch', (event) => {
  // Only process standard GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // RULE 1: NEVER intercept Supabase API, Auth, or Realtime DB calls (handled directly by Outbox)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // RULE 2: Cache-First with Background Revalidation for Static External CDNs (Tailwind, Fonts, Icons)
  if (CACHEABLE_CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately in 0ms, revalidate in background if online
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {/* Offline, ignore */});
          return cachedResponse;
        }

        // Cache miss: fetch from network and store in cache
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        });
      })
    );
    return;
  }

  // RULE 3: Network-First with Cache Fallback for Local App Files (index.html, script.js, style.css)
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : null);
          });
        })
    );
  }
});
