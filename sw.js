// PWA Service Worker - 老六茶事
// Version: 1.0.0
// Strategy: Network-first. Only cache on successful fetch. Fallback to cache when offline.

const CACHE_NAME = 'laoliuchashi-v1';

// Assets to pre-cache on install (minimal - only the app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/pwa-icon-192.png',
  '/images/pwa-icon-512.png',
];

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) URLs (like chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Cache images and static assets, but not JSON data (too volatile)
            const url = new URL(event.request.url);
            if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js)$/i)) {
              cache.put(event.request, clone);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If it's a navigation request, serve the homepage
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('离线中', { status: 503 });
        });
      })
  );
});
